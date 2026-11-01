// Cloudflare Pages Function: reads your Google Calendars at /api/gcal?from=YYYY-MM-DD&to=YYYY-MM-DD
// The calendars' secret iCal addresses live in the encrypted secret GCAL_FEEDS (comma- or newline-separated).
// They are never stored in your code or sent to the browser.

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

function allowed(request, env) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  if (!email) return false;
  if (!env.ALLOWED_EMAILS) return true;
  return env.ALLOWED_EMAILS.toLowerCase().split(",").map((s) => s.trim()).includes(email);
}

/* ---------- time zones ---------- */
function tzOffsetMs(tz, utcMs) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
    const g = (t) => Number(parts.find((p) => p.type === t).value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) - utcMs;
  } catch { return 0; }
}
// wall clock {y,m,d,h,mi,s} in tz -> UTC ms
function zonedToUtc(w, tz) {
  const guess = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s);
  if (!tz) return guess;
  let utc = guess - tzOffsetMs(tz, guess);
  utc = guess - tzOffsetMs(tz, utc);
  return utc;
}

/* ---------- ICS parsing ---------- */
function unfold(text) { return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
function parseProp(line) {
  const i = line.indexOf(":"); if (i < 0) return null;
  const left = line.slice(0, i), value = line.slice(i + 1);
  const [name, ...ps] = left.split(";");
  const params = {}; ps.forEach((p) => { const [k, v] = p.split("="); params[(k || "").toUpperCase()] = (v || "").replace(/^"|"$/g, ""); });
  return { name: name.toUpperCase(), params, value };
}
const unesc = (s) => (s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
function parseDT(p, calTz) {
  if (!p) return null;
  const v = p.value.trim();
  if (p.params.VALUE === "DATE" || /^\d{8}$/.test(v)) return { allDay: true, y: +v.slice(0, 4), m: +v.slice(4, 6), d: +v.slice(6, 8), h: 0, mi: 0, s: 0 };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/); if (!m) return null;
  return { allDay: false, y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], tz: m[7] ? "UTC" : (p.params.TZID || calTz || "UTC") };
}
function parseICS(text) {
  const lines = unfold(text).split("\n");
  let calName = "", calTz = "", cur = null, depth = 0; const events = [];
  for (const raw of lines) {
    const line = raw.trimEnd(); if (!line) continue;
    if (line === "BEGIN:VEVENT") { cur = { props: {}, multi: { EXDATE: [] } }; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (/^BEGIN:/.test(line)) { if (!cur) depth++; continue; }
    if (/^END:/.test(line)) { if (!cur) depth--; continue; }
    const p = parseProp(line); if (!p) continue;
    if (!cur) { if (p.name === "X-WR-CALNAME") calName = unesc(p.value); if (p.name === "X-WR-TIMEZONE") calTz = p.value; continue; }
    if (p.name === "EXDATE") cur.multi.EXDATE.push(p); else cur.props[p.name] = p;
  }
  return { calName, calTz, events };
}

/* ---------- recurrence ---------- */
const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const wallKey = (w) => `${w.y}-${w.m}-${w.d}T${w.h}:${w.mi}`;
function addDaysW(w, n) { const t = new Date(Date.UTC(w.y, w.m - 1, w.d + n)); return { ...w, y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
const dow = (w) => new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay();
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function expand(start, rrule, untilMs, toUtc, maxN = 1500) {
  const r = Object.fromEntries(rrule.split(";").map((x) => x.split("=")));
  const freq = r.FREQ, interval = +(r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
  let until = untilMs;
  if (r.UNTIL) { const u = parseDT({ value: r.UNTIL, params: {} }); if (u) until = Math.min(until, u.allDay ? Date.UTC(u.y, u.m - 1, u.d, 23, 59) : zonedToUtc(u, u.tz === "UTC" ? null : u.tz)); }
  const byday = r.BYDAY ? r.BYDAY.split(",") : null;
  const bymd = r.BYMONTHDAY ? r.BYMONTHDAY.split(",").map(Number) : null;
  const out = []; let n = 0;
  const push = (w) => { if (n >= count) return false; const ms = toUtc(w); if (ms > until) return false; n++; out.push(w); return out.length < maxN; };
  if (freq === "DAILY") { for (let w = start, i = 0; i < 20000; i++, w = addDaysW(w, interval)) if (!push(w)) break; }
  else if (freq === "WEEKLY") {
    const days = byday ? byday.map((d) => DAYS.indexOf(d.slice(-2))).sort() : [dow(start)];
    let weekStart = addDaysW(start, -dow(start));
    outer: for (let i = 0; i < 5000; i++, weekStart = addDaysW(weekStart, 7 * interval)) {
      for (const d of days) { const w = addDaysW(weekStart, d); if (toUtc(w) < toUtc(start)) continue; if (!push(w)) break outer; }
    }
  } else if (freq === "MONTHLY") {
    let y = start.y, m = start.m;
    outer: for (let i = 0; i < 2000; i++) {
      const cands = [];
      if (byday) byday.forEach((bd) => { const mm = bd.match(/^([+-]?\d+)?(\w\w)$/); const wd = DAYS.indexOf(mm[2]); const ord = mm[1] ? +mm[1] : 0;
        const all = []; for (let d = 1; d <= daysIn(y, m); d++) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === wd) all.push(d);
        (ord ? [ord > 0 ? all[ord - 1] : all[all.length + ord]] : all).forEach((d) => d && cands.push(d)); });
      else (bymd || [start.d]).forEach((d) => { const dd = d < 0 ? daysIn(y, m) + d + 1 : d; if (dd <= daysIn(y, m)) cands.push(dd); });
      for (const d of cands.sort((a, b) => a - b)) { const w = { ...start, y, m, d }; if (toUtc(w) < toUtc(start)) continue; if (!push(w)) break outer; }
      m += interval; while (m > 12) { m -= 12; y++; }
    }
  } else if (freq === "YEARLY") {
    for (let y = start.y, i = 0; i < 300; i++, y += interval) { if (start.m === 2 && start.d === 29 && daysIn(y, 2) < 29) continue; if (!push({ ...start, y })) break; }
  } else push(start);
  return out;
}

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS });
  const feeds = (env.GCAL_FEEDS || "").split(/[\s,]+/).filter((u) => /^https:\/\//.test(u));
  if (!feeds.length) return new Response(JSON.stringify({ connected: false, calendars: [], events: [] }), { headers: JSON_HEADERS });
  const url = new URL(request.url);
  const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  const fromMs = Date.parse(from + "T00:00:00Z") - 2 * 86400000, toMs = Date.parse(to + "T23:59:59Z") + 2 * 86400000;
  if (!fromMs || !toMs || toMs - fromMs > 400 * 86400000) return new Response(JSON.stringify({ error: "bad range" }), { status: 400, headers: JSON_HEADERS });
  const calendars = [], events = [], errors = [];
  await Promise.all(feeds.map(async (feed, fi) => {
    try {
      const res = await fetch(feed, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { calName, calTz, events: vevents } = parseICS(await res.text());
      const name = calName || `Google calendar ${fi + 1}`; calendars.push({ name, index: fi });
      const overrides = {};
      vevents.filter((e) => e.props["RECURRENCE-ID"]).forEach((e) => { const rid = parseDT(e.props["RECURRENCE-ID"], calTz); if (rid) overrides[e.props.UID?.value + "|" + wallKey(rid)] = true; });
      for (const e of vevents) {
        const P = e.props; if ((P.STATUS?.value || "").toUpperCase() === "CANCELLED") continue;
        const st = parseDT(P.DTSTART, calTz); if (!st) continue;
        const tz = st.tz === "UTC" ? null : st.tz;
        const toUtc = (w) => st.allDay ? Date.UTC(w.y, w.m - 1, w.d) : zonedToUtc(w, tz);
        let en = parseDT(P.DTEND, calTz); let durMs;
        if (en) durMs = toUtc(en) - toUtc(st);
        else if (P.DURATION) { const m = P.DURATION.value.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/) || []; durMs = (((+m[1] || 0) * 7 + (+m[2] || 0)) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60) * 1000; }
        else durMs = st.allDay ? 86400000 : 0;
        const ex = new Set(e.multi.EXDATE.flatMap((p) => p.value.split(",").map((v) => { const d = parseDT({ value: v, params: p.params }, calTz); return d ? wallKey(d) : ""; })));
        const isOverride = !!P["RECURRENCE-ID"];
        const occ = P.RRULE && !isOverride ? expand(st, P.RRULE.value, toMs, toUtc) : [st];
        for (const w of occ) {
          if (P.RRULE && !isOverride && (ex.has(wallKey(w)) || overrides[P.UID?.value + "|" + wallKey(w)])) continue;
          const s = toUtc(w), f = s + durMs;
          if (f < fromMs || s > toMs) continue;
          events.push({ id: `${fi}:${P.UID?.value || ""}:${s}`, cal: name, title: unesc(P.SUMMARY?.value || "(no title)"), allDay: !!st.allDay,
            start: st.allDay ? `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}` : s, end: st.allDay ? null : f, days: st.allDay ? Math.max(1, Math.round(durMs / 86400000)) : null,
            location: unesc(P.LOCATION?.value || ""), notes: unesc(P.DESCRIPTION?.value || "").slice(0, 600) });
        }
      }
    } catch (err) { errors.push(`Calendar ${fi + 1}: ${err.message}`); }
  }));
  calendars.sort((a, b) => a.index - b.index);
  return new Response(JSON.stringify({ connected: true, calendars, events, errors }), { headers: JSON_HEADERS });
}
