/* Project Me: site logic. You shouldn't need to edit this file; your plan lives in data.js. */
(() => {
"use strict";
const P = window.PLAN;
const F = P.finance;
// Colours come from theme.css so they adapt to light/dark mode.
P.domains.forEach((d) => { d.color = `var(--d-${d.id})`; });

/* ============================== utilities ============================== */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d || 1); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const addMonths = (s, n) => { const d = parseD(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d); };
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dowOf = (s) => DOW[parseD(s).getDay()];
const fmt = (s, o = { day: "numeric", month: "short", year: "numeric" }) => s ? parseD(s).toLocaleDateString("en-GB", o) : "";
const fmtShort = (s) => fmt(s, { day: "numeric", month: "short" });
const fmtLong = (s) => fmt(s, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const money = (n, dp = 2) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const money0 = (n) => money(n, 0);
const pctTxt = (p) => Math.round(p * 100) + "%";
const clamp01 = (n) => Math.max(0, Math.min(1, n || 0));
const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);
const plural = (n, w) => `${n.toLocaleString()} ${w}${n === 1 ? "" : "s"}`;
const domain = (id) => P.domains.find((d) => d.id === id);

function isoWeek(s) {
  const d = parseD(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return { y, w };
}
const weeksInYear = (y) => isoWeek(`${y}-12-28`).w;
function isoMonday(y, w) {
  const j4 = new Date(Date.UTC(y, 0, 4));
  const day = j4.getUTCDay() || 7;
  j4.setUTCDate(j4.getUTCDate() - day + 1 + (w - 1) * 7);
  return j4.toISOString().slice(0, 10);
}
const weekKey = (s) => { const { y, w } = isoWeek(s); return `${y}-W${pad(w)}`; };
function relDays(s) {
  const n = daysBetween(today(), s);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${plural(n, "day")}` : `${plural(-n, "day")} ago`;
}

/* ============================== state & sync ============================== */
const LS_KEY = "projectme-state-v1";
const blank = () => ({
  v: 1, updatedAt: 0,
  tasks: {}, sessions: {}, checkins: {}, mealWeeks: {}, events: {}, ptScores: [],
  body: { unit: "metric", height: null, entries: [] },
  snapshots: [], rule222: { start: null, done: {} }, spaces: null,
  studyStart: null, studyDone: {}, bucket: null, countries: null,
  calendar: [], calHidden: null, reading: { books: {}, goals: {} }, garminSeen: {},
  contacts: null, bucketAll: null, travels: null,
  // private to whoever is signed in: the server keeps this part separately for each person
  priv: {}, privOwner: null,
});
const PRIV = () => { const p = state.priv = state.priv || {}; p.journal = p.journal || {}; p.mood = p.mood || {}; p.cycle = p.cycle || { days: {} }; p.meds = p.meds || { list: null, log: {} }; return p; };
/* who is signed in (from the login in functions/_middleware.js) */
const me = { user: null };
async function loadMe() {
  if (!apiAvailable()) return;
  try {
    const r = await fetch("api/me", { cache: "no-store", credentials: "same-origin" });
    if (r.status === 401) { location.href = "/"; return; }
    const j = await r.json(); me.user = j.user || null;
    if (me.user && state.privOwner && state.privOwner !== me.user) { state.priv = {}; } // someone else's private notes were on this device
    if (me.user) state.privOwner = me.user;
  } catch (e) {}
}
let state = blank();
let sync = { status: "local", at: null, dirty: false };
try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s) state = Object.assign(blank(), s); } catch (e) {}

const saveLocal = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} };
let pushTimer = null;
function commit(rerender = true) {
  state.updatedAt = Date.now();
  saveLocal();
  sync.dirty = true;
  setSync("saving");
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemote, 1200);
  if (rerender) render();
}
const apiAvailable = () => location.protocol.startsWith("http");
async function pushRemote() {
  if (!apiAvailable()) { setSync("local"); return; }
  try {
    const r = await fetch("api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state), credentials: "same-origin" });
    if (!r.ok) throw new Error(r.status);
    sync.dirty = false; sync.at = Date.now(); setSync("synced");
  } catch (e) { setSync("offline"); }
}
async function pullRemote() {
  if (!apiAvailable()) { setSync("local"); return; }
  try {
    const r = await fetch("api/state", { cache: "no-store", credentials: "same-origin" });
    if (r.status === 401) { location.href = "/"; return; }
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) throw new Error("no api");
    const remote = await r.json();
    if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
      state = Object.assign(blank(), remote); saveLocal(); render();
    } else if ((state.updatedAt || 0) > (remote.updatedAt || 0)) {
      await pushRemote(); return;
    }
    sync.dirty = false; sync.at = Date.now(); setSync("synced");
  } catch (e) { setSync("offline"); }
}
function setSync(s) {
  sync.status = s;
  const el = document.getElementById("sync");
  if (!el) return;
  const txt = { synced: "Synced", saving: "Saving…", offline: "Not synced: saved on this device", local: "Saved on this device" }[s];
  el.className = "sync " + s;
  el.innerHTML = `<span class="s-dot"></span><span class="sync-txt">${txt}</span>`;
  el.title = s === "offline" ? "Couldn't reach your database. Changes are kept on this device and will sync next time. If this keeps happening, reload the page to sign in again." : txt;
}
window.addEventListener("focus", () => { if (!sync.dirty) pullRemote(); else pushRemote(); });
setInterval(() => { if (sync.dirty && sync.status === "offline") pushRemote(); }, 30000);

/* ============================== tasks ============================== */
const TASKS = [];
const TASK = {};
P.projects.forEach((p) => p.tasks.forEach((t, i) => {
  const task = { ...t, id: `${p.id}-${i}`, project: p, domain: p.domain, ongoing: t.f === "o" };
  TASKS.push(task); TASK[task.id] = task;
}));
const status = (t) => state.tasks[t.id] || ({ x: "done", "~": "started" }[t.f]) || "todo";
const countable = (list) => list.filter((t) => !t.ongoing);
function progressOf(list) {
  const c = countable(list);
  const done = c.filter((t) => status(t) === "done").length;
  return { done, total: c.length, p: c.length ? done / c.length : 0 };
}
const domainTasks = (id) => TASKS.filter((t) => t.domain === id);
function nextTask(list) {
  return countable(list).filter((t) => status(t) !== "done")
    .sort((a, b) => (a.d || "9999").localeCompare(b.d || "9999"))[0];
}

/* ============================== health helpers ============================== */
function programSession(prog, date) {
  const diff = daysBetween(prog.start, date);
  if (diff < 0 || diff >= prog.weeks.length * 7) return null;
  const wi = Math.floor(diff / 7);
  const dname = dowOf(date);
  const text = prog.weeks[wi][dname];
  const mod = prog.modules.find((m) => wi + 1 >= m.weeks[0] && wi + 1 <= m.weeks[1]);
  return { prog, week: wi + 1, day: dname, text: text || null, module: mod, key: `${prog.id}|${date}` };
}
const activeSession = (date) => { for (const p of P.programs) { const s = programSession(p, date); if (s) return s; } return null; };
function programStats(prog) {
  let total = 0, done = 0, dueSoFar = 0, doneSoFar = 0;
  const t = today();
  prog.weeks.forEach((w, wi) => DAYS.forEach((d, di) => {
    if (!w[d]) return;
    const date = addDays(prog.start, wi * 7 + di);
    total++;
    const on = !!state.sessions[`${prog.id}|${date}`];
    if (on) done++;
    if (date <= t) { dueSoFar++; if (on) doneSoFar++; }
  }));
  return { total, done, dueSoFar, doneSoFar };
}
const menuForDate = (s) => P.mealCalendar[isoWeek(s).w] || "W1";
const menuTotals = (code) => {
  const m = P.menus[code] || [];
  return { kcal: sum(m.map((x) => x[2])), p: sum(m.map((x) => x[3])), c: sum(m.map((x) => x[4])), f: sum(m.map((x) => x[5])) };
};
const seasonOf = (code) => code.startsWith("SP") ? ["Spring", "var(--d-finances)"] : code.startsWith("SU") ? ["Summer", "var(--d-degree)"] : code.startsWith("A") ? ["Autumn", "var(--d-health)"] : ["Winter", "var(--d-career)"];

function studyBlocks() {
  let d = state.studyStart || P.defaults.studyStart;
  return P.studyYear1.map((b, i) => {
    const start = d; const end = addDays(d, b.weeks * 7 - 1); d = addDays(d, b.weeks * 7);
    return { ...b, i, start, end };
  });
}
const studyBlockOn = (date) => studyBlocks().find((b) => date >= b.start && date <= b.end);

const WORK_START = "08:00";
const isWeekday = (d) => { const n = parseD(d).getDay(); return n >= 1 && n <= 5; };
const dishFor = (d, k) => ((P.menus[menuForDate(d)] || []).find((r) => r[0] === k) || [])[1];
// Garmin: the sleep summary is filed under the morning you woke up
const garminWake = (d) => (garmin.days[d] || {}).sleepEnd || null;
const garminBed = (d) => (garmin.days[addDays(d, 1)] || {}).sleepStart || null;
const HABITS = [
  // morning routine
  { id: "wake", group: "morning", label: "Wake up", time: true, garmin: garminWake, sub: (d) => garminWake(d) ? `From Garmin: ${garminWake(d)}` : "Pulled from Garmin when it syncs, or type it in" },
  { id: "puppies", group: "morning", label: "Walk the puppies", sub: () => "Stella and Taco" },
  { id: "breakfast", group: "morning", label: "Eat breakfast", sub: (d) => dishFor(d, "B") || "" },
  { id: "meds", group: "morning", label: "Take meds", sub: () => "Pill organizer + phone alarm", link: ["#meds", "Meds tracker"] },
  { id: "german", group: "morning", label: "Duo (German)", sub: () => "Duolingo · 30-60 minutes" },
  { id: "work", group: "morning", label: "Make it to work on time", time: true, timeLabel: "Arrived", applies: isWeekday, sub: (d) => { const v = (state.checkins[d] || {}).workT; return v ? (v <= WORK_START ? `Arrived ${v}: on time` : `Arrived ${v}: after ${WORK_START}`) : `Work starts ${WORK_START}`; } },
  // the middle of the day
  { id: "meals", group: "midday", label: "At or under macros", sub: (d) => { const m = menuForDate(d); const t = menuTotals(m); return `This week's menu ${m}: ${t.kcal} kcal in meals, ${P.macros.kcal} target (room for snacks)`; } },
  // evening routine (the workout row sits at the top of this group)
  { id: "study", group: "evening", label: "Study", sub: (d) => {
      const b = studyBlockOn(d); const dn = dowOf(d);
      if (b && b.half) return "Half-term: flashcards only";
      const hrs = dn === "Sun" ? "4 hrs (2 per course)" : dn === "Sat" ? "Day off (or catch-up)" : "2 hrs (1 per course)";
      return b && !b.half ? `${hrs} · Block ${b.block}: ${b.courses}` : hrs;
    } },
  { id: "journal", group: "evening", label: "Journal (at least 30 minutes)", sub: (d) => { const j = PRIV().journal[d]; return j && j.text ? `Written${j.mins ? ` · ${j.mins} min` : ""}` : "Write today's entry"; }, link: ["#journal", "Open journal"] },
  { id: "read", group: "evening", label: "Read (at least 30 minutes)", sub: () => { const c = allBooks().filter((b) => b.status === "reading"); return c.length ? c.map((b) => `${b.title} (${pctTxt(pctOf(b))})`).join(" · ") : "Nothing on the go — pick from your to-read pile"; } },
  { id: "sleep", group: "evening", label: "Go to sleep", time: true, garmin: garminBed, sub: (d) => garminBed(d) ? `From Garmin: ${garminBed(d)}` : "Pulled from Garmin the next morning, or type it in" },
];
const habitApplies = (h, d) => !h.applies || h.applies(d);
const habitDone = (date, id) => {
  if (state.checkins[date] && state.checkins[date][id]) return true;
  const h = HABITS.find((x) => x.id === id);
  return !!(h && h.garmin && h.garmin(date));
};
function streak(id) {
  let d = today(); if (!habitDone(d, id)) d = addDays(d, -1);
  let n = 0; while (habitDone(d, id) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}
function workoutStreak() {
  let d = today(); let n = 0; let guard = 0;
  const done = (x) => { const s = activeSession(x); return s && s.text ? !!state.sessions[s.key] : null; };
  if (done(d) === false) d = addDays(d, -1);
  while (guard++ < 400) {
    const r = done(d);
    if (r === false) break;
    if (r === true) n++;
    if (r === null && !activeSession(d)) break;
    d = addDays(d, -1);
  }
  return n;
}
function checkinScore(date) {
  const s = activeSession(date);
  const items = HABITS.filter((h) => habitApplies(h, date)).map((h) => habitDone(date, h.id));
  if (s && s.text) items.push(!!state.sessions[s.key]);
  return { done: items.filter(Boolean).length, total: items.length };
}

/* ============================== finance helpers ============================== */
function snapshots() {
  return [...F.snapshots.map((s) => ({ ...s, builtin: true })), ...state.snapshots.map((s, i) => ({ ...s, idx: i }))]
    .sort((a, b) => a.date.localeCompare(b.date));
}
const fundsTotal = (s) => sum(Object.values(s.funds || {}));
const debtTotal = (s) => sum(Object.values(s.debts || {}));
const netWorth = (s) => fundsTotal(s) + (Number(s.cash) || 0) - debtTotal(s);
function monthlyExpense() {
  const withExp = snapshots().filter((s) => Number(s.expenses) > 0);
  if (withExp.length) return { amt: sum(withExp.map((s) => s.expenses)) / withExp.length, basis: `average of ${plural(withExp.length, "logged month")}` };
  return { amt: F.basePay, basis: "1 month = base pay, as in your target" };
}
function finance() {
  const snaps = snapshots();
  const L = snaps[snaps.length - 1];
  const first = snaps[0];
  const debt = debtTotal(L);
  const exp = monthlyExpense();
  const efMonths = (L.funds.ef || 0) / exp.amt;
  const rate = F.tspMonthly / F.basePay;
  const remainingPlan = F.payoffPlan.filter((p) => p.date >= L.date && (L.debts[p.debt] || 0) > 0);
  const debtFree = debt <= 0 ? L.date : (remainingPlan.length ? remainingPlan[remainingPlan.length - 1].date : null);
  return { snaps, L, first, debt, exp, efMonths, rate, debtFree, remainingPlan, net: netWorth(L), netChange: netWorth(L) - netWorth(first) };
}

/* ============================== small UI pieces ============================== */
function ring(p, color, size = 112, label) {
  const r = 50, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${pctTxt(p)}">
    <circle class="bg" cx="60" cy="60" r="${r}"/>
    <circle class="fg" cx="60" cy="60" r="${r}" style="stroke:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp01(p))}"/>
    <text x="60" y="60">${label ?? pctTxt(p)}</text></svg>`;
}
const bar = (p, color, cls = "", marker) => `<div class="bar ${cls}"><div style="width:${clamp01(p) * 100}%;background:${color}"></div>${marker != null ? `<span class="marker" style="left:calc(${clamp01(marker) * 100}% - 1px)"></span>` : ""}</div>`;
const chk = (on, act, data, extra = "") => `<button class="chk ${on === "half" ? "half" : on ? "on" : ""} ${extra}" data-act="${act}" ${data} aria-pressed="${!!on}" aria-label="Tick">${on && on !== "half" ? "✓" : ""}</button>`;

function taskRow(t, opts = {}) {
  const st = status(t);
  if (t.ongoing) {
    return `<li class="ongoing"><span class="ongoing-dot" title="Ongoing habit">↻</span><div class="tt"><div class="t-text">${esc(t.t)}</div>
      <div class="meta"><span class="chip">Ongoing · ${esc(t.due)}</span>${opts.showProject ? `<span>${esc(t.project.title)}</span>` : ""}</div></div></li>`;
  }
  const overdue = st !== "done" && t.d && t.d < today();
  return `<li class="${st}">${chk(st === "done" ? true : st === "started" ? "half" : false, "task", `data-id="${t.id}"`)}
    <div class="tt"><div class="t-text">${esc(t.t)}</div>
      <div class="meta">${t.due ? `<span class="${overdue ? "bad" : ""}">${overdue ? "Overdue · " : ""}${esc(t.due)}</span>` : ""}
        ${st === "started" ? `<span class="chip warn">Started</span>` : ""}
        ${opts.showProject ? `<span><span class="dot" style="background:${domain(t.domain).color};width:8px;height:8px"></span> ${esc(t.project.title)}</span>` : ""}</div></div>
    ${st !== "done" ? `<button class="mini" data-act="started" data-id="${t.id}">${st === "started" ? "Not started" : "Started"}</button>` : ""}</li>`;
}
const openSet = new Set(JSON.parse(sessionStorage.getItem("pm-open") || "[]"));
const closedSet = new Set(JSON.parse(sessionStorage.getItem("pm-closed") || "[]"));
const isOpen = (key, dflt) => openSet.has(key) ? true : closedSet.has(key) ? false : dflt;
document.addEventListener("toggle", (e) => {
  const k = e.target.dataset && e.target.dataset.key; if (!k) return;
  if (e.target.open) { openSet.add(k); closedSet.delete(k); } else { closedSet.add(k); openSet.delete(k); }
  sessionStorage.setItem("pm-open", JSON.stringify([...openSet])); sessionStorage.setItem("pm-closed", JSON.stringify([...closedSet]));
}, true);

function projectBlock(p, dfltOpen = true) {
  const pr = progressOf(p.tasks.map((_, i) => TASK[`${p.id}-${i}`]));
  const color = domain(p.domain).color;
  const tasks = p.tasks.map((_, i) => TASK[`${p.id}-${i}`]);
  const allDone = pr.total && pr.done === pr.total;
  return `<details class="proj" data-key="proj-${p.id}" ${isOpen("proj-" + p.id, dfltOpen && !allDone) ? "open" : ""}>
    <summary><span class="caret">▸</span><span class="ptitle">${esc(p.title)} <span class="pmeta">· target ${esc(p.target)}</span></span>
      <span class="pbar">${bar(pr.p, color)}</span><span class="ppct">${pr.total ? pctTxt(pr.p) : "–"}</span></summary>
    <div class="proj-body"><ul class="tasks">${tasks.map((t) => taskRow(t)).join("")}</ul></div></details>`;
}
const projectsFor = (dom, filter = () => true) => `<div class="box">${P.projects.filter((p) => p.domain === dom && filter(p)).map((p) => projectBlock(p)).join("")}</div>`;

function lineChart(series, { height = 190, money: isMoney = true, yMin = null } = {}) {
  const W = 560, H = height, padL = 54, padR = 14, padT = 12, padB = 26;
  const pts = series.flatMap((s) => s.points);
  if (pts.length < 2) return `<div class="empty">Add another snapshot to see the trend.</div>`;
  const xs = pts.map((p) => parseD(p.x).getTime());
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const ys = pts.map((p) => p.y);
  let y0 = yMin != null ? yMin : Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y1 += 1; }
  const span = y1 - y0; y0 = yMin != null ? yMin : y0 - span * 0.08; y1 += span * 0.08;
  const X = (d) => padL + ((parseD(d).getTime() - x0) / (x1 - x0 || 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - y0) / (y1 - y0)) * (H - padT - padB);
  const ticks = 4;
  let g = "";
  for (let i = 0; i <= ticks; i++) {
    const v = y0 + ((y1 - y0) * i) / ticks;
    g += `<line class="grid-l" x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis-t" x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end">${isMoney ? (Math.abs(v) >= 1000 ? "$" + Math.round(v / 1000) + "k" : "$" + Math.round(v)) : Math.round(v * 10) / 10}</text>`;
  }
  const dates = [...new Set(pts.map((p) => p.x))].sort();
  const step = Math.max(1, Math.ceil(dates.length / 5));
  let lastX = -1e9; const lastD = dates[dates.length - 1];
  dates.forEach((d, i) => { const x = X(d); const tooCloseToEnd = d !== lastD && X(lastD) - x < 44;
    if ((i % step === 0 || d === lastD) && x - lastX >= 44 && !tooCloseToEnd) { g += `<text class="axis-t" x="${x}" y="${H - 6}" text-anchor="middle">${fmtShort(d)}</text>`; lastX = x; } });
  const lines = series.map((s) => {
    const path = s.points.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join("");
    const dots = s.points.map((p) => `<circle class="pt" cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" style="fill:${s.color}"/><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="13" data-tip="${esc(`${s.name}<br>${fmt(p.x)}: <b>${isMoney ? money(p.y) : p.y}</b>${p.note ? "<br>" + p.note : ""}`)}"/>`).join("");
    return `<path class="ln" d="${path}" style="stroke:${s.color}" ${s.dashed ? 'stroke-dasharray="5 5"' : ""}/>${dots}`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}${lines}</svg>`;
}

// Meeus, Astronomical Algorithms ch. 49 (main periodic terms)
function moonPhaseJD(k) {
  const frac = Math.round((((k % 1) + 1) % 1) * 4) % 4; // 0 new, 1 first quarter, 2 full, 3 last quarter
  const T = k / 1236.85, rad = Math.PI / 180, full = frac === 2;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * rad;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * rad;
  const Fa = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * rad;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * rad;
  const s = Math.sin;
  const c = full
    ? -0.40614 * s(Mp) + 0.17302 * E * s(M) + 0.01614 * s(2 * Mp) + 0.01043 * s(2 * Fa) + 0.00734 * E * s(Mp - M) - 0.00515 * E * s(Mp + M) + 0.00209 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * Fa) - 0.00057 * s(Mp + 2 * Fa) + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * Fa) + 0.00038 * E * s(M - 2 * Fa) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om)
    : frac === 1 || frac === 3
    ? -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * Fa) + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M) - 0.0018 * s(Mp - 2 * Fa) - 0.0007 * s(Mp + 2 * Fa) - 0.0004 * s(3 * Mp) - 0.00034 * E * s(2 * Mp - M) + 0.00032 * E * s(M + 2 * Fa) + 0.00032 * E * s(M - 2 * Fa) - 0.00028 * E * E * s(Mp + 2 * M) + 0.00027 * E * s(2 * Mp + M) - 0.00017 * s(Om)
      + (frac === 1 ? 1 : -1) * (0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp) - 0.00002 * Math.cos(Mp - M) + 0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * Fa))
    : -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * Fa) + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * Fa) - 0.00057 * s(Mp + 2 * Fa) + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * Fa) + 0.00038 * E * s(M - 2 * Fa) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om);
  return jde + c - 69 / 86400; // TT -> UT (approx.)
}
const jdToDate = (jd) => new Date((jd - 2440587.5) * 86400000);


const SYN = 29.530588861;
const kNear = (date) => Math.floor(((date - Date.UTC(2000, 0, 6)) / 86400000) / SYN);
const PHASES = [["New moon", "●"], ["First quarter", "◐"], ["Full moon", "○"], ["Last quarter", "◑"]];
function moonEvents(a, b, quarters = false) {
  const out = []; const k0 = kNear(parseD(a)) - 1, k1 = kNear(parseD(b)) + 1;
  for (let k = k0; k <= k1; k++) for (const q of quarters ? [0, 1, 2, 3] : [0, 2]) {
    const dt = jdToDate(moonPhaseJD(k + q / 4)); const d = iso(dt);
    if (d >= a && d <= b) out.push({ date: d, full: q === 2, phase: q, name: PHASES[q][0], icon: PHASES[q][1], time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}` });
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}
function moonNow(when = new Date()) {
  const k = kNear(when);
  let prev = null, next = null;
  for (let i = k - 2; i <= k + 2; i++) { const t = jdToDate(moonPhaseJD(i)); if (t <= when) prev = t; else if (!next) next = t; }
  const age = (when - prev) / (next - prev);
  const names = [[0.0339, "New moon"], [0.2161, "Waxing crescent"], [0.2839, "First quarter"], [0.4661, "Waxing gibbous"], [0.5339, "Full moon"], [0.7161, "Waning gibbous"], [0.7839, "Last quarter"], [0.9661, "Waning crescent"], [1.01, "New moon"]];
  const name = names.find(([lim]) => age < lim)[1];
  const nextFull = moonEvents(iso(when), addDays(iso(when), 31)).find((e) => e.full && e.date >= iso(when));
  const nextNew = moonEvents(iso(when), addDays(iso(when), 31)).find((e) => !e.full && e.date > iso(when));
  return { age, name, illum: (1 - Math.cos(2 * Math.PI * age)) / 2, nextFull, nextNew };
}
function moonSVG(age, size = 56) {
  const r = 20, cx = 24, cy = 24; const kx = Math.cos(2 * Math.PI * age); const waxing = age < 0.5;
  const rx = Math.abs(kx) * r;
  const outer = waxing ? 1 : 0; const inner = waxing ? (kx > 0 ? 0 : 1) : (kx > 0 ? 1 : 0);
  const lit = age < 0.02 || age > 0.98 ? "" : `<path class="moon-lit" d="M${cx} ${cy - r} A${r} ${r} 0 0 ${outer} ${cx} ${cy + r} A${rx.toFixed(2)} ${r} 0 0 ${inner} ${cx} ${cy - r}Z"/>`;
  return `<svg class="moon" viewBox="0 0 48 48" width="${size}" height="${size}" role="img" aria-label="Moon"><circle class="moon-dark" cx="${cx}" cy="${cy}" r="${r}"/>${lit}<circle class="moon-rim" cx="${cx}" cy="${cy}" r="${r}"/></svg>`;
}
const SABBATS = [
  ["Imbolc", "02-01", "First stirrings of spring. Brigid's day: hearth, candles, clearing out."],
  ["Ostara", "03-20", "Spring equinox. Balance of light and dark; sow seeds. Spring menus begin."],
  ["Beltane", "05-01", "May Day. Fire, growth and life in full bloom."],
  ["Litha", "06-21", "Summer solstice. The sun at its height. Summer menus begin."],
  ["Lughnasadh", "08-01", "First harvest. Bread, grain and the work paying off."],
  ["Mabon", "09-22", "Autumn equinox. Second harvest; gratitude and balance. Autumn menus begin."],
  ["Samhain", "10-31", "Celtic new year. Honour the ancestors; the veil is thin. Rest and reflect."],
  ["Yule", "12-21", "Winter solstice. The longest night and the return of the light. Winter menus begin."],
];
function sabbatsBetween(a, b) {
  const out = [];
  for (let y = Number(a.slice(0, 4)); y <= Number(b.slice(0, 4)); y++) SABBATS.forEach(([n, md, d]) => { const date = `${y}-${md}`; if (date >= a && date <= b) out.push({ name: n, date, desc: d }); });
  return out;
}
const sabbatOn = (d) => sabbatsBetween(d, d)[0];
const nextSabbat = (d) => sabbatsBetween(addDays(d, 1), addDays(d, 400))[0];
const lastSabbat = (d) => sabbatsBetween(addDays(d, -400), d).pop();
function herbsSVG() {
  const herbs = [
    { x: 30, len: 62, leaf: "var(--herb-sage)", head: null, kind: "leaf" },
    { x: 78, len: 74, leaf: "var(--herb-stem)", head: "var(--herb-lavender)", kind: "spike" },
    { x: 126, len: 58, leaf: "var(--herb-rosemary)", head: null, kind: "needle" },
    { x: 172, len: 70, leaf: "var(--herb-stem)", head: "var(--herb-yarrow)", kind: "cluster" },
    { x: 216, len: 54, leaf: "var(--herb-sage)", head: null, kind: "leaf" },
  ];
  const g = herbs.map((h, hi) => {
    const top = 14, tie = 22; const n = 7; let out = `<path class="twine" d="M${h.x} ${top} v${tie - top}"/><path class="twine" d="M${h.x - 4} ${tie} h8"/>`;
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * 3.4; const ex = h.x + spread * 1.9; const ey = tie + h.len - Math.abs(spread) * 1.5;
      out += `<path class="stem" style="stroke:${h.kind === "leaf" || h.kind === "needle" ? h.leaf : "var(--herb-stem)"}" d="M${h.x + spread * .2} ${tie} Q ${h.x + spread} ${tie + h.len * .45} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
      for (let j = 1; j <= 4; j++) {
        const t = j / 5; const px = h.x + spread * .2 + (ex - h.x - spread * .2) * t * t; const py = tie + (ey - tie) * t;
        if (h.kind === "leaf") out += `<ellipse cx="${(px + (i % 2 ? 3 : -3)).toFixed(1)}" cy="${py.toFixed(1)}" rx="2.2" ry="4.8" style="fill:${h.leaf}" transform="rotate(${i % 2 ? 28 : -28} ${px.toFixed(1)} ${py.toFixed(1)})" opacity=".9"/>`;
        if (h.kind === "needle") out += `<path class="stem" style="stroke:${h.leaf}" d="M${(px - 3.5).toFixed(1)} ${(py - 2).toFixed(1)} L${(px + 3.5).toFixed(1)} ${(py + 2).toFixed(1)}M${(px + 3.5).toFixed(1)} ${(py - 2).toFixed(1)} L${(px - 3.5).toFixed(1)} ${(py + 2).toFixed(1)}"/>`;
      }
      if (h.kind === "spike") for (let j = 0; j < 5; j++) out += `<circle cx="${(ex + (j % 2 ? 1.4 : -1.4)).toFixed(1)}" cy="${(ey - j * 3.2).toFixed(1)}" r="1.9" style="fill:${h.head}"/>`;
      if (h.kind === "cluster") for (let j = 0; j < 4; j++) out += `<circle cx="${(ex + Math.cos(j * 1.6) * 2.6).toFixed(1)}" cy="${(ey + Math.sin(j * 1.6) * 2.2).toFixed(1)}" r="2.1" style="fill:${h.head}"/>`;
    }
    return `<g class="bundle" style="--sway:${hi % 2 ? -1 : 1}">${out}</g>`;
  }).join("");
  return `<svg class="herbs" viewBox="0 0 250 110" aria-hidden="true"><path class="rod" d="M4 12 H246"/><circle class="rod-end" cx="4" cy="12" r="3.2"/><circle class="rod-end" cx="246" cy="12" r="3.2"/>${herbs.map((h) => `<circle class="ring" cx="${h.x}" cy="12" r="3.4"/>`).join("")}${g}</svg>`;
}

const SPRIG = `<svg class="sprig" viewBox="0 0 220 120" aria-hidden="true"><g fill="none" stroke-linecap="round">
  <path class="stem" d="M8 112 C 60 96, 110 70, 210 14"/>
  ${[[40,99,-30],[62,90,-28],[86,79,-26],[110,66,-24],[134,53,-22],[158,40,-20],[182,27,-18]].map(([x,y,r],i)=>`<path class="leaf" d="M${x} ${y} q 9 -${18+i} 24 -${10+i} q -12 ${12+i} -24 ${10+i}z" transform="rotate(${r} ${x} ${y})"/><path class="leaf" d="M${x+6} ${y-2} q 18 4 22 ${16+i} q -16 -2 -22 -${16+i}z" transform="rotate(${r+8} ${x+6} ${y-2})"/>`).join("")}
  <circle class="berry" cx="206" cy="12" r="3.2"/><circle class="berry" cx="198" cy="9" r="2.4"/></g></svg>`;


/* ---------- stained-glass sidebar: a different window each visit ---------- */
const SEASON_GLASS = {
  autumn: { amber: "214,120,44", green: "150,110,40", merlot: "160,44,30", pale: "240,214,170", teal: "184,84,36", gold: "228,170,60" },
  winter: { amber: "150,172,195", green: "62,112,92", merlot: "160,42,55", pale: "226,233,238", teal: "92,122,145", gold: "205,212,218" },
  spring: { amber: "236,200,110", green: "120,190,90", merlot: "222,110,160", pale: "238,244,226", teal: "140,190,220", gold: "244,220,130" },
  summer: { amber: "240,190,60", green: "60,150,165", merlot: "150,120,200", pale: "240,240,226", teal: "70,140,200", gold: "246,206,80" },
};
const buildGlass = (c) => {
  const enc = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const LEAD = "#070906";
  const f = (k, a) => `rgba(${c[k]},${a})`;
  const svg = (w, h, body) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`);
  const poly = (pts, fill, sw = 2.2) => `<polygon points='${pts.map((p) => p.join(",")).join(" ")}' fill='${fill}' stroke='${LEAD}' stroke-width='${sw}' stroke-linejoin='round'/>`;
  // hammered-glass ripples
  const ripples = (w, h, n, seed) => { let o = ""; for (let i = 0; i < n; i++) { const x = ((i * 37 + seed * 13) % w), y = ((i * 53 + seed * 7) % h); o += `<ellipse cx='${x}' cy='${y}' rx='${4 + (i % 3) * 2}' ry='${2 + (i % 2)}' fill='none' stroke='${f("pale", .05)}' stroke-width='.8'/>`; } return o; };

  const rings = svg(84, 84, `<rect width='84' height='84' fill='${f("pale", .05)}'/>` + ripples(84, 84, 7, 4) +
    [[0, 0], [84, 0], [0, 84], [84, 84]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='42' fill='${f("green", .08)}' stroke='${LEAD}' stroke-width='2.2'/>`).join("") +
    `<circle cx='42' cy='42' r='42' fill='${f("amber", .07)}' stroke='${LEAD}' stroke-width='2.2'/>` +
    `<circle cx='42' cy='42' r='4' fill='${f("gold", .45)}' stroke='${LEAD}' stroke-width='1.4'/>`);

  const octagons = (() => {
    const a = 17.6, S = 60; let b = "";
    const tints = [["amber", .16], ["pale", .07], ["green", .14], ["gold", .12]];
    [[0, 0], [S, 0], [0, S], [S, S]].forEach(([x, y], i) => b += poly([[x + a, y], [x + S - a, y], [x + S, y + a], [x + S, y + S - a], [x + S - a, y + S], [x + a, y + S], [x, y + S - a], [x, y + a]], f(tints[i][0], tints[i][1])));
    [[0, 0], [S, 0], [2 * S, 0], [0, S], [S, S], [2 * S, S], [0, 2 * S], [S, 2 * S], [2 * S, 2 * S]].forEach(([x, y], i) => b += poly([[x, y - a], [x + a, y], [x, y + a], [x - a, y]], f(i % 2 ? "teal" : "green", .22)));
    return { layers: [svg(120, 120, ripples(120, 120, 10, 3) + b)], size: ["120px 120px"] };
  })();

  const lozenges = (() => {
    const W = 48, H = 96; let b = "";
    for (let col = 0; col < 2; col++) {
      const ox = col * W;
      b += poly([[ox + 24, 0], [ox + 48, 48], [ox + 24, 96], [ox, 48]], f("pale", col ? .06 : .09));
      [[ox, 0], [ox + 48, 0], [ox, 96], [ox + 48, 96]].forEach(([x, y]) => b += poly([[x, y - 48], [x + 24, y], [x, y + 48], [x - 24, y]], f("pale", .05)));
    }
    const jewel = (x, y, k) => poly([[x, y - 9], [x + 6, y], [x, y + 9], [x - 6, y]], f(k, .42), 1.6);
    b += jewel(24, 0, "amber") + jewel(24, 96, "amber") + jewel(72, 0, "merlot") + jewel(72, 96, "merlot") + jewel(0, 48, "green") + jewel(48, 48, "gold") + jewel(96, 48, "green");
    return { layers: [svg(96, 96, ripples(96, 96, 9, 5) + b)], size: ["96px 96px"] };
  })();

  const panes = (() => {
    const tints = [["amber", .17], ["green", .15], ["pale", .07], ["gold", .13], ["teal", .12], ["amber", .1]];
    let b = ""; let i = 0;
    for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) { const [k, a] = tints[i++]; b += `<rect x='${q * 44}' y='${r * 70}' width='44' height='70' fill='${f(k, a)}' stroke='${LEAD}' stroke-width='2.4'/>`; }
    const border = svg(16, 32, `<rect x='0' y='0' width='16' height='16' fill='${f("amber", .28)}' stroke='${LEAD}' stroke-width='1.8'/><rect x='0' y='16' width='16' height='16' fill='${f("green", .26)}' stroke='${LEAD}' stroke-width='1.8'/>` +
      `<g fill='${f("merlot", .55)}'><circle cx='8' cy='5.4' r='2.4'/><circle cx='8' cy='10.6' r='2.4'/><circle cx='5.4' cy='8' r='2.4'/><circle cx='10.6' cy='8' r='2.4'/></g><circle cx='8' cy='8' r='1.4' fill='${f("gold", .8)}'/>`);
    return { layers: [border, border, svg(132, 140, ripples(132, 140, 12, 2) + b)], size: ["16px 32px", "16px 32px", "132px 140px"], pos: ["left top", "right top", "16px 0"], repeat: ["repeat-y", "repeat-y", "repeat"] };
  })();

  const quarries = (() => {
    const S = 56; let b = "";
    [[0, 0, "pale", .07], [S, 0, "green", .13], [0, S, "green", .13], [S, S, "pale", .07]].forEach(([x, y, k, a]) => b += `<rect x='${x}' y='${y}' width='${S}' height='${S}' fill='${f(k, a)}' stroke='${LEAD}' stroke-width='2.2'/>`);
    const flower = (x, y) => `<g fill='${f("gold", .5)}' stroke='${LEAD}' stroke-width='1.2'><circle cx='${x}' cy='${y - 5}' r='4'/><circle cx='${x}' cy='${y + 5}' r='4'/><circle cx='${x - 5}' cy='${y}' r='4'/><circle cx='${x + 5}' cy='${y}' r='4'/></g><circle cx='${x}' cy='${y}' r='2.6' fill='${f("merlot", .75)}' stroke='${LEAD}' stroke-width='1'/>`;
    [[0, 0], [S, 0], [2 * S, 0], [0, S], [S, S], [2 * S, S], [0, 2 * S], [S, 2 * S], [2 * S, 2 * S]].forEach(([x, y]) => b += flower(x, y));
    return { layers: [svg(112, 112, ripples(112, 112, 10, 7) + b)], size: ["112px 112px"] };
  })();

  return [
    { id: "rings", layers: [rings], size: ["84px 84px"] },
    { id: "octagons", ...octagons },
    { id: "panes", ...panes },
    { id: "lozenges", ...lozenges },
    { id: "quarries", ...quarries },
  ];
};
const GLASS_IDS = ["rings", "octagons", "panes", "lozenges", "quarries"];
function seasonFor(d) {
  const md = d.slice(5);
  return md >= "12-21" || md < "03-20" ? "winter" : md < "06-21" ? "spring" : md < "09-22" ? "summer" : "autumn";
}
function activeSeason() {
  const forced = new URLSearchParams(location.search).get("season");
  if (forced && SEASON_GLASS[forced]) return forced;
  return state.seasonTheme && SEASON_GLASS[state.seasonTheme] ? state.seasonTheme : seasonFor(today());
}
let glassId = null, glassSeason = null;
function applyGlass(forceId) {
  const aside = document.querySelector("aside"); if (!aside) return;
  if (!document.querySelector('link[rel="stylesheet"][href="theme.css"]')) return; // plain look: no stained glass or seasons
  const season = activeSeason(); document.documentElement.dataset.season = season;
  const GLASS = buildGlass(SEASON_GLASS[season]);
  let g = forceId && GLASS.find((x) => x.id === forceId);
  if (!g && glassId) g = GLASS.find((x) => x.id === glassId);
  if (!g) {
    let last = null; try { last = localStorage.getItem("pm-glass"); } catch (e) {}
    const pool = GLASS.filter((x) => x.id !== last);
    g = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem("pm-glass", g.id); } catch (e) {}
  }
  glassId = g.id; glassSeason = season;
  // light falling through the glass at the top, dimmer below so the menu stays easy to read
  const light = "radial-gradient(ellipse 140% 55% at 50% -8%, rgba(255,226,160,.11), transparent 70%)";
  const dim = "linear-gradient(180deg, rgba(10,13,9,.12), rgba(10,13,9,.42))";
  const n = g.layers.length;
  aside.style.backgroundImage = [light, dim, ...g.layers].join(", ");
  aside.style.backgroundSize = ["100% 100%", "100% 100%", ...g.size].join(", ");
  aside.style.backgroundPosition = ["0 0", "0 0", ...(g.pos || Array(n).fill("0 0"))].join(", ");
  aside.style.backgroundRepeat = ["no-repeat", "no-repeat", ...(g.repeat || Array(n).fill("repeat"))].join(", ");
  aside.dataset.glass = g.id;
}

/* ============================== nav ============================== */
const ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: "◆" },
  { id: "today", label: "Daily check-in", icon: "✓" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "reading", label: "Reading", icon: "❦" },
  { id: "artifacts", label: "Artifacts", icon: "▤" },
  { label: "Personal" },
  { id: "about", label: "About Me", icon: "✦" },
  { id: "journal", label: "Journal", icon: "✎" },
  { label: "Life" },
  { id: "family", label: "Family & Found Family", dom: "family" },
  { id: "contacts", label: "Contacts", sub: true },
  { id: "health", label: "Health, Wellness & Fitness", dom: "health" },
  { id: "training", label: "Training plans", sub: true },
  { id: "meals", label: "Meal plan & macros", sub: true },
  { id: "body", label: "Body", sub: true },
  { id: "meds", label: "Meds tracker", sub: true },
  { id: "mood", label: "Mental health", sub: true },
  { id: "cycle", label: "Period tracker", sub: true },
  { id: "finances", label: "Finances", dom: "finances" },
  { id: "career", label: "Career", dom: "career" },
  { id: "education", label: "Degree & Self Study", dom: "degree" },
  { id: "travel", label: "Travel & Experiences", dom: "travel" },
  { id: "bucket", label: "Bucket lists", sub: true },
  { id: "places", label: "Past travels", sub: true },
  { id: "community", label: "Community", dom: "community" },
  { label: "" },
  { id: "settings", label: "Settings & backup", icon: "⚙" },
];
function renderMoonMini() {
  const el = document.getElementById("moon-mini"); if (!el) return;
  const m = moonNow(); const sb = sabbatOn(today());
  el.innerHTML = `${moonSVG(m.age, 26)}<div><div>${m.name}</div><div class="mm-sub">${sb ? "Blessed " + sb.name : Math.round(m.illum * 100) + "% lit"}</div></div>`;
}
function renderNav(cur) {
  document.getElementById("nav").innerHTML = ROUTES.map((r) => {
    if (!r.id) return r.label ? `<div class="nav-label">${r.label}</div>` : `<div style="height:10px"></div>`;
    const d = r.dom && domain(r.dom);
    const pr = d && progressOf(domainTasks(d.id));
    const lead = d ? `<span class="dot" style="background:${d.color}"></span>` : r.sub ? "" : `<span class="icon">${r.icon}</span>`;
    return `<a href="#${r.id}" class="${cur === r.id ? "active" : ""} ${r.sub ? "sub" : ""}">${lead}${r.label}${pr && pr.total ? `<span class="pct">${pctTxt(pr.p)}</span>` : ""}</a>`;
  }).join("");
}

/* ============================== pages ============================== */
const pages = {};

/* ---------- contacts (used by the dashboard and the Contacts page) ---------- */
const CONTACT_CATS = [["family", "Family"], ["close", "Close friends"], ["distant", "Distant friends"], ["work", "Work"], ["pets", "Pets"]];
const contacts = () => { if (!state.contacts) state.contacts = P.contacts.map((c, i) => ({ id: "c" + i, ...c })); return state.contacts; };
const ageOn = (bday, on) => { if (!bday || !/^\d{4}-/.test(bday) || bday.startsWith("0000")) return null; let a = Number(on.slice(0, 4)) - Number(bday.slice(0, 4)); if (on.slice(5) < bday.slice(5)) a--; return a; };
function birthdaysBetween(a, b) {
  const out = [];
  (state.contacts || P.contacts).forEach((c) => { if (!c.birthday) return; const md = c.birthday.slice(5);
    for (let y = Number(a.slice(0, 4)); y <= Number(b.slice(0, 4)); y++) { let d = `${y}-${md}`; if (md === "02-29" && new Date(y, 1, 29).getMonth() !== 1) d = `${y}-02-28`;
      if (d >= a && d <= b) { const age = ageOn(c.birthday, d); out.push({ c, date: d, age }); } } });
  return out;
}

/* ---------- "major" events for the dashboard month and week ---------- */
const ROUTINE_TITLE = /wake up|morning routine|bedtime|lunch|commute|drive to|drive home|\bwork\b|workout|study|german|dinner|go to bed/i;
const ROUTINE_CAL = /workout|\bwork\b|study|school|libs|math|biol|chem|class|meal|moon|task|routine|habit|rhythm|sleep|commute|drive/i;
function majorEvents(a, b) {
  const ev = [];
  const inR = (d, end) => d <= b && (end || d) >= a;
  sabbatsBetween(a, b).forEach((sb) => ev.push({ id: "wheel:" + sb.date, date: sb.date, title: sb.name, color: "var(--copper)", sub: sb.desc, icon: "✶" }));
  birthdaysBetween(a, b).forEach(({ c, date, age }) => ev.push({ id: `bday:${c.id || c.name}:${date}`, date, title: `${c.name}'s birthday${age != null ? ` (${age})` : ""}`, color: "var(--d-family)", icon: "🎂", link: "#contacts" }));
  (window.CALENDAR_DATES || []).forEach((k, ki) => {
    const base = { title: k.title, color: "var(--cal-key)", sub: k.note || "", time: k.time || null };
    if (k.repeat === "monthly" || k.repeat === "quarterly") {
      const from = k.from || "2026-01-01"; let d = from.slice(0, 8) + pad(k.day || 1); if (d < from) d = addMonths(d, 1);
      const step = k.repeat === "quarterly" ? 3 : 1; if (step === 3) while (parseD(d).getMonth() % 3 !== 0) d = addMonths(d, 1);
      for (let n = 0; d <= b && n < 400; n++, d = addMonths(d, step)) if (d >= a) ev.push({ ...base, id: `key:${ki}:${d}`, date: d });
    } else if (k.repeat === "yearly") { for (let d = k.date, n = 0; d <= b && n < 60; n++, d = addMonths(d, 12)) if (d >= a) ev.push({ ...base, id: `key:${ki}:${d}`, date: d }); }
    else if (inR(k.date, k.end)) ev.push({ ...base, id: `key:${ki}`, date: k.date, end: k.end || null });
  });
  const r = rule222Dates();
  [["dn", r.dn, "Date night"], ["wk", r.wk, "Weekend away (by)"], ["vac", r.vac, "Week away (by)"]].forEach(([k, list, title]) => list.forEach((d) => inR(d) && ev.push({ id: `r222:${k}:${d}`, date: d, title, color: "var(--d-family)", done: !!state.rule222.done[`${k}:${d}`], link: "#family" })));
  (state.calendar || []).forEach((e) => {
    const steps = { weekly: (d) => addDays(d, 7), biweekly: (d) => addDays(d, 14), monthly: (d, n) => addMonths(e.date, n), yearly: (d, n) => addMonths(e.date, 12 * n) };
    const occ = e.repeat && steps[e.repeat] ? expandRepeat(e, a, b, steps[e.repeat]) : (inR(e.date, e.end) ? [{ date: e.date, end: e.end || null }] : []);
    occ.forEach((o) => ev.push({ id: `u:${e.id}@${o.date}`, date: o.date, end: o.end, title: e.title, color: "#7A1C1C", time: e.allDay ? null : e.start || null, sub: e.notes || "" }));
  });
  if (gcal.connected) Object.values(gcal.events).forEach((g) => {
    if (ROUTINE_CAL.test(g.cal) || ROUTINE_TITLE.test(g.title || "")) return; const col = gColor(g.cal, (gcal.calendars.find((c) => c.name === g.cal) || {}).index || 0);
    const base = { id: "g:" + g.id, title: g.title, color: col.c, sub: [g.cal, g.location].filter(Boolean).join(" · ") };
    if (g.allDay) { const end = g.days > 1 ? addDays(g.start, g.days - 1) : null; if (inR(g.start, end)) ev.push({ ...base, date: g.start, end }); return; }
    const sd = iso(new Date(g.start)); if (inR(sd)) ev.push({ ...base, date: sd, time: hm(g.start) });
  });
  ev.forEach((e) => { if (e.end && e.end <= e.date) e.end = null; });
  return ev;
}
function majorByDay(a, b) {
  const map = {}; majorEvents(a, b).forEach((e) => { for (let d = e.date < a ? a : e.date, n = 0; d <= (e.end || e.date) && d <= b && n < 60; d = addDays(d, 1), n++) (map[d] = map[d] || []).push(e); });
  Object.values(map).forEach((arr) => arr.sort((x, y) => (x.time ? 1 : 0) - (y.time ? 1 : 0) || (toMin(x.time) || 0) - (toMin(y.time) || 0) || x.title.localeCompare(y.title)));
  return map;
}
const sundayOf = (s) => addDays(s, -parseD(s).getDay());
const evTip = (e) => esc(`<b>${esc(e.title)}</b>${e.time ? "<br>" + e.time : ""}${e.sub ? "<br>" + esc(e.sub) : ""}`);
function untilTxt(from, to) {
  const n = daysBetween(from, to);
  if (n <= 365) return { big: plural(n, "day"), small: "" };
  let y = 0, m = 0; while (addMonths(from, (y + 1) * 12) <= to) y++; while (addMonths(from, y * 12 + m + 1) <= to) m++;
  return { big: `${plural(y, "year")}${m ? ", " + plural(m, "month") : ""}`, small: `(${n.toLocaleString()} days)` };
}
let dashMonth = 0;
function dashMonthBox(t) {
  const first = addMonths(t.slice(0, 8) + "01", dashMonth); const ym = first.slice(0, 7);
  const start = sundayOf(first); const lastDay = addDays(addMonths(first, 1), -1); const end = addDays(sundayOf(lastDay), 6);
  gcalEnsure(start, end);
  const map = majorByDay(start, end);
  const moons = {}; moonEvents(start, end, true).forEach((m) => { moons[m.date] = m; });
  const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return `<div class="box dash-cal">
    <div class="dc-head"><h3>${fmt(first, { month: "long", year: "numeric" })}</h3><span class="row" style="gap:4px">${dashMonth ? `<button class="btn sm" data-act="dash-month" data-n="0">This month</button>` : ""}<button class="x-btn" data-act="dash-month" data-n="-1" aria-label="Previous month">‹</button><button class="x-btn" data-act="dash-month" data-n="1" aria-label="Next month">›</button></span></div>
    <div class="dm-grid">${DOW.map((x) => `<div class="dm-h">${x}</div>`).join("")}
    ${days.map((d) => { const evs = map[d] || []; const mo = moons[d];
      return `<div class="dm-day ${d.slice(0, 7) !== ym ? "out" : ""} ${d === t ? "today" : ""}">
        <button class="dm-num" data-act="dash-day" data-date="${d}" title="Open ${fmtLong(d)} in the calendar">${parseD(d).getDate()}</button>
        ${mo ? `<div class="dm-moon" data-tip="${esc(`${mo.name} · ${mo.time}`)}">${mo.icon} <span>${mo.name}</span></div>` : ""}
        ${evs.slice(0, 3).map((e) => `<div class="dm-ev ${e.done ? "done" : ""}" style="--ec:${e.color}" data-tip="${evTip(e)}">${e.icon ? e.icon + " " : ""}${esc(e.title)}</div>`).join("")}
        ${evs.length > 3 ? `<button class="dm-more" data-act="dash-day" data-date="${d}">+${evs.length - 3} more</button>` : ""}
      </div>`; }).join("")}</div></div>`;
}
function dashWeekBox(t) {
  const start = sundayOf(t); const end = addDays(start, 6);
  gcalEnsure(start, end);
  const map = majorByDay(start, end); const moons = {}; moonEvents(start, end, true).forEach((m) => { moons[m.date] = m; });
  const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return `<div class="box dash-week"><div class="dc-head"><h3>This week</h3><span class="sub" style="margin:0">${fmtShort(start)} – ${fmtShort(end)}</span></div>
    ${days.map((d) => { const evs = map[d] || []; const mo = moons[d];
      return `<div class="dw-day ${d === t ? "today" : ""} ${d < t ? "past" : ""}"><button class="dw-date" data-act="dash-day" data-date="${d}"><b>${dowOf(d)}</b> ${parseD(d).getDate()}</button>
        <div class="dw-list">${mo ? `<div class="dw-ev moon">${mo.icon} ${mo.name} <span class="muted">${mo.time}</span></div>` : ""}
        ${evs.map((e) => `<div class="dw-ev ${e.done ? "done" : ""}" data-tip="${evTip(e)}"><span class="dot" style="background:${e.color};width:8px;height:8px"></span>${e.time ? `<span class="muted">${e.time}</span> ` : ""}${esc(e.title)}</div>`).join("")}
        ${!evs.length && !mo ? `<div class="dw-ev muted">–</div>` : ""}</div></div>`; }).join("")}</div>`;
}

pages.dashboard = () => {
  const t = today();
  const all = progressOf(TASKS);
  const h1 = P.horizons[0];
  const timeP = clamp01(daysBetween(h1.start, t) / daysBetween(h1.start, h1.end));
  const daysLeft = daysBetween(t, P.keyDates.retire);
  const fin = finance();
  const score = checkinScore(t);
  const s = activeSession(t);
  const sb = sabbatOn(t);
  const bdays = birthdaysBetween(t, t);
  const upcoming = countable(TASKS).filter((x) => status(x) !== "done" && x.d && x.d >= t && x.d <= addDays(t, 21)).sort((a, b) => a.d.localeCompare(b.d));
  const overdue = countable(TASKS).filter((x) => status(x) !== "done" && x.d && x.d < t).sort((a, b) => a.d.localeCompare(b.d));
  const countdowns = [
    fin.debt > 0 && fin.debtFree ? ["Debt-free", fin.debtFree, "Step 1 done"] : null,
    ["PT test week", "2027-02-22", "22-28 Feb · then the tri plan"],
    ["Berlin Sprint", "2027-06-05", "750m · 20K · 5K"],
    ["DEROS", P.keyDates.deros, "Leave Germany"],
    ["Retire at 20", P.keyDates.retire, "6 Dec 2031"],
  ].filter(Boolean).filter((c) => c[1] >= t);

  return `
  <header class="page-head">
  <h1>Hello, <em>${esc(me.user || P.owner)}</em>!</h1>
  <p class="subtitle">Happy ${sb ? `<span class="blessed">${sb.name}</span>` : DOW_LONG[parseD(t).getDay()]}!${bdays.length ? ` It's ${bdays.map((x) => esc(x.c.name)).join(" and ")}'s birthday.` : ""}</p></header>

  ${wheelSection(t)}

  <div class="grid dash-split">
    ${dashMonthBox(t)}
    ${dashWeekBox(t)}
  </div>

  <div class="grid g4" style="margin-top:14px">
    <div class="box hero span2">
      ${ring(all.p, "var(--brass)", 112)}
      <div style="flex:1;min-width:0">
        <div class="label">Horizon 1: Active-Duty AF Career</div>
        <div class="big">${all.done}<span class="of"> / ${all.total} tasks</span></div>
        <div class="sub">${pctTxt(all.p)} complete</div>
        <div style="margin-top:12px" class="label">Time used so far (since Dec 2011)</div>
        ${bar(timeP, "var(--muted)", "", null)}
        <div class="sub">${pctTxt(timeP)} of the 20 years · ${plural(daysLeft, "day")} to retirement</div>
      </div>
    </div>
    <a class="box" href="#today">
      <div class="label">Today's check-in</div>
      <div class="big">${score.done}<span class="of"> / ${score.total}</span></div>
      <div class="sub">${s && s.text ? `Workout: ${esc(s.text)}` : "Rest day"}</div>
    </a>
    <a class="box" href="#finances">
      <div class="label">Net worth (known)</div>
      <div class="big md">${money0(fin.net)}</div>
      <div class="sub"><span class="good">+${money0(fin.netChange)}</span> since ${fmtShort(fin.first.date)}</div>
      <div class="sub">Debt left ${money0(fin.debt)}${fin.debtFree && fin.debt > 0 ? ` · gone by ${fmtShort(fin.debtFree)}` : ""}</div>
    </a>
  </div>

  <h2>Countdowns</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
    ${countdowns.map(([n, d, sub]) => { const u = untilTxt(t, d); return `<div class="box tight"><div class="label">${n}</div><div class="big md">${u.big}${u.small ? ` <span class="cd-days">${u.small}</span>` : ""}</div><div class="sub">${fmt(d)}${sub ? " · " + sub : ""}</div></div>`; }).join("")}
  </div>

  <div class="grid g2" style="margin-top:6px">
    <div>
      <h2>Coming up <span class="h-note">next 3 weeks</span></h2>
      <div class="box">${upcoming.length ? `<ul class="tasks">${upcoming.map((x) => taskRow(x, { showProject: true })).join("")}</ul>` : `<div class="empty">Nothing due in the next 3 weeks.</div>`}</div>
    </div>
    <div>
      <h2>Overdue <span class="h-note">${overdue.length ? "re-date these at your quarterly review" : ""}</span></h2>
      <div class="box">${overdue.length ? `<ul class="tasks">${overdue.map((x) => taskRow(x, { showProject: true })).join("")}</ul>` : `<div class="empty good">Nothing overdue. Nice.</div>`}</div>
    </div>
  </div>

  <h2>Money at a glance <span class="h-note"><a href="#finances">Full finance dashboard →</a></span></h2>
  <div class="grid g4">
    <div class="box tight"><div class="label">Debt remaining</div><div class="big md">${money(fin.debt)}</div><div class="sub">${fin.debt > 0 ? `Planned debt-free ${fmt(fin.debtFree)}` : "Debt-free"}</div></div>
    <div class="box tight"><div class="label">Emergency fund</div><div class="big md">${fin.efMonths.toFixed(1)} mo</div><div class="sub">Goal 3-6 months</div></div>
    <div class="box tight"><div class="label">Retirement savings rate</div><div class="big md">${(fin.rate * 100).toFixed(1)}%</div><div class="sub">${fin.rate >= F.retirementTarget ? '<span class="good">✓ at the 15% goal</span>' : "Goal 15%"}</div></div>
    <div class="box tight"><div class="label">Credit score</div><div class="big md">${fin.L.credit || "–"}</div><div class="sub">Target 650-700 · check quarterly</div></div>
  </div>

  <h2>Guardrails</h2>
  <div class="grid g3">${P.guardrails.map(([n, d]) => `<div class="box tight"><h3 style="margin-bottom:4px">${esc(n)}</h3><div class="sub" style="font-size:13px">${esc(d)}</div></div>`).join("")}</div>`;
};

let ciDate = null;
pages.today = () => {
  const t = today();
  const d = ciDate || t;
  garminEnsure(addDays(d, -1), addDays(d, 1));
  const s = activeSession(d);
  const next = P.programs.find((p) => p.start > d);
  const ci = state.checkins[d] || {};
  const score = checkinScore(d);
  const last14 = (fn) => Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)).map((x) => `<span class="${fn(x) ? "on" : ""}" title="${fmtShort(x)}"></span>`).join("");
  const sessionDone = (x) => { const ss = activeSession(x); return ss && ss.text && state.sessions[ss.key]; };
  const row = (h) => {
    if (!habitApplies(h, d)) return "";
    const gv = h.garmin ? h.garmin(d) : null; const tv = ci[h.id + "T"] || gv || "";
    return `<div class="checkin-row">
      ${chk(habitDone(d, h.id), "habit", `data-h="${h.id}" data-date="${d}"`, "big-chk")}
      <div class="ci-text"><b>${h.label}</b>${h.link ? ` <a class="h-link" href="${h.link[0]}">${h.link[1]} →</a>` : ""}<div class="sub">${esc(h.sub(d))}</div>
        ${h.time ? `<label class="ci-time">${h.timeLabel || "Time"} <input type="time" value="${esc(tv)}" data-act="ci-time" data-h="${h.id}" data-date="${d}">${gv && !ci[h.id + "T"] ? `<span class="chip">⌚ Garmin</span>` : ""}</label>` : ""}</div>
      <div style="text-align:right"><div class="days14">${last14((x) => habitDone(x, h.id))}</div><div class="streak">${plural(streak(h.id), "day")} streak</div></div>
    </div>`;
  };
  const group = (g) => HABITS.filter((h) => h.group === g).map(row).join("");
  const workoutRow = `<div class="checkin-row">
      ${s && s.text ? chk(!!state.sessions[s.key], "session", `data-key="${s.key}"`, "big-chk") : `<span class="ongoing-dot" style="width:26px">–</span>`}
      <div class="ci-text">
        <b>Workout</b> ${s ? `<span class="chip">${esc(s.prog.name)} · week ${s.week}${s.module ? " · " + esc(s.module.name) : ""}</span>` : ""}
        <div class="sub" style="font-size:14px;color:var(--text)">${s ? (s.text ? esc(s.text) : "Rest day") : next ? `No plan running. ${esc(next.name)} starts ${fmt(next.start)}.` : "No training plan running."}</div>
        ${garminActsOn(d).map((x) => `<div class="sub">⌚ Garmin: ${esc(actLabel(x))}</div>`).join("")}
      </div>
      <div style="text-align:right"><div class="days14">${last14(sessionDone)}</div><div class="streak">${plural(workoutStreak(), "session")} in a row</div></div>
    </div>`;
  return `
  <h1>Daily check-in</h1>
  <p class="subtitle">Tick what you did. Every tick feeds the dashboard and syncs to your other devices.</p>
  <div class="daynav">
    <button class="btn sm" data-act="ci-day" data-n="-1">‹ Previous day</button>
    <strong style="font-size:16px;margin:0 6px">${fmtLong(d)}</strong>
    <button class="btn sm" data-act="ci-day" data-n="1" ${d >= t ? "disabled" : ""}>Next day ›</button>
    ${d !== t ? `<button class="btn sm" data-act="ci-day" data-n="0">Back to today</button>` : ""}
    <span class="chip ${score.done === score.total ? "good" : ""}" style="margin-left:auto">${score.done} / ${score.total} done</span>
  </div>

  <h2>☀ Morning routine</h2>
  <div class="box">${group("morning")}</div>

  <h2>Through the day</h2>
  <div class="box">${group("midday")}
    <div class="ci-menu"><div class="label" style="margin-bottom:6px">This week's menu · ${menuForDate(d)} · <a href="#meals">Meal plan →</a></div>${menuTable(menuForDate(d))}</div>
  </div>

  <h2>☾ Evening routine</h2>
  <div class="box">${workoutRow}${group("evening")}
    <div class="checkin-row" style="align-items:flex-start">
      <span class="ongoing-dot" style="width:26px">✎</span>
      <div class="ci-text"><b>Notes</b><textarea data-act="ci-note" data-date="${d}" placeholder="How did today go? Energy, mood, wins, anything to remember.">${esc(ci.note || "")}</textarea></div>
    </div>
  </div>`;
};

function menuTable(code) {
  const m = P.menus[code]; const tt = menuTotals(code); const M = P.macros;
  const names = { B: "Breakfast", L: "Lunch", D: "Dinner", S: "Protein snack" };
  return `<div class="box scroll-x"><table class="t"><thead><tr><th>Meal</th><th>Dish</th><th class="num">kcal</th><th class="num">Protein</th><th class="num">Carbs</th><th class="num">Fat</th></tr></thead><tbody>
    ${m.map((r) => `<tr><td>${names[r[0]]}</td><td>${esc(r[1])}</td><td class="num">${r[2]}</td><td class="num">${r[3]} g</td><td class="num">${r[4]} g</td><td class="num">${r[5]} g</td></tr>`).join("")}
    <tr><td colspan="2"><b>Day total</b> <span class="muted">(target ${M.kcal} kcal · ${M.protein}P / ${M.carbs}C / ${M.fat}F)</span></td><td class="num"><b>${tt.kcal}</b></td><td class="num"><b>${tt.p} g</b></td><td class="num"><b>${tt.c} g</b></td><td class="num"><b>${tt.f} g</b></td></tr>
    </tbody></table><div class="sub" style="margin-top:8px">${M.kcal - tt.kcal > 0 ? `${M.kcal - tt.kcal} kcal of room left for snacks.` : ""}</div></div>`;
}

pages.family = () => {
  const r = state.rule222; const start = r.start || P.defaults.rule222Start; const t = today();
  const dn = []; for (let d = start, i = 0; i < 200 && d <= P.keyDates.retire; i++, d = addDays(d, 14)) dn.push(d);
  const wk = []; for (let d = addMonths(start, 2), i = 0; i < 40 && d <= addMonths(P.keyDates.retire, 2); i++, d = addMonths(d, 2)) wk.push(d);
  const vac = []; for (let d = addMonths(start, 24), i = 0; i < 3; i++, d = addMonths(d, 24)) vac.push(d);
  const pastDn = dn.filter((d) => d <= t);
  const doneDn = pastDn.filter((d) => r.done["dn:" + d]).length;
  const showDn = [...pastDn.slice(-3), ...dn.filter((d) => d > t).slice(0, 5)];
  const showWk = [...wk.filter((d) => d <= t).slice(-1), ...wk.filter((d) => d > t).slice(0, 5)];
  const row = (kind, d, label) => {
    const on = !!r.done[`${kind}:${d}`];
    const late = !on && d < t;
    return `<li class="${on ? "done" : ""}">${chk(on, "r222", `data-k="${kind}:${d}"`)}<div class="tt"><div class="t-text">${label} · ${fmt(d)}</div><div class="meta">${on ? "Done" : late ? `<span class="warn">Missed or not ticked</span>` : relDays(d)}</div></div></li>`;
  };
  const spaces = state.spaces || P.defaults.homeSpaces.map((s) => ({ name: s.name, month: s.month, tasks: s.tasks.map((x) => ({ t: x, done: false })) }));
  const quarter = (m) => { const [y, mo] = m.split("-").map(Number); return `Q${Math.ceil(mo / 3)} ${y}`; };
  return `
  <h1>Family & Found Family</h1>
  <p class="subtitle">My wife, our dogs, Allie, and the people we've chosen to keep close. <a href="#contacts">Contacts →</a></p>
  ${projectsFor("family")}

  <h2>2-2-2 rule <span class="h-note">Date night every 2 weeks · weekend away every 2 months · a week away every 2 years</span></h2>
  <div class="box" style="margin-bottom:14px"><div class="row"><label class="label" style="display:flex;gap:10px;align-items:center">Start date <input type="date" data-act="r222-start" value="${start}" style="width:auto"></label>
    <span class="sub">${pastDn.length ? `${doneDn} of ${pastDn.length} date nights so far` : `First date night ${relDays(start)}`}</span></div></div>
  <div class="grid g3">
    <div class="box"><h3>Date nights</h3><ul class="tasks">${showDn.map((d) => row("dn", d, "Date night")).join("")}</ul></div>
    <div class="box"><h3>Weekends away</h3><ul class="tasks">${showWk.map((d) => row("wk", d, "Weekend away by")).join("")}</ul></div>
    <div class="box"><h3>Week-long trips</h3><ul class="tasks">${vac.map((d) => row("vac", d, "Week away by")).join("")}</ul></div>
  </div>

  <h2>Home spaces <span class="h-note">A space is finished when every task in it is ticked</span></h2>
  <div class="grid cards">
    ${spaces.map((sp, si) => {
      const done = sp.tasks.filter((x) => x.done).length; const p = sp.tasks.length ? done / sp.tasks.length : 0;
      return `<div class="box">
        <div class="row" style="margin-bottom:8px"><input type="text" value="${esc(sp.name)}" data-act="sp-name" data-si="${si}" style="flex:1;font-weight:600"><button class="x-btn" data-act="sp-del" data-si="${si}" title="Remove space">×</button></div>
        <div class="row" style="margin-bottom:10px"><input type="month" value="${esc(sp.month)}" data-act="sp-month" data-si="${si}" style="width:auto"><span class="chip">${sp.month ? quarter(sp.month) : ""}</span>${p === 1 ? '<span class="chip good">Finished</span>' : ""}</div>
        ${bar(p, domain("family").color)}
        <ul class="tasks" style="margin-top:8px">${sp.tasks.map((x, ti) => `<li class="${x.done ? "done" : ""}">${chk(x.done, "sp-task", `data-si="${si}" data-ti="${ti}"`)}<div class="tt"><div class="t-text">${esc(x.t)}</div></div><button class="x-btn" data-act="sp-tdel" data-si="${si}" data-ti="${ti}" title="Remove">×</button></li>`).join("")}</ul>
        <input type="text" placeholder="+ Add a task and press Enter" data-act="sp-add" data-si="${si}" style="margin-top:8px">
      </div>`;
    }).join("")}
    <button class="box" data-act="sp-new" style="border-style:dashed;cursor:pointer;color:var(--text-2);min-height:120px">+ Add a space</button>
  </div>`;
};

function garminSection(t) {
  garminEnsure(addDays(t, -27), t);
  if (garmin.connected === false) return `<h2>From your Garmin</h2><div class="box empty">Not connected yet. See “Garmin” in the README to add your personal API key.</div>`;
  if (garmin.connected == null) return garmin.loading ? `<h2>From your Garmin</h2><div class="box empty">Loading your Garmin data…</div>` : "";
  if (!garmin.ok) return `<h2>From your Garmin</h2><div class="box"><div class="note">${esc(garmin.error || "Couldn't read Garmin data.")}</div></div>`;
  const ds = Array.from({ length: 14 }, (_, i) => addDays(t, -i)).map((d) => garmin.days[d] || { date: d });
  const last = (k) => ds.find((d) => d[k] != null);
  const avg = (k, n = 7) => { const v = ds.slice(0, n).map((d) => d[k]).filter((x) => x != null); return v.length ? Math.round(sum(v) / v.length * 10) / 10 : null; };
  const sl = last("sleepHours"), hv = last("hrv"), rh = last("restingHR"), bb = last("bbHigh"), st = last("steps"), wt = last("weightKg");
  const tile = (label, val, sub) => `<div class="box tight"><div class="label">${label}</div><div class="big md">${val ?? "–"}</div><div class="sub">${sub || ""}</div></div>`;
  const acts = Object.values(garmin.acts).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  const cols = [["sleepHours", "Sleep (h)"], ["sleepScore", "Sleep score"], ["hrv", "HRV"], ["restingHR", "Resting HR"], ["bbHigh", "Body Battery"], ["stress", "Stress"], ["steps", "Steps"]];
  return `<h2>From your Garmin <span class="h-note">${garmin.fetchedAt ? `updated ${new Date(garmin.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · ` : ""}<a href="#settings">settings</a></span></h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    ${tile("Last night's sleep", sl ? `${sl.sleepHours} h` : null, sl ? `${sl.sleepScore ? `score ${sl.sleepScore} · ` : ""}7-day avg ${avg("sleepHours") ?? "–"} h` : "")}
    ${tile("HRV", hv ? `${hv.hrv} ms` : null, hv ? `${hv.hrvStatus ? hv.hrvStatus + " · " : ""}${fmtShort(hv.date)}` : "")}
    ${tile("Resting HR", rh ? `${rh.restingHR}` : null, rh ? `7-day avg ${avg("restingHR")}` : "")}
    ${tile("Body Battery", bb ? `${bb.bbHigh}` : null, bb ? `high on ${fmtShort(bb.date)}${bb.bbLow != null ? ` · low ${bb.bbLow}` : ""}` : "")}
    ${tile("Steps", st ? st.steps.toLocaleString() : null, st ? `${fmtShort(st.date)} · 7-day avg ${avg("steps") ? Math.round(avg("steps")).toLocaleString() : "–"}` : "")}
    ${wt ? tile("Weight (Garmin)", `${wt.weightKg} kg`, fmtShort(wt.date)) : ""}
  </div>
  <div class="grid g2" style="align-items:start;margin-top:14px">
    <div class="box scroll-x"><h3>Last 14 days</h3><table class="t"><thead><tr><th>Day</th>${cols.map(([, l]) => `<th class="num">${l}</th>`).join("")}</tr></thead><tbody>
      ${ds.map((d) => `<tr><td style="white-space:nowrap">${fmt(d.date, { weekday: "short", day: "numeric" })}</td>${cols.map(([k]) => `<td class="num">${d[k] != null ? (k === "steps" ? d[k].toLocaleString() : d[k]) : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="box"><h3>Recent activities</h3>${acts.length ? `<ul class="tasks">${acts.map((x) => `<li><span class="ongoing-dot">⌚</span><div class="tt"><div class="t-text">${esc(x.name || x.type.replace(/_/g, " "))}</div><div class="meta">${fmt(x.date, { weekday: "short", day: "numeric", month: "short" })} ${x.start.slice(11, 16)}${x.distanceKm ? ` · ${x.distanceKm} km` : ""}${x.durationMin ? ` · ${x.durationMin} min` : ""}${x.avgHR ? ` · avg HR ${x.avgHR}` : ""}</div></div></li>`).join("")}</ul><div class="sub" style="margin-top:8px">Workouts on days with a training-plan session tick that session off automatically.</div>` : `<div class="empty">No activities in the last 4 weeks.</div>`}</div>
  </div>`;
}
pages.health = () => {
  const t = today();
  const s = activeSession(t);
  const weeksTicked = Object.keys(state.mealWeeks).filter((k) => state.mealWeeks[k]).length;
  const entries = (state.body.entries || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const lastB = entries[entries.length - 1];
  const c = domain("health").color;
  return `
  <h1>Health, Wellness & Fitness</h1>
  <p class="subtitle">Staying capable and consistent now, so it's not something to scramble to fix later.</p>
  <div class="grid g3">
    <a class="box" href="#training"><div class="label">Today's training</div><div class="big md">${s ? (s.text ? "Week " + s.week : "Rest day") : "No plan running"}</div><div class="sub">${s && s.text ? esc(s.text) : s ? esc(s.prog.name) : ""}</div></a>
    <a class="box" href="#meals"><div class="label">Macro-compliant weeks ticked</div><div class="big md">${weeksTicked}</div><div class="sub">This week: menu ${menuForDate(t)}</div></a>
    <a class="box" href="#body"><div class="label">Latest measurements</div><div class="big md">${lastB && lastB.weight ? `${lastB.weight} ${state.body.unit === "imperial" ? "lb" : "kg"}` : "Not set yet"}</div><div class="sub">${lastB ? fmt(lastB.date) + (bmiOf(lastB) ? ` · BMI ${bmiOf(lastB).toFixed(1)}` : "") : "Add your starting measurements"}</div></a>
  </div>

  <div class="grid g3" style="margin-top:14px">
    <a class="box tight" href="#meds"><div class="label">Meds tracker</div><div class="big md">${(() => { const l = medsList(); const tk = medsTaken(t); return l.length ? `${l.filter((m) => tk[m.id]).length} / ${l.length}` : "Set up"; })()}</div><div class="sub">taken today</div></a>
    <a class="box tight" href="#mood"><div class="label">Mental health</div><div class="big md">${(PRIV().mood[t] || {}).mood ? `Mood ${(PRIV().mood[t] || {}).mood}/5` : "Not logged"}</div><div class="sub">today's check-in</div></a>
    <a class="box tight" href="#cycle"><div class="label">Period tracker</div><div class="big md">${(() => { const ci = cycleInfo(); return ci.day ? `Day ${ci.day}` : "Set up"; })()}</div><div class="sub">${(() => { const ci = cycleInfo(); return ci.next ? `next about ${fmtShort(ci.next)}` : "log a period to start"; })()}</div></a>
  </div>
  ${garminSection(t)}
  <h2>Endurance roadmap <span class="h-note">Each event builds the base for the next</span></h2>
  <div class="box"><ul class="timeline" style="--mc:${c}">
    ${P.endurance.map((e) => {
      const done = state.events[e.id] && state.events[e.id].done;
      const pr = progressOf(P.projects.find((p) => p.id === e.project).tasks.map((_, i) => TASK[`${e.project}-${i}`]));
      return `<li class="${done ? "done" : ""}"><span class="tl-dot"></span><span class="tl-when">${esc(e.when)}</span>
        <div class="tl-body"><div class="row" style="justify-content:space-between"><b>${esc(e.name)}</b>
          <button class="btn sm" data-act="event" data-id="${e.id}">${done ? "✓ Completed" : "Mark completed"}</button></div>
          <div class="sub">${esc(e.detail)}${e.includes ? ` · also counts as your ${esc(e.includes)}` : ""}</div>
          <div class="row" style="margin-top:6px"><div style="flex:1;max-width:220px">${bar(pr.p, c)}</div><span class="sub" style="margin:0">${pr.done}/${pr.total} prep tasks</span>${!done && e.date >= t ? `<span class="sub" style="margin:0">· ${relDays(e.date)}</span>` : ""}</div>
        </div></li>`;
    }).join("")}
  </ul></div>

  <h2>Projects</h2>
  ${projectsFor("health")}`;
};

pages.training = () => {
  const t = today(); garminEnsure(addDays(t, -27), t); const c = domain("health").color;
  const scores = [{ ...P.ptBaseline, baseline: true }, ...(state.ptScores || []).map((s, i) => ({ ...s, idx: i }))].sort((a, b) => a.date.localeCompare(b.date));
  return `
  <h1>Training</h1>
  <p class="subtitle">Programs are split into modules (blocks and phases). Tick sessions here or on the daily check-in.</p>
  ${P.programs.map((prog) => {
    const st = programStats(prog); const end = addDays(prog.start, prog.weeks.length * 7 - 1);
    const cur = programSession(prog, t);
    const curWeek = cur ? cur.week : (t < prog.start ? 1 : null);
    const totalW = prog.weeks.length;
    return `<div class="box" style="margin-bottom:16px">
      <div class="card-head"><span class="dot" style="background:${c}"></span><h3>${esc(prog.name)}</h3><span class="pct">${st.total ? pctTxt(st.done / st.total) : ""}</span></div>
      <div class="sub">${fmt(prog.start)} - ${fmt(end)} · ${totalW} weeks · ${st.done} of ${st.total} sessions done${st.dueSoFar ? ` · ${st.doneSoFar}/${st.dueSoFar} of sessions so far` : ""} ${cur ? `<span class="chip good">Running · week ${cur.week}</span>` : t < prog.start ? `<span class="chip">Starts ${relDays(prog.start)}</span>` : `<span class="chip">Finished</span>`}</div>
      <div class="modules">${prog.modules.map((m) => {
        const wks = m.weeks[1] - m.weeks[0] + 1;
        let tot = 0, dn = 0;
        for (let w = m.weeks[0]; w <= m.weeks[1]; w++) DAYS.forEach((d, di) => { if (prog.weeks[w - 1][d]) { tot++; if (state.sessions[`${prog.id}|${addDays(prog.start, (w - 1) * 7 + di)}`]) dn++; } });
        const now = curWeek && curWeek >= m.weeks[0] && curWeek <= m.weeks[1] && cur;
        return `<div style="flex:${wks};--mc:${c}" class="${now ? "now" : ""}" data-tip="${esc(`<b>${m.name}</b><br>Weeks ${m.weeks[0]}-${m.weeks[1]}${m.note ? "<br>" + m.note : ""}<br>${dn}/${tot} sessions`)}"><div class="fill" style="width:${tot ? (dn / tot) * 100 : 0}%"></div><span>${esc(m.name)}</span></div>`;
      }).join("")}</div>
      <div class="legend">${Object.entries(prog.skeleton).map(([d, x]) => `<span><b>${d}</b> ${esc(x)}</span>`).join("")}</div>
      <div style="margin-top:10px">${prog.weeks.map((w, wi) => {
        const wstart = addDays(prog.start, wi * 7);
        const mod = prog.modules.find((m) => wi + 1 >= m.weeks[0] && wi + 1 <= m.weeks[1]);
        const days = DAYS.filter((d) => w[d]);
        const k = `wk-${prog.id}-${wi}`;
        return `<details class="week" data-key="${k}" ${isOpen(k, curWeek === wi + 1) ? "open" : ""}><summary>
          <span class="wk">Wk ${wi + 1}</span><span class="wdates">${fmtShort(wstart)} - ${fmtShort(addDays(wstart, 6))}</span><span class="wmod">${esc(mod ? mod.name : "")}</span>
          <span class="wdots">${days.map((d) => { const date = addDays(prog.start, wi * 7 + DAYS.indexOf(d)); return `<span class="${state.sessions[prog.id + "|" + date] ? "on" : ""} ${date === t ? "today" : ""}"></span>`; }).join("")}</span></summary>
          <div class="sessions">${days.map((d) => { const date = addDays(prog.start, wi * 7 + DAYS.indexOf(d)); const key = `${prog.id}|${date}`;
            const ga = garminActsOn(date).filter((x) => GARMIN_WORKOUT.test(x.type));
            return `<div class="session ${date === t ? "is-today" : ""}">${chk(!!state.sessions[key], "session", `data-key="${key}"`)}<span class="sday">${d} ${fmtShort(date)}</span><span>${esc(w[d])}${ga.map((x) => `<span class="sub" style="display:block;margin:0">⌚ ${esc(actLabel(x))}</span>`).join("")}</span></div>`; }).join("")}</div>
        </details>`;
      }).join("")}</div>
    </div>`;
  }).join("")}

  <h2>PT test scores <span class="h-note">Goal 80-85+ on every test (75 to pass)</span></h2>
  <div class="box">
    <div class="scroll-x"><table class="t"><thead><tr><th>Date</th><th class="num">HRPU</th><th class="num">Sit-ups</th><th class="num">HAMR</th><th class="num">Total</th><th></th></tr></thead><tbody>
    ${scores.map((s) => `<tr><td>${fmt(s.date)} ${s.baseline ? '<span class="chip">Baseline</span>' : ""}</td><td class="num">${s.hrpu ?? ""}</td><td class="num">${s.situp ?? ""}</td><td class="num">${s.hamr ?? ""}</td><td class="num"><b class="${s.total >= 80 ? "good" : s.total >= 75 ? "warn" : "bad"}">${s.total ?? ""}</b></td><td>${s.baseline ? "" : `<button class="x-btn" data-act="pt-del" data-i="${s.idx}">×</button>`}</td></tr>`).join("")}
    </tbody></table></div>
    <form data-form="pt" class="form-grid" style="margin-top:14px">
      <label>Date<input type="date" name="date" value="${t}" required></label>
      <label>HRPU<input type="number" name="hrpu" inputmode="numeric"></label>
      <label>Sit-ups<input type="number" name="situp" inputmode="numeric"></label>
      <label>HAMR<input type="number" name="hamr" inputmode="numeric"></label>
      <label>Total score<input type="number" name="total" step="0.1" inputmode="decimal" required></label>
      <label>&nbsp;<button class="btn primary" type="submit">Add result</button></label>
    </form>
  </div>

  <h2>Programs still to build</h2>
  <div class="box"><ul class="tasks">${P.futurePrograms.map((f) => `<li><span class="ongoing-dot">○</span><div class="tt"><div class="t-text">${esc(f.name)}</div><div class="meta">${esc(f.note)}</div></div></li>`).join("")}</ul>
  <div class="note" style="margin-top:10px">When a plan is ready, add it to <code>programs</code> in data.js (same shape as the two above) and it gets modules, week-by-week ticks and daily check-ins automatically.</div></div>`;
};

let mealYear = null;
pages.meals = () => {
  const t = today(); const cur = isoWeek(t);
  const y = mealYear || cur.y; const n = weeksInYear(y); const M = P.macros;
  const startKey = "2026-W39";
  const pastKeys = []; let hit = 0;
  for (let yy = 2026; yy <= cur.y; yy++) for (let w = 1; w <= weeksInYear(yy); w++) {
    const k = `${yy}-W${pad(w)}`; if (k < startKey || isoMonday(yy, w) > t) continue; pastKeys.push(k); if (state.mealWeeks[k]) hit++;
  }
  const daysHit = (yy, w) => { const mon = isoMonday(yy, w); let c = 0; for (let i = 0; i < 7; i++) if (habitDone(addDays(mon, i), "meals")) c++; return c; };
  return `
  <h1>Meals & macros</h1>
  <p class="subtitle">53-week seasonal plan. Tick a week when you stayed at or under your macros.</p>
  <div class="grid g4">
    <div class="box tight"><div class="label">Calories</div><div class="big md">${M.kcal.toLocaleString()}</div><div class="sub">per day (deficit)</div></div>
    <div class="box tight"><div class="label">Protein</div><div class="big md">${M.protein} g</div></div>
    <div class="box tight"><div class="label">Carbs · Fat</div><div class="big md">${M.carbs} g · ${M.fat} g</div></div>
    <div class="box tight"><div class="label">Weeks on target</div><div class="big md">${hit}<span class="of"> / ${pastKeys.length}</span></div><div class="sub">since week 39, 2026</div></div>
  </div>

  <h2>This week: menu ${menuForDate(t)} <span class="h-note">${seasonOf(menuForDate(t))[0]} · week ${cur.w}</span></h2>
  ${menuTable(menuForDate(t))}

  <h2>${y} calendar
    <span class="h-note"><button class="btn sm" data-act="meal-year" data-n="-1">‹ ${y - 1}</button> <button class="btn sm" data-act="meal-year" data-n="1">${y + 1} ›</button></span></h2>
  <div class="legend" style="margin:0 0 10px">${["Winter", "Spring", "Summer", "Autumn"].map((s) => `<span><span class="season" style="background:${seasonOf(s === "Winter" ? "W1" : s === "Spring" ? "SP1" : s === "Summer" ? "SU1" : "A1")[1]}"></span>${s}</span>`).join("")}<span>Dots = days ticked on the daily check-in</span></div>
  <div class="weeks-grid">
    ${Array.from({ length: n }, (_, i) => i + 1).map((w) => {
      const k = `${y}-W${pad(w)}`; const mon = isoMonday(y, w); const code = P.mealCalendar[w] || "W1"; const [, col] = seasonOf(code);
      const future = mon > t; const now = y === cur.y && w === cur.w; const dh = daysHit(y, w);
      return `<div class="wcell ${now ? "now" : ""} ${future ? "future" : ""}">
        <div class="wtop"><span class="wnum"><span class="season" style="background:${col}"></span>Wk ${w}</span>${chk(!!state.mealWeeks[k], "mealweek", `data-k="${k}"`)}</div>
        <span class="wmenu">Menu ${code}</span><span class="wdate">${fmtShort(mon)}${dh ? ` · ${"●".repeat(dh)}` : ""}</span></div>`;
    }).join("")}
  </div>

  <h2>All 20 menus</h2>
  <div class="box">${Object.keys(P.menus).map((code) => { const tt = menuTotals(code); const k = "menu-" + code;
    return `<details class="proj" data-key="${k}" ${isOpen(k, false) ? "open" : ""}><summary><span class="caret">▸</span><span class="ptitle"><span class="season" style="background:${seasonOf(code)[1]}"></span>Menu ${code} <span class="pmeta">· ${tt.kcal} kcal · ${tt.p}P / ${tt.c}C / ${tt.f}F</span></span></summary>
    <div class="proj-body">${P.menus[code].map((r) => `<div class="sub" style="font-size:13.5px;color:var(--text)"><b>${r[0]}</b> ${esc(r[1])} <span class="muted">${r[2]} kcal</span></div>`).join("")}</div></details>`; }).join("")}</div>

  <h2>Project</h2>
  ${projectsFor("health", (p) => p.id === "meals")}`;
};

const BODY_FIELDS = [["weight", "Weight"], ["neck", "Neck"], ["chest", "Chest"], ["upperArms", "Upper arms"], ["abdomen", "Abdomen"], ["waist", "Waist"], ["hips", "Hips"], ["thighs", "Thighs"], ["calves", "Calves"]];
function bmiOf(e) {
  const h = Number(state.body.height); const w = Number(e.weight);
  if (!h || !w) return null;
  return state.body.unit === "imperial" ? (703 * w) / (h * h) : w / ((h / 100) ** 2);
}
pages.body = () => {
  const b = state.body; const imp = b.unit === "imperial"; const wu = imp ? "lb" : "kg"; const lu = imp ? "in" : "cm";
  const entries = (b.entries || []).map((e, i) => ({ ...e, i })).sort((a, b2) => a.date.localeCompare(b2.date));
  const first = entries[0]; const last = entries[entries.length - 1];
  const delta = (f) => { if (!first || !last || first === last) return ""; const d = Number(last[f]) - Number(first[f]); if (!isFinite(d) || last[f] === "" || first[f] === "" || last[f] == null || first[f] == null) return ""; return `${d > 0 ? "+" : ""}${Math.round(d * 10) / 10}`; };
  const bmi = last && bmiOf(last);
  const bmiCat = (v) => v < 18.5 ? ["Underweight", "warn"] : v < 25 ? ["Healthy range", "good"] : v < 30 ? ["Overweight", "warn"] : ["Obese range", "bad"];
  return `
  <h1>Body</h1>
  <p class="subtitle">Set your starting measurements, then check in monthly. Change is shown against your first entry.</p>
  <div class="box" style="margin-bottom:14px"><div class="row">
    <label class="label row">Units <select data-act="body-unit" style="width:auto"><option value="metric" ${!imp ? "selected" : ""}>kg / cm</option><option value="imperial" ${imp ? "selected" : ""}>lb / in</option></select></label>
    <label class="label row">Height (${lu}) <input type="number" step="0.1" data-act="body-height" value="${esc(b.height ?? "")}" style="width:110px"></label>
    <span class="sub">Height is needed for BMI. Pick units once; switching later doesn't convert old entries.</span></div></div>

  <div class="grid g3">
    <div class="box"><div class="label">BMI</div><div class="big md">${bmi ? bmi.toFixed(1) : "–"}</div><div class="sub">${bmi ? `<span class="chip ${bmiCat(bmi)[1]}">${bmiCat(bmi)[0]}</span> Agree a target range with your PCM` : "Add height and weight"}</div></div>
    <div class="box"><div class="label">Weight</div><div class="big md">${last && last.weight ? `${last.weight} ${wu}` : "–"}</div><div class="sub">${delta("weight") ? `${delta("weight")} ${wu} since ${fmt(first.date)}` : first ? "Starting point" : ""}</div></div>
    <div class="box"><div class="label">Waist</div><div class="big md">${last && last.waist ? `${last.waist} ${lu}` : "–"}</div><div class="sub">${delta("waist") ? `${delta("waist")} ${lu} since ${fmt(first.date)}` : ""}</div></div>
  </div>

  ${entries.filter((e) => e.weight).length >= 2 ? `<h2>Weight trend</h2><div class="box">${lineChart([{ name: "Weight", color: domain("health").color, points: entries.filter((e) => e.weight).map((e) => ({ x: e.date, y: Number(e.weight) })) }], { money: false })}</div>` : ""}

  <h2>${entries.length ? "Add a check-in" : "Starting measurements"}</h2>
  <div class="box"><form data-form="body" class="form-grid">
    <label>Date<input type="date" name="date" value="${today()}" required></label>
    ${BODY_FIELDS.map(([k, l]) => `<label>${l} (${k === "weight" ? wu : lu})<input type="number" step="0.1" name="${k}" inputmode="decimal"></label>`).join("")}
    <label>&nbsp;<button class="btn primary" type="submit">Save</button></label>
  </form></div>

  ${entries.length ? `<h2>History</h2><div class="box scroll-x"><table class="t"><thead><tr><th>Date</th>${BODY_FIELDS.map(([, l]) => `<th class="num">${l}</th>`).join("")}<th class="num">BMI</th><th></th></tr></thead><tbody>
    ${entries.map((e) => `<tr><td>${fmt(e.date)}</td>${BODY_FIELDS.map(([k]) => `<td class="num">${e[k] ?? ""}</td>`).join("")}<td class="num">${bmiOf(e) ? bmiOf(e).toFixed(1) : ""}</td><td><button class="x-btn" data-act="body-del" data-i="${e.i}">×</button></td></tr>`).join("")}
    ${entries.length > 1 ? `<tr><td><b>Change</b></td>${BODY_FIELDS.map(([k]) => `<td class="num"><b>${delta(k)}</b></td>`).join("")}<td></td><td></td></tr>` : ""}
  </tbody></table></div>` : ""}

  <h2>Project</h2>
  ${projectsFor("health", (p) => p.id === "bmi")}`;
};

pages.finances = () => {
  const fin = finance(); const { L } = fin; const c = domain("finances").color; const t = today();
  // seven steps
  const ef = L.funds.ef || 0;
  const steps = F.sevenSteps.map((name, i) => {
    let done = false, note = "";
    if (i === 0) { done = fin.debt <= 0; note = done ? "Debt-free" : `${money(fin.debt)} left · planned debt-free ${fmt(fin.debtFree)}`; }
    if (i === 1) { done = ef >= 1000; note = `Emergency fund ${money0(ef)}`; }
    if (i === 2) { done = fin.efMonths >= 6; note = `${fin.efMonths.toFixed(1)} of 3-6 months · ${pctTxt(ef / F.funds.find((f) => f.id === "ef").goal)} of ${money0(F.funds.find((f) => f.id === "ef").goal)}`; }
    if (i === 3) { done = fin.rate >= F.retirementTarget; note = `Roth TSP at ${(fin.rate * 100).toFixed(1)}% of base pay (rising to 25% in Horizon 2)`; }
    if (i === 4) { note = "Not part of your plan yet. Your godsons and nieces/nephews are covered by the trust in your inheritance plan."; }
    if (i === 5) { const dp = L.funds.down || 0; note = `No home yet. Down payment fund ${money0(dp)} of $100,000 (${pctTxt(dp / 100000)})`; }
    if (i === 6) { const tr = L.funds.trading || 0; note = `Trading portfolio ${money0(tr)} of $30,000 → $2,000/month dividends by Horizon 3. Giving starts in Horizon 2.`; }
    return { name, done, note };
  });
  const nowIdx = steps.findIndex((s, i) => i < 3 && !s.done);
  // debt timeline
  const actual = fin.snaps.map((s) => ({ x: s.date, y: debtTotal(s), note: s.label || "" }));
  let run = fin.debt; const planned = [{ x: L.date, y: run }];
  const byDate = {}; fin.remainingPlan.forEach((p) => { byDate[p.date] = (byDate[p.date] || 0) + Math.min(p.amount, L.debts[p.debt] || 0); });
  Object.keys(byDate).sort().forEach((d) => { run = Math.max(0, run - byDate[d]); planned.push({ x: d, y: Math.round(run * 100) / 100, note: "Planned" }); });
  // gauge
  const gaugeMax = 6; const gp = clamp01(fin.efMonths / gaugeMax);
  const arc = (p) => { const a = Math.PI * (1 - p); return [100 + 80 * Math.cos(a), 100 - 80 * Math.sin(a)]; };
  const [gx, gy] = arc(gp); const [m3x, m3y] = arc(0.5);
  // allocation
  const inc = sum(F.monthly.income.map((x) => x[1]));
  const outs = F.monthly.out.map((x) => ({ name: x[0], amt: x[1], kind: x[2] }));
  const rest = inc - sum(outs.map((o) => o.amt));
  const kindColor = { fixed: "var(--d-career)", save: "var(--d-finances)", tax: "var(--neutral-series)" };
  const kindOrder = { tax: 0, fixed: 1, save: 2 };
  const alloc = [...outs.map((o) => ({ ...o, kind: o.name.startsWith("Taxes") ? "tax" : o.kind })).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]).map((o) => ({ ...o, color: kindColor[o.kind] })), { name: "Day-to-day & unassigned", amt: rest, color: "var(--d-degree)" }];
  const saveTotal = sum(outs.filter((o) => o.kind === "save").map((o) => o.amt));
  // net worth
  const nw = fin.snaps.map((s) => ({ x: s.date, y: Math.round(netWorth(s) * 100) / 100, note: s.label || "" }));
  const nextFund = F.funds.find((f) => (L.funds[f.id] || 0) < f.goal);

  return `
  <h1>Finances</h1>
  <p class="subtitle">Building the stability I didn't grow up with. Latest snapshot: ${fmt(L.date)}${L.label ? " · " + esc(L.label) : ""}.</p>

  <div class="grid g4">
    <div class="box"><div class="label">Debt remaining</div><div class="big md">${money(fin.debt)}</div><div class="sub">${fin.debt > 0 ? `Projected debt-free <b>${fmt(fin.debtFree)}</b>` : '<span class="good">Debt-free ✓</span>'}</div></div>
    <div class="box"><div class="label">Emergency fund coverage</div><div class="big md">${fin.efMonths.toFixed(1)} months</div><div class="sub">${money0(ef)} · ${esc(fin.exp.basis)}</div></div>
    <div class="box"><div class="label">Retirement savings rate</div><div class="big md">${(fin.rate * 100).toFixed(1)}%</div><div class="sub">${money(F.tspMonthly)}/mo Roth TSP · goal 15% ${fin.rate >= .15 ? '<span class="good">✓</span>' : ""}</div></div>
    <div class="box"><div class="label">Net worth (known)</div><div class="big md">${money0(fin.net)}</div><div class="sub"><span class="good">+${money0(fin.netChange)}</span> since ${fmt(fin.first.date)}</div></div>
  </div>

  <div class="grid g2" style="margin-top:14px;align-items:start">
    <div class="grid">
      <div class="box"><h3>Seven-step roadmap</h3>
        <ol class="steps">${steps.map((s, i) => `<li class="${s.done ? "done" : i === nowIdx ? "now" : ""}"><span class="num">${s.done ? "✓" : i + 1}</span><div class="st"><b>${esc(s.name)}</b> ${i === nowIdx ? '<span class="chip">You are here</span>' : ""}<div class="sub">${esc(s.note)}</div></div></li>`).join("")}</ol>
      </div>
      <div class="box"><h3>Debt payoff timeline</h3>
        ${lineChart([{ name: "Debt (actual)", color: c, points: actual }, { name: "Debt (planned)", color: c, dashed: true, points: planned }], { yMin: 0, height: 170 })}
        <div class="legend"><span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" style="stroke:${c}" stroke-width="2"/></svg>Actual</span><span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" style="stroke:${c}" stroke-width="2" stroke-dasharray="5 4"/></svg>Planned</span></div>
        <ul class="timeline" style="margin-top:8px;--mc:${c}">
          ${Object.entries(L.debts).sort((a, b) => { const pa = F.payoffPlan.find((p) => p.debt === a[0]); const pb = F.payoffPlan.find((p) => p.debt === b[0]); return (a[1] <= 0) - (b[1] <= 0) || ((pa && pa.date) || "9").localeCompare((pb && pb.date) || "9"); }).map(([k, v]) => { const pl = F.payoffPlan.find((p) => p.debt === k); const meta = F.debtsMeta[k] || { name: k };
            return `<li class="${v <= 0 ? "done" : ""}"><span class="tl-dot"></span><span class="tl-when">${v <= 0 ? "Paid off" : pl ? fmt(pl.date) : "TBD"}</span><div class="tl-body"><b>${esc(meta.name)}</b> <span class="muted">${v > 0 ? money(v) : ""}${meta.rate ? " · " + meta.rate : ""}</span>${pl && v > 0 ? `<div class="sub">${esc(pl.note)}</div>` : ""}</div></li>`; }).join("")}
        </ul>
      </div>
    </div>
    <div class="grid">
      <div class="box"><h3>Emergency fund</h3>
        <svg class="chart" viewBox="0 0 200 118" style="max-width:340px;margin:0 auto" role="img" aria-label="${fin.efMonths.toFixed(1)} months of expenses">
          <path d="M20,100 A80,80 0 0 1 180,100" fill="none" stroke="var(--track)" stroke-width="16" stroke-linecap="round"/>
          ${gp > 0 ? `<path d="M20,100 A80,80 0 0 1 ${gx.toFixed(1)},${gy.toFixed(1)}" fill="none" style="stroke:${c}" stroke-width="16" stroke-linecap="round"/>` : ""}
          <line x1="${m3x}" y1="${m3y - 12}" x2="${m3x}" y2="${m3y + 12}" stroke="var(--text)" stroke-width="2"/>
          <text x="${m3x}" y="${m3y - 16}" text-anchor="middle" class="axis-t">3 mo</text>
          <text x="178" y="114" text-anchor="middle" class="axis-t">6 mo</text><text x="22" y="114" text-anchor="middle" class="axis-t">0</text>
          <text x="100" y="88" text-anchor="middle" style="font-size:24px;font-weight:750;fill:var(--text)">${fin.efMonths.toFixed(1)}</text>
          <text x="100" y="104" text-anchor="middle" class="axis-t">months covered</text>
        </svg>
        <div class="sub" style="text-align:center">${money0(ef)} of ${money0(30781.80)} target · planned full by Nov 2027</div>
      </div>
      <div class="box"><h3>Retirement contribution rate vs 15%</h3>
        ${bar(fin.rate / 0.25, c, "thick", 0.15 / 0.25)}
        <div class="row" style="justify-content:space-between;margin-top:6px"><span class="sub">0%</span><span class="sub">15% goal</span><span class="sub">25% (Horizon 2)</span></div>
        <div class="sub" style="margin-top:6px">Roth TSP ${money(F.tspMonthly)} of ${money(F.basePay)} base pay = <b>${(fin.rate * 100).toFixed(1)}%</b></div>
      </div>
      <div class="box"><h3>Credit score</h3><div class="big md">${L.credit || "–"}</div><div class="sub">Target 650-700. Pull all three free reports in Nov.</div></div>
    </div>
  </div>

  <h2>Monthly cash-flow allocation <span class="h-note">A normal month from Dec 2026 · estimates, edit in data.js</span></h2>
  <div class="box">
    <div class="stack">${alloc.filter((a) => a.amt > 0).map((a) => `<div style="flex:${a.amt};background:${a.color}" data-tip="${esc(`${a.name}<br><b>${money(a.amt)}</b> · ${pctTxt(a.amt / inc)}`)}"></div>`).join("")}</div>
    <div class="legend"><span><span class="dot" style="background:${kindColor.tax}"></span>Taxes</span><span><span class="dot" style="background:${kindColor.fixed}"></span>Fixed bills</span><span><span class="dot" style="background:${kindColor.save}"></span>Saving & investing</span><span><span class="dot" style="background:var(--d-degree)"></span>Day-to-day & unassigned</span></div>
    <div class="scroll-x" style="margin-top:10px"><table class="t"><tbody>
      ${F.monthly.income.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${money(v)}</td><td></td></tr>`).join("")}
      <tr><td><b>Monthly total</b></td><td class="num"><b>${money(inc)}</b></td><td></td></tr>
      ${alloc.map((a) => `<tr><td><span class="dot" style="background:${a.color};width:8px;height:8px"></span> ${esc(a.name)}</td><td class="num">${money(a.amt)}</td><td class="num muted">${pctTxt(a.amt / inc)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="note" style="margin-top:10px">Saving & investing comes to <b>${money0(saveTotal)}</b>/month (${pctTxt(saveTotal / inc)}). About <b>${money0(rest)}</b> is left for groceries, gas and everything else; your 3-month spending log will show how much of that could go to the funding order too.</div>
  </div>

  <div class="grid g2" style="align-items:start">
    <div><h2>Net worth trend</h2><div class="box">${lineChart([{ name: "Net worth", color: c, points: nw }], { height: 190 })}</div></div>
    <div><h2>Savings goals <span class="h-note">in funding order</span></h2><div class="box">
      ${F.funds.map((f) => { const v = L.funds[f.id] || 0; const p = v / f.goal;
        return `<div class="fund"><div class="frow"><span>${esc(f.name)} ${f === nextFund ? '<span class="chip">Next up</span>' : ""}${p >= 1 ? '<span class="chip good">Full</span>' : ""}</span><span>${money0(v)} / ${money0(f.goal)} · ${pctTxt(p)}</span></div>${bar(p, c)}<div class="sub">Planned full: ${esc(f.eta)}</div></div>`; }).join("")}
      <div class="sub" style="margin-top:10px">All goals: ${money0(sum(F.funds.map((f) => L.funds[f.id] || 0)))} of ${money0(sum(F.funds.map((f) => f.goal)))} (${pctTxt(sum(F.funds.map((f) => L.funds[f.id] || 0)) / sum(F.funds.map((f) => f.goal)))})</div>
    </div></div>
  </div>

  <h2>Monthly money check-in <span class="h-note">Add a snapshot each month with your wife</span></h2>
  <div class="box">
    <form data-form="snap">
      <div class="form-grid">
        <label>Date<input type="date" name="date" value="${t}" required></label>
        ${F.funds.map((f) => `<label>${esc(f.name)}<input type="number" step="0.01" name="f_${f.id}" value="${L.funds[f.id] ?? 0}"></label>`).join("")}
        <label>Everyday accounts (total)<input type="number" step="0.01" name="cash" value="${L.cash ?? 0}"></label>
        ${Object.keys(F.debtsMeta).map((k) => `<label>${esc(F.debtsMeta[k].name)}<input type="number" step="0.01" name="d_${k}" value="${L.debts[k] ?? 0}"></label>`).join("")}
        <label>Other debt<input type="number" step="0.01" name="d_other" value="${L.debts.other ?? 0}"></label>
        <label>Credit score<input type="number" name="credit" value="${L.credit ?? ""}"></label>
        <label>Spent this month (optional)<input type="number" step="0.01" name="expenses" placeholder="from spending log"></label>
        <label>Note<input type="text" name="label" placeholder="e.g. Car paid off"></label>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary" type="submit">Save snapshot</button><span class="sub">Filled in from your latest snapshot. Update what changed.</span></div>
    </form>
    <div class="scroll-x" style="margin-top:16px"><table class="t"><thead><tr><th>Date</th><th class="num">Savings goals</th><th class="num">Everyday</th><th class="num">Debt</th><th class="num">Net worth</th><th></th></tr></thead><tbody>
      ${fin.snaps.slice().reverse().map((s) => `<tr><td>${fmt(s.date)} <span class="muted">${esc(s.label || "")}</span></td><td class="num">${money(fundsTotal(s))}</td><td class="num">${money(Number(s.cash) || 0)}</td><td class="num">${money(debtTotal(s))}</td><td class="num"><b>${money(netWorth(s))}</b></td><td>${s.builtin ? "" : `<button class="x-btn" data-act="snap-del" data-i="${s.idx}" title="Delete">×</button>`}</td></tr>`).join("")}
    </tbody></table></div>
  </div>

  <h2>Projects</h2>
  ${projectsFor("finances")}`;
};

pages.career = () => {
  const t = today(); const K = P.keyDates;
  const tisDays = daysBetween(K.paydt, t); const yrs = Math.floor(tisDays / 365.25);
  return `
  <h1>Career</h1>
  <p class="subtitle">Right now the Air Force; later, a real choice instead of a necessity.</p>
  <div class="grid g4">
    <div class="box tight"><div class="label">Rank</div><div class="big md">${esc(K.rank)}</div><div class="sub">Date of rank ${fmt(K.dor)}</div></div>
    <div class="box tight"><div class="label">Time in service</div><div class="big md">${yrs} years</div><div class="sub">Since ${fmt(K.paydt)}</div></div>
    <div class="box tight"><div class="label">Retire at 20</div><div class="big md">${plural(daysBetween(t, K.retire), "day")}</div><div class="sub">${fmt(K.retire)} · HYT ${fmt(K.hyt)} (backstop)</div></div>
    <div class="box tight"><div class="label">DEROS</div><div class="big md">${plural(daysBetween(t, K.deros), "day")}</div><div class="sub">${fmt(K.deros)} · 2029 PCS</div></div>
  </div>
  <div class="box" style="margin-top:14px"><div class="label">Path to 20</div>
    <div style="margin:10px 0 4px">${bar(daysBetween(K.paydt, t) / daysBetween(K.paydt, K.retire), domain("career").color, "thick")}</div>
    <div class="row" style="justify-content:space-between"><span class="sub">Dec 2011</span><span class="sub">MSgt target 2029</span><span class="sub">Dec 2031</span></div>
    <div class="note" style="margin-top:12px">Pension estimate with MSgt for the last 3 years: High-3 ~$6,125 → <b>~$3,063/month</b> (~$36,750/year) before taxes, in 2026 dollars. PME path: NCOA (before sew-on) → MSgt → Course 700 → SNCOA.</div>
  </div>
  <h2>Projects</h2>
  ${projectsFor("career")}`;
};

pages.education = () => {
  const t = today(); const blocks = studyBlocks(); const c = domain("degree").color;
  const start = state.studyStart || P.defaults.studyStart;
  const curB = blocks.find((b) => t >= b.start && t <= b.end);
  const real = blocks.filter((b) => !b.half);
  const doneN = real.filter((b) => state.studyDone[b.i]).length;
  return `
  <h1>Degree & Self Study</h1>
  <p class="subtitle">Finishing the biotech degree, then staying someone who keeps learning.</p>
  ${projectsFor("degree")}

  <h2>Self-study program: Year 1 <span class="h-note">British terms · two courses at a time · 14 hrs/week</span></h2>
  <div class="box">
    <div class="row" style="margin-bottom:12px"><label class="label row">Program start date <input type="date" data-act="study-start" value="${start}" style="width:auto"></label>
      <span class="sub">${doneN} of ${real.length} blocks done${curB ? ` · now: ${curB.half ? "half-term" : "Block " + curB.block}` : t < start ? ` · starts ${relDays(start)}` : ""}</span></div>
    ${bar(doneN / real.length, c)}
    <ul class="tasks" style="margin-top:8px">${blocks.map((b) => b.half
      ? `<li><span class="ongoing-dot">—</span><div class="tt"><div class="t-text muted">${esc(b.courses)}</div><div class="meta">${fmtShort(b.start)} - ${fmtShort(b.end)}</div></div></li>`
      : `<li class="${state.studyDone[b.i] ? "done" : ""}">${chk(!!state.studyDone[b.i], "study-block", `data-i="${b.i}"`)}<div class="tt"><div class="t-text">Block ${b.block}: ${esc(b.courses)}</div>
         <div class="meta"><span>${b.term} · ${b.weeks} weeks · ${fmtShort(b.start)} - ${fmt(b.end)}</span>${b === curB ? '<span class="chip good">Current block</span>' : ""}
           ${b.courses.split(" + ").map((c, ci) => { const L = (state.studyLinks || {})[`${b.i}-${ci}`] || {}; return L.url ? `<a class="chip" href="${esc(L.url)}" target="_blank" rel="noopener">${esc(c.split(" ").slice(0, 2).join(" "))} in Classroom ↗</a>` : ""; }).join("")}
           ${(state.studyLinks || {})[`${b.i}-score`] ? `<span class="chip ${Number(state.studyLinks[`${b.i}-score`]) >= 80 ? "good" : "warn"}">Self-test ${esc(state.studyLinks[`${b.i}-score`])}%</span>` : ""}</div>
         <details class="blk-links" data-key="sl-${b.i}"${isOpen("sl-" + b.i, false) ? " open" : ""}><summary>Classroom links & self-test</summary><div class="form-grid" style="margin-top:8px">
           ${b.courses.split(" + ").map((c, ci) => `<label>${esc(c.split(" ").slice(0, 2).join(" "))} Classroom link<input type="url" placeholder="https://classroom.google.com/c/…" data-act="study-link" data-k="${b.i}-${ci}" value="${esc(((state.studyLinks || {})[`${b.i}-${ci}`] || {}).url || "")}"></label>`).join("")}
           <label>Self-test score (%)<input type="number" min="0" max="100" data-act="study-score" data-k="${b.i}-score" value="${esc((state.studyLinks || {})[`${b.i}-score`] || "")}"></label>
         </div></details></div></li>`).join("")}</ul>
    <div class="note" style="margin-top:10px">Each pair: 2 days quick review → targeted study → cumulative review and self-test. Daily study and German get ticked on the daily check-in.</div>
  </div>

  <h2>The six years</h2>
  <div class="box"><ul class="timeline" style="--mc:${c}">${P.studyYears.map((y) => `<li><span class="tl-dot"></span><span class="tl-when">Year ${y.year}</span><div class="tl-body"><b>${esc(y.name)}</b><div class="sub">${esc(y.detail)}</div></div></li>`).join("")}</ul></div>

  <div class="grid g2">
    <div><h2>AF COOL order <span class="h-note">$4,500 lifetime cap</span></h2><div class="box"><ol style="padding-left:20px">${P.certifications.map((x) => `<li style="padding:4px 0">${esc(x)}</li>`).join("")}</ol></div></div>
    <div><h2>German</h2><div class="box"><ul class="timeline" style="--mc:${c}">${P.germanLevels.map((g) => `<li><span class="tl-dot"></span><div class="tl-body">${esc(g)}</div></li>`).join("")}</ul></div></div>
  </div>`;
};

pages.travel = () => {
  const t = today();
  const bucket = state.bucket || P.defaults.bucket;
  const countries = state.countries || P.defaults.countries;
  const monthsLeft = Math.max(0, Math.round(daysBetween(t, P.keyDates.deros) / 30.44));
  const c = domain("travel").color;
  return `
  <h1>Travel & Experiences</h1>
  <p class="subtitle">The living, not just the planning for later.</p>
  <div class="grid g3">
    <div class="box"><div class="label">Time left in Germany</div><div class="big md">${monthsLeft} months</div><div class="sub">DEROS ${fmt(P.keyDates.deros)} · about ${Math.floor(monthsLeft / 3)} quarters = ${Math.floor(monthsLeft / 3)} trips at one a quarter</div></div>
    <div class="box"><div class="label">Countries visited from Wiesbaden</div><div class="big md">${countries.length}</div><div class="sub">Since arriving ${fmt(P.keyDates.arrived)}</div></div>
    <a class="box" href="#bucket"><div class="label">Bucket lists</div><div class="big md">${bucket.filter((b) => b.done).length}<span class="of"> / ${bucket.length} in Europe</span></div><div class="sub">${(state.bucketAll || []).length} on the full list · open →</div></a>
  </div>
  <div class="grid g2">
    <a class="box" href="#places"><h3>Past travels</h3><div class="sub">${allTravels().length} places in ${new Set(allTravels().map((x) => x.country).filter(Boolean)).size} countries, by year, with the map →</div></a>
    <div><div class="box"><h3>Country tracker <span class="muted" style="font-weight:400">since Wiesbaden</span></h3>
      ${countries.length ? `<ul class="list-edit">${countries.map((x, i) => `<li><span class="dot" style="background:${c}"></span><span class="grow">${esc(x.name)}</span><span class="sub" style="margin:0">${x.date ? fmt(x.date) : ""}</span><button class="x-btn" data-act="country-del" data-i="${i}">×</button></li>`).join("")}</ul>` : `<div class="empty">No countries logged yet.</div>`}
      <form data-form="country" class="row" style="margin-top:10px"><input type="text" name="name" placeholder="Country" required style="flex:2"><input type="date" name="date" style="flex:1"><button class="btn" type="submit">Add</button></form>
    </div></div>
  </div>
  <h2>Projects</h2>
  ${projectsFor("travel")}`;
};

pages.community = () => `
  <h1>Community & Giving Back</h1>
  <p class="subtitle">The roots I haven't had a chance to grow yet, and the homestead-shop version of this later.</p>
  <div class="box"><div class="note">On hold until the foundation is stable. This picks up in Horizon 2 (2032-2052).</div>
  <h3 style="margin-top:16px">Waiting in Horizon 2</h3>
  <ul class="tasks">${P.later[2].filter((x) => x[0] === "community").map((x) => `<li><span class="ongoing-dot">○</span><div class="tt">${esc(x[1])}</div></li>`).join("")}</ul></div>

  <h2>Later horizons, all domains</h2>
  <div class="grid g2">${[2, 3].map((h) => `<div class="box"><h3>Horizon ${h}: ${esc(P.horizons[h - 1].name)} <span class="muted" style="font-weight:400">${P.horizons[h - 1].years}</span></h3>
    <ul class="tasks">${P.later[h].map(([d, x]) => `<li><span class="dot" style="background:${domain(d).color};margin-top:6px"></span><div class="tt">${esc(x)}</div></li>`).join("")}</ul></div>`).join("")}</div>`;

/* ---------- artifacts ---------- */
function inlineMd(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
}
function mdToHtml(md) {
  const lines = String(md || "").replace(/\r/g, "").split("\n");
  let out = "", i = 0;
  const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^### /.test(l)) { out += `<h4>${inlineMd(l.slice(4))}</h4>`; i++; continue; }
    if (/^## /.test(l)) { out += `<h3>${inlineMd(l.slice(3))}</h3>`; i++; continue; }
    if (/^> /.test(l)) { let t = []; while (i < lines.length && /^> /.test(lines[i])) t.push(lines[i++].slice(2)); out += `<div class="note">${inlineMd(t.join(" "))}</div>`; continue; }
    if (/^\|/.test(l.trim())) {
      const rows = []; while (i < lines.length && /^\|/.test(lines[i].trim())) { const r = cells(lines[i++]); if (!r.every((c) => /^:?-+:?$/.test(c))) rows.push(r); }
      const head = rows[0].every((c) => !c) ? null : rows[0];
      const body = rows.slice(1);
      out += `<div class="scroll-x"><table class="t">${head ? `<thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${body.map((r) => `<tr>${r.map((c, ci) => `<td>${ci === 0 && !head ? `<b>${inlineMd(c)}</b>` : inlineMd(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      continue;
    }
    if (/^- /.test(l)) { let t = []; while (i < lines.length && /^- /.test(lines[i])) t.push(lines[i++].slice(2)); out += `<ul>${t.map((x) => /^\[[ x]\] /.test(x) ? `<li class="cb">${x[1] === "x" ? "☑" : "☐"} ${inlineMd(x.slice(4))}</li>` : `<li>${inlineMd(x)}</li>`).join("")}</ul>`; continue; }
    if (/^\d+\. /.test(l)) { let t = []; while (i < lines.length && /^\d+\. /.test(lines[i])) t.push(lines[i++].replace(/^\d+\. /, "")); out += `<ol>${t.map((x) => `<li>${inlineMd(x)}</li>`).join("")}</ol>`; continue; }
    let t = []; while (i < lines.length && lines[i].trim() && !/^(#{2,3} |> |\||- |\d+\. )/.test(lines[i].trim())) t.push(lines[i++]);
    out += `<p>${inlineMd(t.join(" "))}</p>`;
  }
  return out;
}
function programTables(prog) {
  const t = today();
  const days = DAYS.filter((d) => prog.weeks.some((w) => w[d]));
  return `<h3>Weekly skeleton</h3><div class="scroll-x"><table class="t"><tbody>${Object.entries(prog.skeleton).map(([d, x]) => `<tr><td><b>${d}</b></td><td>${esc(x)}</td></tr>`).join("")}</tbody></table></div>
    <h3>Modules</h3><div class="scroll-x"><table class="t"><thead><tr><th>Module</th><th>Weeks</th><th>Dates</th><th>Focus</th></tr></thead><tbody>${prog.modules.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td>${m.weeks[0] === m.weeks[1] ? m.weeks[0] : m.weeks[0] + "-" + m.weeks[1]}</td><td>${fmtShort(addDays(prog.start, (m.weeks[0] - 1) * 7))} - ${fmtShort(addDays(prog.start, m.weeks[1] * 7 - 1))}</td><td>${esc(m.note || "")}</td></tr>`).join("")}</tbody></table></div>
    <h3>Week by week</h3>
    <div class="scroll-x"><table class="t wbw"><thead><tr><th>Wk</th>${days.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>
    ${prog.weeks.map((w, wi) => { const ws = addDays(prog.start, wi * 7); const now = t >= ws && t <= addDays(ws, 6);
      return `<tr class="${now ? "now-row" : ""}"><td><b>${wi + 1}</b><div class="sub">${fmtShort(ws)}</div></td>${days.map((d) => { const date = addDays(prog.start, wi * 7 + DAYS.indexOf(d)); const on = state.sessions[`${prog.id}|${date}`]; return `<td>${w[d] ? `${on ? '<span class="good">✓</span> ' : ""}${esc(w[d])}` : '<span class="muted">Rest</span>'}</td>`; }).join("")}</tr>`; }).join("")}
    </tbody></table></div>`;
}
const ARTIFACT_BUILD = {
  meals: () => {
    const M = P.macros; const names = { B: "Breakfast", L: "Lunch", D: "Dinner", S: "Protein snack" };
    const cal = []; for (let w = 1; w <= 53; w++) cal.push(w);
    return `<h3>Daily targets</h3><div class="scroll-x"><table class="t"><tbody><tr><td><b>Calories</b></td><td>${M.kcal.toLocaleString()} kcal</td><td><b>Protein</b></td><td>${M.protein} g</td><td><b>Carbs</b></td><td>${M.carbs} g</td><td><b>Fat</b></td><td>${M.fat} g</td></tr></tbody></table></div>
    <h3>Weekly menus</h3><p>20 day-menus, 5 per season; each week repeats one menu. B = Breakfast, L = Lunch, D = Dinner, S = Protein snack.</p>
    ${["Winter", "Spring", "Summer", "Autumn"].map((season) => `<h4>${season}</h4><div class="menu-grid">${Object.keys(P.menus).filter((c) => seasonOf(c)[0] === season).map((code) => { const tt = menuTotals(code);
      return `<div class="menu-card"><div class="row" style="justify-content:space-between"><b><span class="season" style="background:${seasonOf(code)[1]}"></span>Menu ${code}</b><span class="sub" style="margin:0">${tt.kcal} kcal · ${tt.p}P/${tt.c}C/${tt.f}F</span></div>
        ${P.menus[code].map((r) => `<div class="menu-line"><span class="muted">${r[0]}</span><span>${esc(r[1])}</span><span class="muted num">${r[2]}</span></div>`).join("")}</div>`; }).join("")}</div>`).join("")}
    <h3>Week-by-week calendar (ISO weeks)</h3>
    <div class="scroll-x"><table class="t cal"><thead><tr><th>Week</th><th>Starts (${isoWeek(today()).y})</th><th>Season</th><th>Menu</th><th>Week</th><th>Starts</th><th>Season</th><th>Menu</th></tr></thead><tbody>
    ${cal.slice(0, 27).map((w, i) => { const w2 = cal[i + 27]; const y = isoWeek(today()).y; const cell = (wk) => wk && wk <= weeksInYear(y) ? `<td><b>${wk}</b></td><td>${fmtShort(isoMonday(y, wk))}</td><td>${seasonOf(P.mealCalendar[wk])[0]}</td><td>${P.mealCalendar[wk]}</td>` : wk ? `<td><b>${wk}</b></td><td class="muted">only in 53-week years</td><td>${seasonOf(P.mealCalendar[wk])[0]}</td><td>${P.mealCalendar[wk]}</td>` : "<td></td><td></td><td></td><td></td>";
      return `<tr>${cell(w)}${cell(w2)}</tr>`; }).join("")}
    </tbody></table></div>`;
  },
  pt: () => programTables(P.programs.find((p) => p.id === "pt")),
  sprint: () => programTables(P.programs.find((p) => p.id === "sprint")),
  study: () => {
    const blocks = studyBlocks(); const t = today();
    return `<h3>Overview</h3><div class="scroll-x"><table class="t"><tbody>${P.studyYears.map((y) => `<tr><td><b>Year ${y.year}</b></td><td>${esc(y.name)}</td></tr>`).join("")}</tbody></table></div>
    <h3>Year 1: Biotech refresher (block sequence)</h3><p>Dates run from the start date set on the Education page (${fmt(state.studyStart || P.defaults.studyStart)}).</p>
    <div class="scroll-x"><table class="t"><thead><tr><th>Term</th><th>Block</th><th>Weeks</th><th>Dates</th><th>Courses</th></tr></thead><tbody>
    ${blocks.map((b) => `<tr class="${t >= b.start && t <= b.end ? "now-row" : ""}"><td>${b.term}</td><td>${b.half ? "—" : b.block}</td><td>${b.weeks}</td><td>${fmtShort(b.start)} - ${fmtShort(b.end)}</td><td>${b.half ? `<span class="muted">${esc(b.courses)}</span>` : `${state.studyDone[b.i] ? '<span class="good">✓</span> ' : ""}${esc(b.courses)}`}</td></tr>`).join("")}
    </tbody></table></div>`;
  },
};
pages.artifacts = (id) => {
  const list = window.ARTIFACTS || [];
  const a = id && list.find((x) => x.id === id);
  if (a) {
    const d = domain(a.domain);
    return `<div class="no-print" style="margin-bottom:14px"><a href="#artifacts">‹ All artifacts</a></div>
    <div class="row" style="align-items:flex-start;justify-content:space-between;gap:16px">
      <div><div class="row" style="gap:8px;margin-bottom:6px"><span class="dot" style="background:${d.color}"></span><span class="label">${esc(d.name)}</span>${a.status === "ready" ? "" : '<span class="chip">Not written yet</span>'}</div>
      <h1>${esc(a.title)}</h1><p class="subtitle" style="margin-bottom:6px">${esc(a.summary)}</p>
      ${a.source ? `<div class="sub">Original file: ${esc(a.source)}</div>` : ""}</div>
      <div class="row no-print">${a.link ? `<a class="btn" href="${a.link}">Open tracker</a>` : ""}${a.status === "ready" ? `<button class="btn" data-act="print">Print / save PDF</button>` : ""}</div>
    </div>
    <article class="box doc" style="margin-top:18px">
      ${a.status === "ready" ? (() => { const md = a.md ? mdToHtml(a.md) : ""; const gen = a.build && ARTIFACT_BUILD[a.build] ? ARTIFACT_BUILD[a.build]() : ""; return a.buildFirst ? gen + md : md + gen; })()
        : `<div class="empty">This plan hasn't been written yet. When it's ready, paste it into its entry in <code>artifacts.js</code> and set <code>status: "ready"</code>, or send it to Claude to add.</div>`}
    </article>`;
  }
  const ready = list.filter((x) => x.status === "ready").length;
  return `<h1>Artifacts</h1>
  <p class="subtitle">Every plan document behind Project Me. ${ready} written, ${list.length - ready} still to come.</p>
  ${P.domains.filter((d) => list.some((x) => x.domain === d.id)).map((d) => `
    <h2><span class="dot" style="background:${d.color}"></span>${esc(d.name)}</h2>
    <div class="grid cards">${list.filter((x) => x.domain === d.id).map((x) => `
      <a class="box art-card ${x.status}" href="#artifacts/${x.id}">
        <div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 style="margin:0">${esc(x.title)}</h3>${x.status === "ready" ? '<span class="chip good">Ready</span>' : '<span class="chip">To write</span>'}</div>
        <div class="sub" style="font-size:13px">${esc(x.summary)}</div>
      </a>`).join("")}</div>`).join("")}`;
};

/* ---------- calendar ---------- */
const CALS = [
  { id: "mine", name: "My appointments", color: "#7A1C1C" },
  { id: "rhythm", name: "Daily rhythm", color: "var(--neutral-series)" },
  { id: "garmin", name: "Garmin activities", color: "#3B6E7E" },
  { id: "training", name: "Workout block", color: "#2C5566" },
  { id: "tasks", name: "Task deadlines", color: "var(--d-career)" },
  { id: "study", name: "School / study block", color: "#A0533F" },
  { id: "family", name: "2-2-2 rule", color: "var(--d-family)" },
  { id: "key", name: "Key dates & pay", color: "var(--cal-key)" },
  { id: "meals", name: "Meal plan weeks", color: "var(--d-finances)" },
  { id: "moon", name: "Moon phases", color: "var(--moon-ink)" },
  { id: "wheel", name: "Wheel of the Year", color: "var(--copper)" },
];
/* Google Calendar (read-only, via /api/gcal) */
const gcal = { connected: null, calendars: [], events: {}, windows: [], loading: false, errors: [] };
const GCOL = [[/workout/i, "#1F3E4A"], [/work/i, "#D49C64", true], [/study|school|libs|math|biol|chem|class/i, "#A0533F"], [/important/i, "#7A1C1C"], [/amanda/i, "#6B6FB5"], [/birthday/i, "#3A8F5C"], [/holiday/i, "#2A8C8C"], [/meal/i, "#4F7A33"], [/task/i, "#B03A2E"], [/moon/i, "#5F5A7E"], [/appointment/i, "#7E97A0"]];
const gColor = (name, i) => { const m = GCOL.find(([re]) => re.test(name)); return m ? { c: m[1], dark: !!m[2] } : { c: ["#7E97A0", "#6B6FB5", "#3A8F5C", "#A0533F", "#2A8C8C"][i % 5], dark: false }; };
function gcalEnsure(a, b) {
  if (!apiAvailable() || gcal.loading || gcal.connected === false) return;
  if (gcal.windows.some(([x, y]) => x <= a && y >= b)) return;
  const from = addDays(a, -35), to = addDays(b, 35); gcal.loading = true;
  fetch(`api/gcal?from=${from}&to=${to}`, { credentials: "same-origin", cache: "no-store" })
    .then((r) => r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : Promise.reject())
    .then((j) => { gcal.connected = !!j.connected; gcal.calendars = j.calendars || []; gcal.errors = j.errors || []; (j.events || []).forEach((e) => { gcal.events[e.id] = e; }); gcal.windows.push([from, to]); })
    .catch(() => { gcal.connected = gcal.connected || null; gcal.windows.push([from, to]); })
    .finally(() => { gcal.loading = false; render(); });
}
/* Garmin (read-only, via /api/garmin) */
const garmin = { connected: null, ok: null, error: "", days: {}, acts: {}, windows: [], loading: false, errors: {}, shapes: {}, fetchedAt: null };
const GARMIN_WORKOUT = /run|strength|cycl|bik|swim|hiit|cardio|treadmill|track|elliptical|rowing|fitness_equipment|training/i;
function garminEnsure(a, b, fresh) {
  if (!apiAvailable() || garmin.connected === false) return;
  const t = today(); if (b > t) b = t; if (a > b) return;
  if (!fresh && garmin.windows.some(([x, y]) => x <= a && y >= b)) return;
  if (garmin.loading) return;
  if (daysBetween(a, b) > 30) a = addDays(b, -30);
  garmin.loading = true;
  fetch(`api/garmin?from=${a}&to=${b}${fresh ? "&fresh=1" : ""}`, { credentials: "same-origin", cache: "no-store" })
    .then((r) => r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : Promise.reject())
    .then((j) => {
      garmin.connected = !!j.connected; garmin.ok = j.ok !== false; garmin.error = j.error || "";
      (j.days || []).forEach((d) => { garmin.days[d.date] = { ...(garmin.days[d.date] || {}), ...d }; });
      (j.activities || []).forEach((x) => { garmin.acts[x.id] = x; });
      garmin.errors = j.errors || {}; garmin.shapes = j.shapes || {}; garmin.fetchedAt = j.fetchedAt || Date.now();
      garmin.windows.push([a, b]); garminAutoTick();
    })
    .catch(() => { garmin.windows.push([a, b]); })
    .finally(() => { garmin.loading = false; render(); });
}
const garminActsOn = (d) => Object.values(garmin.acts).filter((x) => x.date === d).sort((p, q) => p.start.localeCompare(q.start));
const actLabel = (x) => `${x.name || x.type.replace(/_/g, " ")}${x.distanceKm ? ` · ${x.distanceKm} km` : ""}${x.durationMin ? ` · ${x.durationMin} min` : ""}${x.avgHR ? ` · avg HR ${x.avgHR}` : ""}`;
function garminAutoTick() {
  state.garminSeen = state.garminSeen || {}; let changed = false;
  Object.values(garmin.acts).forEach((x) => {
    if (state.garminSeen[x.id] || !GARMIN_WORKOUT.test(x.type)) return;
    const s = activeSession(x.date); state.garminSeen[x.id] = true; changed = true;
    if (s && s.text && !state.sessions[s.key]) state.sessions[s.key] = true;
  });
  if (changed) commit(false);
}
const hm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const calOn = (id) => !((state.calHidden || { meals: true })[id]);
const calOf = (id) => CALS.find((c) => c.id === id);
const cal = { view: null, date: null, modal: null };
const mondayOf = (s) => { const d = parseD(s); const back = (d.getDay() + 6) % 7; return addDays(s, -back); };
const addMin = (t, m) => { const x = Math.round(toMin(t) + m); return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const fmtTime = (t) => t || "";
function rule222Dates() {
  const start = state.rule222.start || P.defaults.rule222Start;
  const dn = []; for (let d = start, i = 0; i < 200 && d <= P.keyDates.retire; i++, d = addDays(d, 14)) dn.push(d);
  const wk = []; for (let d = addMonths(start, 2), i = 0; i < 40 && d <= addMonths(P.keyDates.retire, 2); i++, d = addMonths(d, 2)) wk.push(d);
  const vac = []; for (let d = addMonths(start, 24), i = 0; i < 3; i++, d = addMonths(d, 24)) vac.push(d);
  return { start, dn, wk, vac };
}
function expandRepeat(e, a, b, stepFn) {
  const out = []; let d = e.date; let n = 0;
  const len = e.end ? daysBetween(e.date, e.end) : 0;
  while (d <= b && n++ < 3000) { const end = addDays(d, len); if (end >= a) out.push({ date: d, end: len ? end : null }); d = stepFn(d, n); }
  return out;
}
function calendarEvents(a, b) {
  const ev = [];
  const inR = (d, end) => d <= b && (end || d) >= a;
  const t0 = today();
  if (calOn("tasks")) countable(TASKS).forEach((t) => {
    if (!t.d || !inR(t.d) || !exactDue(t)) return;
    const st = status(t);
    ev.push({ id: "task:" + t.id, kind: "task", ref: t.id, cal: "tasks", date: t.d, title: t.t, color: domain(t.domain).color, done: st === "done",
      sub: `Due ${t.due} · ${t.project.title}`, link: "#" + ROUTES.find((r) => r.dom === t.domain).id });
  });
  if (calOn("training")) P.programs.forEach((prog) => prog.weeks.forEach((w, wi) => DAYS.forEach((dn, di) => {
    if (!w[dn]) return; const date = addDays(prog.start, wi * 7 + di); if (!inR(date)) return;
    const key = `${prog.id}|${date}`;
    const slot = (window.DAILY_RHYTHM || []).find((r) => r.kind === "workout" && r.days.includes(dn));
    ev.push({ id: "sess:" + key, kind: "session", ref: key, cal: "training", date, title: w[dn], color: calOf("training").color, done: !!state.sessions[key],
      time: slot ? slot.start : null, endTime: slot ? slot.end : null, sub: `${prog.name} · week ${wi + 1}`, link: "#training" });
  })));
  if (calOn("study")) studyBlocks().forEach((bl) => {
    if (bl.half) { if (inR(bl.start, bl.end)) ev.push({ id: "study:" + bl.i, kind: "info", cal: "study", date: bl.start, end: bl.end, title: "Half-term: flashcards only", color: calOf("study").color, sub: "Self-study program", link: "#education" }); return; }
    if (inR(bl.start)) ev.push({ id: "study:" + bl.i, kind: "study", ref: bl.i, cal: "study", date: bl.start, title: `Block ${bl.block} starts: ${bl.courses}`, color: calOf("study").color, done: !!state.studyDone[bl.i], sub: `${bl.term} · ${bl.weeks} weeks · ends ${fmt(bl.end)}`, link: "#education" });
  });
  if (calOn("study")) { const bls = studyBlocks(); const last = bls[bls.length - 1];
    for (let d = a < bls[0].start ? bls[0].start : a; d <= b && d <= last.end; d = addDays(d, 1)) {
      const bl = bls.find((x) => d >= x.start && d <= x.end); const dn = dowOf(d);
      (window.DAILY_RHYTHM || []).filter((r) => r.kind === "study" && r.days.includes(dn)).forEach((r) => {
        const base = { kind: "habit", ref: `${d}|study`, cal: "study", date: d, color: calOf("study").color, done: habitDone(d, "study"), link: "#education" };
        if (bl.half) { ev.push({ ...base, id: `st:${d}`, title: "Flashcards (half-term)", time: r.start, endTime: addMin(r.start, 30), sub: "Half-term week: rest, light review, flashcards only." }); return; }
        const parts = bl.courses.split(" + "); const len = (toMin(r.end) - toMin(r.start)) / parts.length;
        parts.forEach((c, i) => ev.push({ ...base, link: ((state.studyLinks || {})[`${bl.i}-${i}`] || {}).url || "#education", id: `st:${d}:${i}`, title: c, time: addMin(r.start, len * i), endTime: addMin(r.start, len * (i + 1)), sub: `Block ${bl.block} · ${bl.term} term · ${Math.round(len / 60 * 10) / 10} hr` }));
      });
    }
  }
  if (calOn("rhythm")) for (let d = a; d <= b; d = addDays(d, 1)) { const dn = dowOf(d);
    (window.DAILY_RHYTHM || []).filter((r) => r.days.includes(dn) && (r.kind === "habit" || r.kind === "block") && !(r.google && gcal.connected)).forEach((r, i) => {
      const hab = r.kind === "habit";
      ev.push({ id: `rh:${d}:${r.title}`, kind: hab ? "habit" : "info", ref: hab ? `${d}|${r.habit}` : null, cal: "rhythm", date: d, title: r.title, time: r.start, endTime: r.end,
        color: r.color || "var(--neutral-series)", dark: !!r.dark,
        done: hab ? habitDone(d, r.habit) : false, block: !r.color && !hab, sub: hab ? (r.habit === "read" ? HABITS.find((h) => h.id === "read").sub(d) : "Ticks off on the daily check-in") : "" });
    });
  }
  if (calOn("family")) { const r = rule222Dates(); const done = state.rule222.done;
    r.dn.forEach((d) => inR(d) && ev.push({ id: "r222:dn:" + d, kind: "r222", ref: "dn:" + d, cal: "family", date: d, title: "Date night", color: calOf("family").color, done: !!done["dn:" + d], sub: "2-2-2 rule: every 2 weeks", link: "#family" }));
    r.wk.forEach((d) => inR(d) && ev.push({ id: "r222:wk:" + d, kind: "r222", ref: "wk:" + d, cal: "family", date: d, title: "Weekend away (by today)", color: calOf("family").color, done: !!done["wk:" + d], sub: "2-2-2 rule: every 2 months", link: "#family" }));
    r.vac.forEach((d) => inR(d) && ev.push({ id: "r222:vac:" + d, kind: "r222", ref: "vac:" + d, cal: "family", date: d, title: "Week away (by today)", color: calOf("family").color, done: !!done["vac:" + d], sub: "2-2-2 rule: every 2 years", link: "#family" }));
  }
  if (calOn("key")) (window.CALENDAR_DATES || []).forEach((k, ki) => {
    const base = { kind: "info", cal: "key", title: k.title, color: calOf("key").color, sub: k.note || "", time: k.time || null };
    if (k.repeat === "monthly" || k.repeat === "quarterly") {
      const from = k.from || "2026-01-01"; let d = from.slice(0, 8) + pad(k.day || 1); if (d < from) d = addMonths(d, 1);
      const step = k.repeat === "quarterly" ? 3 : 1;
      if (k.repeat === "quarterly") { while ((parseD(d).getMonth()) % 3 !== 0) d = addMonths(d, 1); }
      for (let n = 0; d <= b && n < 400; n++, d = addMonths(d, step)) if (d >= a) ev.push({ ...base, id: `key:${ki}:${d}`, date: d });
    } else if (k.repeat === "yearly") {
      for (let d = k.date, n = 0; d <= b && n < 60; n++, d = addMonths(d, 12)) if (d >= a) ev.push({ ...base, id: `key:${ki}:${d}`, date: d });
    } else if (inR(k.date, k.end)) ev.push({ ...base, id: `key:${ki}`, date: k.date, end: k.end || null });
  });
  if (calOn("meals")) { for (let d = mondayOf(a); d <= b; d = addDays(d, 7)) { const m = menuForDate(d); ev.push({ id: "meal:" + d, kind: "info", cal: "meals", date: d, title: `Menu ${m} week`, color: calOf("meals").color, sub: `${menuTotals(m).kcal} kcal in meals · target ${P.macros.kcal}`, link: "#meals" }); } }
  if (calOn("moon")) moonEvents(a, b).forEach((mo) => ev.push({ id: `moon:${mo.date}:${mo.full ? "f" : "n"}`, kind: "info", cal: "moon", date: mo.date,
    title: `${mo.full ? "○ Full moon" : "● New moon"} ${mo.time}`, color: calOf("moon").color, sub: mo.full ? "Full moon: completion, gratitude, release." : "New moon: intentions and fresh starts." }));
  if (calOn("wheel")) sabbatsBetween(a, b).forEach((sb) => ev.push({ id: `wheel:${sb.date}`, kind: "info", cal: "wheel", date: sb.date, title: sb.name, color: calOf("wheel").color, sub: sb.desc }));
  if (garmin.connected && calOn("garmin")) Object.values(garmin.acts).forEach((x) => {
    if (!inR(x.date)) return; const st = x.start.slice(11, 16);
    ev.push({ id: "gar:" + x.id, kind: "info", cal: "garmin", date: x.date, title: "⌚ " + (x.name || x.type.replace(/_/g, " ")), time: st || null, endTime: st && x.durationMin ? addMin(st, Math.max(15, x.durationMin)) : null,
      color: "#3B6E7E", sub: `From Garmin: ${actLabel(x)}${x.calories ? ` · ${x.calories} kcal` : ""}` });
  });
  if (gcal.connected) Object.values(gcal.events).forEach((g) => {
    if (!calOn("g:" + g.cal)) return; const gi = (gcal.calendars.find((c) => c.name === g.cal) || {}).index || 0; const col = gColor(g.cal, gi);
    const base = { id: "g:" + g.id, kind: "info", cal: "g:" + g.cal, title: g.title, color: col.c, dark: col.dark, sub: [g.location, g.notes].filter(Boolean).join("\n"), google: true };
    if (g.allDay) { const end = g.days > 1 ? addDays(g.start, g.days - 1) : null; if (inR(g.start, end)) ev.push({ ...base, date: g.start, end }); return; }
    const sd = iso(new Date(g.start)), ed = iso(new Date(g.end - 1));
    if (!inR(sd, ed)) return;
    if (sd === ed || g.end - g.start < 86400000) ev.push({ ...base, date: sd, time: hm(g.start), endTime: sd === ed ? hm(g.end) : "23:59" });
    else ev.push({ ...base, date: sd, end: ed });
  });
  if (calOn("mine")) (state.calendar || []).forEach((e) => {
    const color = e.cal && e.cal !== "mine" && domain(e.cal) ? domain(e.cal).color : calOf("mine").color;
    const steps = { weekly: (d) => addDays(d, 7), biweekly: (d) => addDays(d, 14), monthly: (d, n) => addMonths(e.date, n), yearly: (d, n) => addMonths(e.date, 12 * n) };
    const occ = e.repeat && steps[e.repeat] ? expandRepeat(e, a, b, steps[e.repeat]) : (inR(e.date, e.end) ? [{ date: e.date, end: e.end || null }] : []);
    occ.forEach((o) => ev.push({ id: `u:${e.id}@${o.date}`, kind: "user", ref: e.id, cal: "mine", date: o.date, end: o.end, title: e.title, color,
      time: e.allDay ? null : e.start || null, endTime: e.allDay ? null : e.endT || null, sub: e.notes || "" }));
  });
  ev.forEach((e) => { if (e.end && e.end <= e.date) e.end = null; e.past = (e.end || e.date) < t0; });
  return ev;
}
const exactDue = (t) => /\b\d{1,2} [A-Z][a-z]{2,3} \d{4}\b/.test(t.due || "");
function monthStrip(ym) {
  if (!calOn("tasks")) return "";
  const list = countable(TASKS).filter((t) => t.d && t.d.startsWith(ym) && !exactDue(t)).sort((x, y) => (status(x) === "done") - (status(y) === "done") || x.domain.localeCompare(y.domain));
  if (!list.length) return "";
  const done = list.filter((t) => status(t) === "done").length; const k = "due-" + ym;
  return `<details class="box tight due-strip" data-key="${k}" ${isOpen(k, false) ? "open" : ""}><summary><span class="caret">▸</span> <b>Due in ${fmt(ym + "-01", { month: "long", year: "numeric" })}</b> <span class="muted">· ${plural(list.length, "task")} without a set day · ${done} done</span></summary>
    <ul class="tasks" style="margin-top:6px">${list.map((t) => taskRow(t, { showProject: true })).join("")}</ul></details>`;
}
function eventsByDay(list, a, b) {
  const map = {};
  list.forEach((e) => { for (let d = e.date < a ? a : e.date, n = 0; d <= (e.end || e.date) && d <= b && n < 400; d = addDays(d, 1), n++) (map[d] = map[d] || []).push(e); });
  const order = (e) => (e.cal === "wheel" ? -2 : e.cal === "moon" ? -1 : e.end ? 0 : e.time ? 2 : 1);
  Object.values(map).forEach((arr) => arr.sort((x, y) => order(x) - order(y) || (toMin(x.time) || 0) - (toMin(y.time) || 0) || (x.done - y.done) || x.title.localeCompare(y.title)));
  return map;
}
function chip(e, d) {
  const cont = e.end && d && d !== e.date; const tip = esc(`<b>${esc(e.title)}</b>${e.time ? "<br>" + e.time + (e.endTime ? "-" + e.endTime : "") : ""}${e.sub ? "<br>" + esc(e.sub) : ""}`);
  if (e.time) return `<button class="ev timed ${e.done ? "done" : ""}" data-act="cal-ev" data-id="${esc(e.id)}" data-tip="${tip}"><span class="dot" style="background:${e.color};width:8px;height:8px"></span><span class="evt">${e.time}</span> <span class="evn">${esc(e.title)}</span></button>`;
  return `<button class="ev ${e.done ? "done" : ""} ${e.end ? "span" : ""}" style="--ec:${e.color}" data-act="cal-ev" data-id="${esc(e.id)}" data-tip="${tip}">${e.done ? "✓ " : ""}${cont ? "↳ " : ""}<span class="evn">${esc(e.title)}</span></button>`;
}
function miniMonth(anchor) {
  const first = anchor.slice(0, 8) + "01"; const start = mondayOf(first); const t = today();
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return `<div class="minical"><div class="mini-head"><b>${fmt(first, { month: "long", year: "numeric" })}</b><span><button class="x-btn" data-act="cal-mini" data-n="-1">‹</button><button class="x-btn" data-act="cal-mini" data-n="1">›</button></span></div>
    <div class="mini-grid">${["M", "T", "W", "T", "F", "S", "S"].map((x) => `<span class="mh">${x}</span>`).join("")}${days.map((d) => `<button data-act="cal-pick" data-date="${d}" class="${d.slice(0, 7) !== first.slice(0, 7) ? "out" : ""} ${d === t ? "today" : ""} ${d === cal.date ? "sel" : ""}">${parseD(d).getDate()}</button>`).join("")}</div></div>`;
}
let miniAnchor = null;
function calModal() {
  const m = cal.modal; if (!m) return "";
  if (m.mode === "form") {
    const e = m.ev || {}; const allDay = e.allDay !== false && !e.start ? (m.time ? false : (e.allDay ?? true)) : !!e.allDay;
    const startT = e.start || m.time || "09:00"; const endT = e.endT || (m.time ? pad(Math.min(23, Number(m.time.slice(0, 2)) + 1)) + ":00" : "10:00");
    return `<div class="modal-bg" data-act="cal-close"><div class="modal" data-act="noop" role="dialog" aria-label="${e.id ? "Edit event" : "New event"}">
      <form data-form="calev" class="${allDay ? "allday" : ""}">
        <input type="text" name="title" value="${esc(e.title || "")}" placeholder="Add title" class="title-in" required autofocus>
        <div class="form-grid" style="margin-top:12px">
          <label>Date<input type="date" name="date" value="${e.date || m.date || today()}" required></label>
          <label>Ends (multi-day)<input type="date" name="end" value="${e.end || ""}"></label>
          <label class="tf">Start time<input type="time" name="start" value="${startT}"></label>
          <label class="tf">End time<input type="time" name="endT" value="${endT}"></label>
        </div>
        <label class="row" style="margin-top:10px;font-size:14px"><input type="checkbox" name="allDay" data-act="cal-allday" ${allDay ? "checked" : ""} style="width:auto"> All day</label>
        <div class="form-grid" style="margin-top:10px">
          <label>Calendar / colour<select name="cal"><option value="mine">My events</option>${P.domains.map((d) => `<option value="${d.id}" ${e.cal === d.id ? "selected" : ""}>${esc(d.short)}</option>`).join("")}</select></label>
          <label>Repeat<select name="repeat">${[["", "Does not repeat"], ["weekly", "Every week"], ["biweekly", "Every 2 weeks"], ["monthly", "Every month"], ["yearly", "Every year"]].map(([v, l]) => `<option value="${v}" ${(e.repeat || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        </div>
        <label style="display:block;margin-top:10px;font-size:12.5px;color:var(--text-2)">Notes<textarea name="notes" placeholder="Location, details...">${esc(e.notes || "")}</textarea></label>
        <div class="row" style="margin-top:14px;justify-content:flex-end"><button type="button" class="btn" data-act="cal-close">Cancel</button><button class="btn primary" type="submit">Save</button></div>
        ${e.id ? `<input type="hidden" name="id" value="${esc(e.id)}">` : ""}
      </form></div></div>`;
  }
  const e = (cal._evs || []).find((x) => x.id === m.id) || m.ev; if (!e) return ""; const c = calOf(e.cal);
  const when = `${fmtLong(e.date)}${e.end ? " – " + fmtLong(e.end) : ""}${e.time ? " · " + e.time + (e.endTime ? " – " + e.endTime : "") : ""}`;
  const user = e.kind === "user" && (state.calendar || []).find((x) => x.id === e.ref);
  const canTick = ["task", "session", "r222", "study", "habit"].includes(e.kind);
  return `<div class="modal-bg" data-act="cal-close"><div class="modal" data-act="noop" role="dialog">
    <div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="dot" style="background:${e.color};width:14px;height:14px;margin-top:6px"></span><h3 style="font-size:19px;margin:0">${esc(e.title)}</h3></div><button class="x-btn" data-act="cal-close" aria-label="Close">×</button></div>
    <div class="sub" style="font-size:14px;margin:8px 0 0 24px">${when}</div>
    ${user && user.repeat ? `<div class="sub" style="margin-left:24px">Repeats ${({ weekly: "every week", biweekly: "every 2 weeks", monthly: "every month", yearly: "every year" })[user.repeat]}</div>` : ""}
    ${e.sub ? `<p style="margin:12px 0 0 24px;white-space:pre-line">${esc(e.sub)}</p>` : ""}
    <div class="sub" style="margin:12px 0 0 24px">${e.google ? `Google Calendar · ${esc(e.cal.slice(2))} · edit it in Google Calendar` : c ? c.name : ""}${e.done ? ' · <span class="good">Done ✓</span>' : ""}</div>
    <div class="row" style="margin-top:16px;justify-content:flex-end">
      ${e.link ? (/^https:/.test(e.link) ? `<a class="btn" href="${esc(e.link)}" target="_blank" rel="noopener">Open in Classroom ↗</a>` : `<a class="btn" href="${e.link}">Open page</a>`) : ""}
      ${canTick ? `<button class="btn ${e.done ? "" : "primary"}" data-act="cal-tick">${e.done ? "Mark not done" : "Mark done"}</button>` : ""}
      ${user ? `<button class="btn danger" data-act="cal-del">Delete${user.repeat ? " series" : ""}</button><button class="btn primary" data-act="cal-edit">Edit</button>` : ""}
    </div></div></div>`;
}

function wheelSection(t) {
  const m = moonNow(); const sb = sabbatOn(t); const nx = nextSabbat(t); const last = lastSabbat(t);
  const code = menuForDate(t); const season = seasonOf(code)[0]; const menu = P.menus[code] || [];
  const nextPh = moonEvents(t, addDays(t, 10), true).find((e) => e.date > t || (e.date === t && e.time > `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`));
  const dish = (k) => (menu.find((r) => r[0] === k) || [])[1];
  return `<h2>The moon &amp; the wheel</h2>
  <div class="grid g3">
    <div class="box wheel-card"><div class="row" style="flex-wrap:nowrap;gap:16px">${moonSVG(m.age, 64)}
      <div><div class="label">Tonight's moon</div><div class="big md">${m.name}</div><div class="sub">${Math.round(m.illum * 100)}% lit · ${m.age < 0.5 ? "waxing" : "waning"}</div>
      ${nextPh ? `<div class="sub">${nextPh.name === m.name ? `Exactly ${nextPh.name.toLowerCase()} at ${nextPh.time}${nextPh.date === t ? " today" : ""}` : `Next: ${nextPh.icon} ${nextPh.name}, ${nextPh.date === t ? "today" : fmt(nextPh.date, { weekday: "short", day: "numeric", month: "short" })} ${nextPh.time}`}</div>` : ""}</div></div></div>
    <div class="box wheel-card ${sb ? "is-sabbat" : ""}"><div class="label">${sb ? "Today on the wheel" : "Next on the wheel"}</div>
      <div class="big md">${sb ? sb.name : nx.name}</div>
      <div class="sub">${sb ? esc(sb.desc) : `${fmt(nx.date, { day: "numeric", month: "long" })} · ${relDays(nx.date)}`}</div>
      ${sb ? `<div class="sub" style="margin-top:6px">Next: ${nx.name}, ${fmt(nx.date, { day: "numeric", month: "long" })}</div>` : `<div class="sub" style="margin-top:6px">${esc(nx.desc)}</div>`}</div>
    <a class="box wheel-card" href="#meals"><div class="label">This season's table</div><div class="big md">${season} · ${code}</div>
      <div class="sub">${[["B", "Breakfast"], ["L", "Lunch"], ["D", "Dinner"]].filter(([k]) => dish(k)).map(([k, n]) => `${n}: ${esc(dish(k))}`).join("<br>")}</div>
      <div class="sub" style="margin-top:4px">${menuTotals(code).kcal} kcal in meals${last ? ` · ${season} menus since ${last.name}` : ""}</div></a>
  </div>`;
}
pages.calendar = () => {
  const t = today();
  if (!cal.view) cal.view = window.innerWidth < 760 ? "agenda" : "week";
  if (!cal.date) cal.date = t;
  const v = cal.view; const d = cal.date;
  let a, b, title;
  if (v === "month") { const first = d.slice(0, 8) + "01"; a = mondayOf(first); b = addDays(a, 41); const lastOfMonth = addDays(addMonths(first, 1), -1); if (addDays(a, 35) > lastOfMonth) b = addDays(a, 34); title = fmt(first, { month: "long", year: "numeric" }); }
  else if (v === "week") { a = mondayOf(d); b = addDays(a, 6); title = `${fmt(a, { day: "numeric", month: "short" })} – ${fmt(b)}`; }
  else if (v === "day") { a = b = d; title = fmtLong(d); }
  else { a = d; b = addDays(d, 59); title = `${fmt(a)} – ${fmt(b)}`; }
  gcalEnsure(a, b); garminEnsure(a, b);
  const evs = calendarEvents(a, b); const byDay = eventsByDay(evs, a, b);
  cal._evs = evs;
  let body = "";
  if (v === "month") {
    const ndays = daysBetween(a, b) + 1; const month = d.slice(0, 7);
    body = `<div class="mgrid">${DAYS.map((x) => `<div class="mhd">${x}</div>`).join("")}${Array.from({ length: ndays }, (_, i) => addDays(a, i)).map((day) => {
      const list = byDay[day] || []; const max = 4;
      return `<div class="mcell ${day.slice(0, 7) !== month ? "out" : ""} ${day === t ? "is-today" : ""} ${["Sat", "Sun"].includes(dowOf(day)) ? "wkend" : ""}" data-act="cal-new" data-date="${day}">
        <button class="mnum" data-act="cal-goto" data-date="${day}">${parseD(day).getDate() === 1 ? fmt(day, { day: "numeric", month: "short" }) : parseD(day).getDate()}</button>
        ${list.slice(0, max).map((e) => chip(e, day)).join("")}${list.length > max ? `<button class="more" data-act="cal-goto" data-date="${day}">+${list.length - max} more</button>` : ""}</div>`;
    }).join("")}</div>`;
  } else if (v === "week" || v === "day") {
    const days = Array.from({ length: daysBetween(a, b) + 1 }, (_, i) => addDays(a, i));
    const cols = `52px repeat(${days.length}, minmax(0,1fr))`;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    body = `<div class="tg-head" style="grid-template-columns:${cols}"><div></div>${days.map((x) => `<button class="tg-day ${x === t ? "is-today" : ""}" data-act="cal-goto" data-date="${x}"><span>${dowOf(x)}</span><b>${parseD(x).getDate()}</b></button>`).join("")}</div>
      <div class="tg-allday" style="grid-template-columns:${cols}"><div class="tg-lbl">all-day</div>${days.map((x) => `<div class="tg-adcell" data-act="cal-new" data-date="${x}">${(byDay[x] || []).filter((e) => !e.time).map((e) => chip(e, x)).join("")}</div>`).join("")}</div>
      <div class="tg-scroll" id="tg-scroll"><div class="tg" style="grid-template-columns:${cols}">
        <div class="tg-times">${Array.from({ length: 24 }, (_, h) => `<div class="tg-hour-lbl">${h ? pad(h) + ":00" : ""}</div>`).join("")}</div>
        ${days.map((x) => {
          const timed = (byDay[x] || []).filter((e) => e.time).map((e) => ({ e, s: toMin(e.time), en: Math.max(toMin(e.endTime) || toMin(e.time) + 60, toMin(e.time) + 15) })).sort((p, q) => p.s - q.s || q.en - p.en);
          // Google-style columns: events only share width with the events they actually overlap
          let cluster = [], cEnd = -1; const flush = () => { const lanes = []; cluster.forEach((o) => { let l = lanes.findIndex((end) => end <= o.s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = o.en; o.l = l; }); cluster.forEach((o) => { o.nl = lanes.length; }); cluster = []; };
          timed.forEach((o) => { if (o.s >= cEnd) { flush(); cEnd = -1; } cluster.push(o); cEnd = Math.max(cEnd, o.en); }); flush();
          return `<div class="tg-col ${x === t ? "is-today" : ""}">${Array.from({ length: 24 }, (_, h) => `<div class="tg-slot" data-act="cal-new" data-date="${x}" data-time="${pad(h)}:00"></div>`).join("")}
            ${timed.map((o) => `<button class="tg-ev ${o.e.done ? "done" : ""} ${o.e.block ? "blk" : ""} ${o.en - o.s < 40 ? "short" : ""} ${o.e.dark ? "ink" : ""}" style="top:${o.s * 0.8}px;height:${Math.max(18, (o.en - o.s) * 0.8 - 2)}px;left:calc(${(o.l / o.nl) * 100}% + 2px);width:calc(${100 / o.nl}% - 4px);--ec:${o.e.color}" data-act="cal-ev" data-id="${esc(o.e.id)}"><b>${o.e.done ? "✓ " : ""}${esc(o.e.title)}</b>${o.en - o.s >= 40 ? `<span>${o.e.time}${o.e.endTime ? " – " + o.e.endTime : ""}</span>` : ""}</button>`).join("")}
            ${x === t ? `<div class="now-line" style="top:${nowMin * 0.8}px"></div>` : ""}</div>`;
        }).join("")}
      </div></div>`;
  } else {
    const days = Object.keys(byDay).sort();
    body = days.length ? `<div class="agenda">${days.map((day) => `<div class="ag-day ${day === t ? "is-today" : ""}"><button class="ag-date" data-act="cal-goto" data-date="${day}"><b>${parseD(day).getDate()}</b><span>${fmt(day, { month: "short" })}, ${dowOf(day)}</span></button>
      <div class="ag-list">${byDay[day].map((e) => `<button class="ag-ev ${e.done ? "done" : ""}" data-act="cal-ev" data-id="${esc(e.id)}"><span class="dot" style="background:${e.color}"></span><span class="ag-time">${e.time ? e.time + (e.endTime ? " – " + e.endTime : "") : e.end ? "Multi-day" : "All day"}</span><span class="ag-title">${e.done ? "✓ " : ""}${esc(e.title)}</span></button>`).join("")}</div></div>`).join("")}</div>`
      : `<div class="box empty">Nothing in the next 60 days with the calendars you have switched on.</div>`;
  }
  return `<div class="cal-wrap">
    <div class="cal-side">
      <button class="btn primary create" data-act="cal-new" data-date="${v === "month" ? (d.slice(0, 7) === t.slice(0, 7) ? t : d) : d}">＋ Create</button>
      ${miniMonth(miniAnchor || d)}
      <div class="cal-list"><div class="label" style="margin:14px 0 6px">Calendars</div>
        ${CALS.map((c) => `<label class="cal-tog"><input type="checkbox" data-act="cal-toggle" data-cal="${c.id}" ${calOn(c.id) ? "checked" : ""} style="accent-color:${c.color}"><span>${c.name}</span></label>`).join("")}
        ${gcal.calendars.length ? `<div class="label" style="margin:14px 0 6px">Google Calendar</div>${gcal.calendars.map((g) => `<label class="cal-tog"><input type="checkbox" data-act="cal-toggle" data-cal="g:${esc(g.name)}" ${calOn("g:" + g.name) ? "checked" : ""} style="accent-color:${gColor(g.name, g.index).c}"><span>${esc(g.name)}</span></label>`).join("")}` : ""}
        <div class="sub" style="margin-top:8px">Task deadlines use each life domain's colour.</div>
      </div>
    </div>
    <div class="cal-main">
      <div class="cal-bar">
        <button class="btn sm" data-act="cal-today">Today</button>
        <button class="x-btn big" data-act="cal-nav" data-n="-1" aria-label="Previous">‹</button><button class="x-btn big" data-act="cal-nav" data-n="1" aria-label="Next">›</button>
        <h2 style="margin:0">${title}</h2>
        <div class="seg">${[["day", "Day"], ["week", "Week"], ["month", "Month"], ["agenda", "Schedule"]].map(([k, l]) => `<button class="${v === k ? "on" : ""}" data-act="cal-view" data-v="${k}">${l}</button>`).join("")}</div>
      </div>
      ${v === "month" || v === "agenda" ? monthStrip(d.slice(0, 7)) : ""}
      ${body}
    </div>
  </div>${calModal()}`;
};
pages.calendar.after = () => {
  const sc = document.getElementById("tg-scroll");
  if (sc && !sc.dataset.done) { sc.scrollTop = cal._scroll != null ? cal._scroll : 6 * 48 - 10; sc.dataset.done = 1; sc.addEventListener("scroll", () => { cal._scroll = sc.scrollTop; }); }
  const ti = document.querySelector(".modal .title-in"); if (ti && !ti.dataset.f) { ti.focus(); ti.dataset.f = 1; }
};

/* ---------- reading log (StoryGraph-style) ---------- */
const MOODS = ["adventurous", "challenging", "dark", "emotional", "funny", "hopeful", "informative", "inspiring", "lighthearted", "mysterious", "reflective", "relaxing", "sad", "tense"];
const PACES = ["slow", "medium", "fast"];
const FORMATS = [["print", "Print"], ["digital", "Digital"], ["audio", "Audio"]];
const STATUSES = [["reading", "Currently reading"], ["to-read", "To-read"], ["read", "Read"], ["wishlist", "Wishlist (to buy)"], ["dnf", "Did not finish"], ["", "Not on a list"]];
// the to-read pile: anything marked to-read, plus books on my own shelves I haven't read yet
const inTBR = (b) => b.status === "to-read" || (b.owned && !b.status);
const tbrList = () => allBooks().filter(inTBR).sort((a, b) => (a.status === "to-read" ? 0 : 1) - (b.status === "to-read" ? 0 : 1) || (b.added || "").localeCompare(a.added || "") || normT(a.title).localeCompare(normT(b.title)));
const readList = () => allBooks().filter((b) => b.status === "read").sort((a, b) => (b.finished || "0").localeCompare(a.finished || "0") || normT(a.title).localeCompare(normT(b.title)));
const hoursIn = (y) => Math.round(sum(allBooks().flatMap((b) => (b.sessions || []).filter((x) => (x.date || "").startsWith(String(y))).map((x) => x.minutes || 0))) / 60 * 10) / 10;
const CH_KINDS = [["books", "Read a number of books"], ["pages", "Read a number of pages"], ["hours", "Read a number of hours"], ["shelf", "Read books from my own shelves"], ["genre", "Read books in a genre"], ["nonfiction", "Read nonfiction books"], ["fiction", "Read fiction books"]];
const GENRE_MAP = [["Fantasy", /fantasy|magic|dragons|wizards/], ["Science Fiction", /science fiction|dystopi|space opera|robots|time travel|extraterrestrial/], ["Romance", /romance|love stories/], ["Horror", /horror|ghost|haunted|zombie|vampire/], ["Thriller", /thriller|suspense/], ["Mystery", /mystery|detective|crime/], ["Historical", /historical fiction/], ["Young Adult", /young adult|juvenile fiction|teen/], ["LGBTQIA+", /lgbt|gay|lesbian|queer|transgender|bisexual/], ["Comics", /comic|graphic novel|manga/], ["Classics", /classic/], ["Literary", /literary fiction|psychological fiction/], ["Contemporary", /contemporary|domestic fiction/], ["Memoir", /memoir|autobiograph/], ["Biography", /biograph/], ["History", /(^|, )history|world history|military history|united states -- history/], ["Science", /biology|evolution|physics|neuroscience|brain|extinction|scientific/], ["Psychology", /psycholog/], ["Self Help", /self-help|self help|habits|success|conduct of life/], ["Politics", /politic|government|geopolitic/], ["Philosophy", /philosoph/], ["Sociology", /sociolog|social conditions|social history/], ["Race", /race relations|racism/], ["Gender", /feminism|women's rights|gender/], ["Essays", /essays/], ["Nature", /nature|ocean|animals|ecology/], ["Poetry", /poetry/], ["Humor", /humor|humour/]];
const readUI = { edit: null, search: { q: "", results: [], loading: false, err: "" }, statYear: null, statMonth: "", bulk: null, importMsg: "", lookup: {} };
const normT = (t) => String(t || "").toLowerCase().replace(/^(the|a|an) /, "").replace(/[^a-z0-9]/g, "");
const R = () => { state.reading = state.reading || { books: {}, goals: {} }; state.reading.books = state.reading.books || {}; state.reading.goals = state.reading.goals || {}; return state.reading; };
function baseBooks() {
  const out = {};
  (window.LIBRARY || []).forEach((b) => {
    const nf = b.cat === "Nonfiction" || b.cat === "Memoir";
    out[b.id] = { id: b.id, title: b.title, author: b.author, owned: true, shelf: b.shelf, status: (window.LIBRARY_STATUS || {})[b.title] || "", fiction: !nf,
      genres: b.cat === "Graphic novel" ? ["Comics"] : b.cat === "Memoir" ? ["Memoir"] : b.cat === "Picture book" ? ["Children's"] : [], format: "print" };
  });
  (window.READING_SEED || []).forEach((b) => { out[b.id] = { owned: false, format: "print", genres: [], ...b }; });
  return out;
}
let _bbCache = null;
function allBooks() {
  _bbCache = _bbCache || baseBooks();
  const over = (state.reading && state.reading.books) || {};
  const ids = new Set([...Object.keys(_bbCache), ...Object.keys(over)]);
  const list = [];
  ids.forEach((id) => { const b = { ..._bbCache[id], ...over[id], id }; if (!b.deleted && b.title) list.push(b); });
  return list;
}
const bookById = (id) => allBooks().find((b) => b.id === id);
function patchBook(id, p) { const r = R(); r.books[id] = { ...(r.books[id] || {}), ...p }; }
const pctOf = (b) => b.status === "read" ? 1 : b.pages ? clamp01((b.progress || 0) / b.pages) : clamp01(b.pct || 0);
const stars = (r) => r ? `${"★".repeat(Math.floor(r))}${r % 1 ? "½" : ""} <span class="muted">${r}</span>` : "";
function coverHTML(b, cls = "") {
  let h = 0; for (const ch of b.title || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cols = ["var(--d-family)", "var(--d-health)", "var(--d-finances)", "var(--d-career)", "var(--d-degree)", "var(--d-travel)", "var(--d-community)"];
  return `<div class="cover ${cls}" style="--cc:${cols[h % cols.length]}"><span class="ct">${esc(b.title)}</span><span class="ca">${esc(b.author || "")}</span>${b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>`;
}
const fmtDays = (d) => d < 1 ? "under a day" : d < 14 ? plural(Math.round(d), "day") : d < 60 ? plural(Math.round(d / 7), "week") : plural(Math.round(d / 30.4), "month");
function genresFromSubjects(subjects) {
  const s = (subjects || []).join(", ").toLowerCase();
  return { genres: GENRE_MAP.filter(([, re]) => re.test(s)).map(([g]) => g).slice(0, 4), fiction: /fiction/.test(s) && !/nonfiction/.test(s) ? true : s ? false : null };
}
async function olSearch(q) {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,number_of_pages_median,cover_i,first_publish_year,subject,isbn&limit=12`);
  if (!r.ok) throw new Error("Open Library didn't answer");
  return (await r.json()).docs || [];
}
function olToBook(d) {
  const g = genresFromSubjects(d.subject);
  return { title: d.title, author: (d.author_name || []).slice(0, 2).join(" & "), pages: d.number_of_pages_median || null, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    isbn: (d.isbn || [])[0] || null, olKey: d.key, year: d.first_publish_year || null, genres: g.genres, fiction: g.fiction };
}
async function lookupBook(id, quiet) {
  const b = bookById(id); if (!b) return false;
  readUI.lookup[id] = "loading"; if (!quiet) render();
  try {
    const docs = await olSearch(`${b.title} ${b.author || ""}`.replace(/[&?]/g, " "));
    const d = docs.find((x) => normT(x.title) === normT(b.title)) || docs[0];
    if (!d) { readUI.lookup[id] = "none"; patchBook(id, { olTried: true }); if (!quiet) commit(); return false; }
    const o = olToBook(d); const p = {};
    if (!b.cover && o.cover) p.cover = o.cover;
    if (!b.pages && o.pages) p.pages = o.pages;
    if (!b.isbn && o.isbn) p.isbn = o.isbn;
    if ((!b.genres || !b.genres.length || (b.genres.length === 1 && b.genres[0] === "Comics")) && o.genres.length) p.genres = [...new Set([...(b.genres || []), ...o.genres])].slice(0, 5);
    if (b.fiction == null && o.fiction != null) p.fiction = o.fiction;
    if (!b.author && o.author) p.author = o.author;
    p.olKey = o.olKey; patchBook(id, p); readUI.lookup[id] = "done";
    if (!quiet) commit(); return true;
  } catch (e) { readUI.lookup[id] = "error"; if (!quiet) render(); return false; }
}
async function bulkLookup() {
  const todo = allBooks().filter((b) => !b.olKey && !b.olTried && (!b.cover || !b.pages));
  if (!todo.length || readUI.bulk) return;
  readUI.bulk = { done: 0, total: todo.length, found: 0 }; render();
  for (const b of todo) {
    if (!readUI.bulk) break;
    if (await lookupBook(b.id, true)) readUI.bulk.found++;
    readUI.bulk.done++;
    if (readUI.bulk.done % 5 === 0) { saveLocal(); render(); }
    await new Promise((r) => setTimeout(r, 350));
  }
  readUI.bulk = null; commit();
}
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}
const sgDate = (s) => { const m = String(s || "").match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/); return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : null; };
function importStoryGraph(text) {
  const rows = parseCSV(text);
  if (!rows.length || !("title" in rows[0])) return "That file doesn't look like a StoryGraph export (no Title column).";
  const byTitle = {}; allBooks().forEach((b) => { byTitle[normT(b.title)] = b; });
  let added = 0, updated = 0;
  const stMap = { "read": "read", "currently-reading": "reading", "to-read": "to-read", "did-not-finish": "dnf", "paused": "reading" };
  rows.forEach((r) => {
    const p = { title: r["title"], author: r["authors"] || "" };
    const st = stMap[(r["read status"] || "").toLowerCase()]; if (st) p.status = st;
    const ranges = (r["dates read"] || "").split(",").map((x) => x.trim()).filter(Boolean);
    const last = ranges[ranges.length - 1];
    if (last) { const [a, b] = last.split(/\s*-\s*(?=\d{4})/); if (sgDate(b)) { p.started = sgDate(a); p.finished = sgDate(b); } else if (sgDate(a)) p.finished = sgDate(a); }
    if (!p.finished && sgDate(r["last date read"]) && st === "read") p.finished = sgDate(r["last date read"]);
    if (sgDate(r["date added"])) p.added = sgDate(r["date added"]);
    const fm = (r["format"] || "").toLowerCase(); if (fm) p.format = /audio/.test(fm) ? "audio" : /digital|ebook|kindle/.test(fm) ? "digital" : "print";
    if (r["moods"]) p.moods = r["moods"].split(",").map((x) => x.trim().toLowerCase()).filter((x) => MOODS.includes(x));
    if (r["pace"]) p.pace = r["pace"].toLowerCase();
    if (parseFloat(r["star rating"])) p.rating = parseFloat(r["star rating"]);
    if (r["review"]) p.review = r["review"];
    if (r["isbn/uid"]) p.isbn = r["isbn/uid"];
    if (/^yes/i.test(r["owned?"] || "")) p.owned = true;
    if (p.status === "read") p.progress = null;
    const ex = byTitle[normT(p.title)];
    if (ex) { if (!p.author) delete p.author; else if (ex.author) delete p.author; patchBook(ex.id, p); updated++; }
    else { const id = "sg-" + (normT(p.title).slice(0, 24) || Date.now().toString(36)); patchBook(id, { genres: [], ...p }); byTitle[normT(p.title)] = { id }; added++; }
  });
  _bbCache = null;
  return `Imported ${rows.length} books from StoryGraph: ${added} new, ${updated} matched to books already here. Use "Fill in covers & pages" below to fetch page counts and genres (StoryGraph's export doesn't include them).`;
}
function exportReadingCSV() {
  const cols = ["title", "author", "status", "started", "finished", "pages", "format", "rating", "moods", "pace", "genres", "owned", "review"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [cols.join(","), ...allBooks().filter((b) => b.status).map((b) => cols.map((c) => q(Array.isArray(b[c]) ? b[c].join("; ") : b[c])).join(","))];
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `reading-log-${today()}.csv`; a.click();
}
function hbars(rows, color, opts = {}) {
  if (!rows.length) return `<div class="empty">${opts.empty || "Nothing logged for this period yet."}</div>`;
  const max = Math.max(...rows.map((r) => r[1]));
  return `<div class="hbars">${rows.map(([l, n]) => `<div class="hb-row"><span class="hb-l">${esc(l)}</span><span class="hb-t"><span class="hb-b" style="width:${(n / max) * 100}%;background:${color}"></span></span><span class="hb-n">${n}</span></div>`).join("")}</div>`;
}
function shares(rows, colors) {
  const tot = sum(rows.map((r) => r[1])); if (!tot) return `<div class="empty">Nothing logged for this period yet.</div>`;
  const vis = rows.filter((r) => r[1]);
  return `<div class="stack">${vis.map(([l, n], i) => `<div style="flex:${n};background:${colors[i % colors.length]}" data-tip="${esc(`${l}: <b>${n}</b> (${pctTxt(n / tot)})`)}"></div>`).join("")}</div>
    <div class="legend">${vis.map(([l, n], i) => `<span><span class="dot" style="background:${colors[i % colors.length]}"></span>${esc(l)} <b>${pctTxt(n / tot)}</b></span>`).join("")}</div>`;
}
function cols12(vals, color, unit) {
  if (!vals.some(Boolean)) return `<div class="empty">Nothing to show yet${unit === "pages" ? " (finished books need page counts)" : ""}.</div>`;
  const max = Math.max(1, ...vals); const M = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return `<div class="cols12">${vals.map((v, i) => `<div class="c12" data-tip="${esc(`${fmt(`2026-${pad(i + 1)}-01`, { month: "long" })}: <b>${v.toLocaleString()}</b> ${unit}`)}"><span class="c12v">${v || ""}</span><span class="c12b" style="height:${(v / max) * 100}%;background:${color}"></span><span class="c12l">${M[i]}</span></div>`).join("")}</div>`;
}
const RTABS = [["", "Home"], ["stats", "Stats"], ["challenges", "Challenges"], ["tbr", "To-read pile"], ["wishlist", "Wishlist"], ["read", "Books I've read"]];
const RTABS2 = [["library", "Search my library"], ["add", "Add a book"], ["import", "Import & export"]];
function readTabs(cur) {
  const b = readUI.bulk;
  return `<div class="seg rtabs">${RTABS.map(([k, l]) => `<a href="#reading${k ? "/" + k : ""}" class="${cur === k ? "on" : ""}">${l}</a>`).join("")}</div>
  <div class="rtabs2">${RTABS2.map(([k, l]) => `<a href="#reading/${k}" class="${cur === k ? "on" : ""}">${l}</a>`).join(" · ")}${b ? ` <span class="muted">· fetching covers ${b.done}/${b.total}</span>` : ""}</div>`;
}
const bookRow = (b) => { const lbl = Object.fromEntries(STATUSES); return `<li class="rlib-row" data-s="${esc((b.title + " " + (b.author || "")).toLowerCase())}"><a href="#reading/b-${b.id}">${coverHTML(b, "xs")}<span class="rl-t"><b>${esc(b.title)}</b><span class="sub">${esc(b.author || "")}${b.finished && b.status === "read" ? ` · finished ${fmt(b.finished)}` : ""}${b.status === "reading" ? ` · ${pctTxt(pctOf(b))}` : ""}</span></span>
    <span class="rl-m">${b.rating ? `<span class="chip">★ ${b.rating}</span>` : ""}${b.status ? `<span class="chip ${b.status === "read" ? "good" : b.status === "reading" ? "warn" : ""}">${lbl[b.status]}</span>` : ""}${b.owned ? `<span class="chip">Owned</span>` : ""}</span></a></li>`; };
function progressForm(b) {
  return `<form data-form="rprogress" class="rprog-form"><input type="hidden" name="id" value="${b.id}">
    <div class="form-grid">
      ${b.pages ? `<label>Page I'm on (of ${b.pages})<input type="number" name="page" min="0" max="${b.pages}" value="${b.progress || ""}" inputmode="numeric"></label>` : `<label>% read<input type="number" name="pct" min="0" max="100" value="${Math.round((b.pct || 0) * 100) || ""}" inputmode="numeric"></label><label>Total pages (optional)<input type="number" name="pages" min="1" inputmode="numeric"></label>`}
      <label>Minutes read (optional)<input type="number" name="minutes" min="0" inputmode="numeric"></label>
      <label>Date<input type="date" name="date" value="${today()}"></label>
    </div><div class="row" style="margin-top:10px"><button class="btn primary sm" type="submit">Save progress</button><button class="btn sm" type="button" data-act="r-edit" data-id="">Cancel</button></div></form>`;
}
function readHome() {
  const all = allBooks();
  const cur = all.filter((b) => b.status === "reading");
  const tbr = tbrList();
  return `${readTabs("")}
  <h2>Currently reading <span class="h-note">${cur.length}</span></h2>
  ${cur.length ? `<div class="grid g2">${cur.map((b) => `<div class="box rcur">
      <a href="#reading/b-${b.id}">${coverHTML(b, "md")}</a>
      <div class="rcur-body"><a class="rtitle" href="#reading/b-${b.id}">${esc(b.title)}</a><div class="sub">${esc(b.author || "")}</div>
        <div class="rpct">${pctTxt(pctOf(b))} <span>complete</span></div>
        <div style="margin:6px 0 4px">${bar(pctOf(b), "var(--moss)", "thick")}</div>
        <div class="sub">${b.pages ? `page ${b.progress || 0} of ${b.pages}` : ""}${b.started ? ` · started ${fmtShort(b.started)}` : ""}</div>
        ${readUI.edit === b.id ? progressForm(b) : `<div class="row" style="margin-top:12px"><button class="btn sm" data-act="r-edit" data-id="${b.id}">Update progress</button><button class="btn primary sm" data-act="r-finish" data-id="${b.id}">Finished</button></div>`}
      </div></div>`).join("")}</div>` : `<div class="box empty">Nothing on the go. Pick something from your to-read pile below.</div>`}
  <h2>Up next from the to-read pile <span class="h-note">${tbr.length} books · <a href="#reading/tbr">see the whole pile →</a></span></h2>
  ${tbr.length ? `<div class="tbr5">${tbr.slice(0, 5).map((b) => `<div class="tbr5-item"><a href="#reading/b-${b.id}">${coverHTML(b)}</a><a class="t" href="#reading/b-${b.id}">${esc(b.title)}</a><span class="sub">${esc(b.author || "")}</span><button class="btn sm" data-act="r-start" data-id="${b.id}">Start reading</button></div>`).join("")}</div>` : `<div class="box empty">Your to-read pile is empty.</div>`}`;
}
function readTBR() {
  const list = tbrList();
  return `${readTabs("tbr")}
  <h2>To-read pile <span class="h-note">${list.length} books · everything marked to-read, plus the unread books on your shelves</span></h2>
  <div class="row" style="margin-bottom:10px"><input type="search" placeholder="Search the pile…" data-act="r-libq" style="flex:1;min-width:200px"></div>
  <div class="box"><ul class="rlib">${list.map(bookRow).join("") || `<li class="empty">Nothing here.</li>`}</ul></div>`;
}
function readWish() {
  const list = allBooks().filter((b) => b.status === "wishlist").sort((a, b) => (b.added || "").localeCompare(a.added || ""));
  return `${readTabs("wishlist")}
  <h2>Wishlist <span class="h-note">books to buy · ${list.length}</span></h2>
  <div class="box"><form data-form="rwish" class="row"><input type="text" name="title" placeholder="Title" required style="flex:2;min-width:160px"><input type="text" name="author" placeholder="Author" style="flex:1;min-width:120px"><button class="btn primary" type="submit">Add to wishlist</button></form>
    <div class="sub" style="margin-top:6px">The cover and page count are looked up for you. You can also use <a href="#reading/add">Add a book</a> and choose “Wishlist”.</div></div>
  <div class="box" style="margin-top:12px"><ul class="rlib">${list.map((b) => `<li class="rlib-row"><div class="rl-a"><a href="#reading/b-${b.id}" class="rl-a" style="flex:1">${coverHTML(b, "xs")}<span class="rl-t"><b>${esc(b.title)}</b><span class="sub">${esc(b.author || "")}${b.added ? ` · added ${fmt(b.added)}` : ""}</span></span></a>
    <span class="rl-m"><button class="btn sm primary" data-act="r-bought" data-id="${b.id}">Bought it</button><button class="x-btn" data-act="r-del" data-id="${b.id}" title="Remove">×</button></span></div></li>`).join("") || `<li class="empty">Nothing on the wishlist yet.</li>`}</ul></div>`;
}
function readRead() {
  const list = readList(); const by = {};
  list.forEach((b) => { const y = (b.finished || "").slice(0, 4) || "No date"; (by[y] = by[y] || []).push(b); });
  return `${readTabs("read")}
  <h2>Books I've read <span class="h-note">${list.length} in all</span></h2>
  <div class="row" style="margin-bottom:10px"><input type="search" placeholder="Search books I've read…" data-act="r-libq" style="flex:1;min-width:200px"></div>
  ${Object.keys(by).sort((a, b) => (a === "No date") - (b === "No date") || b.localeCompare(a)).map((y) => `<h3 class="ryear">${y} <span class="muted">· ${by[y].length}</span></h3><div class="box"><ul class="rlib">${by[y].map(bookRow).join("")}</ul></div>`).join("") || `<div class="box empty">Nothing marked read yet.</div>`}`;
}
function chProgress(c) {
  const y = String(c.year); const yr = readList().filter((b) => (b.finished || "").startsWith(y));
  const have = c.kind === "pages" ? sum(yr.map((b) => b.pages || 0)) : c.kind === "hours" ? hoursIn(y) : c.kind === "shelf" ? yr.filter((b) => b.owned).length
    : c.kind === "genre" ? yr.filter((b) => (b.genres || []).some((g) => g.toLowerCase() === String(c.genre || "").toLowerCase())).length
    : c.kind === "nonfiction" ? yr.filter((b) => b.fiction === false).length : c.kind === "fiction" ? yr.filter((b) => b.fiction === true).length : yr.length;
  return { have, unit: c.kind === "pages" ? "pages" : c.kind === "hours" ? "hours" : "books" };
}
function goalBar(label, have, goal, unit, y) {
  const t = today(); const cy = String(y) === t.slice(0, 4);
  const frac = cy ? daysBetween(`${y}-01-01`, t) / (daysBetween(`${y}-01-01`, `${y}-12-31`) + 1) : 1;
  const done = have >= goal;
  return `<div class="fund"><div class="frow"><span>${esc(label)}</span><span>${have.toLocaleString()} / ${goal.toLocaleString()} ${unit} · ${pctTxt(have / goal)}</span></div>${bar(have / goal, "var(--moss)", "thick", cy ? frac : null)}
    <div class="sub">${done ? '<span class="good">Done ✓</span>' : cy ? (have >= goal * frac ? '<span class="good">On track</span>' : `${Math.ceil(goal * frac - have).toLocaleString()} ${unit} behind pace`) : '<span class="muted">Not reached</span>'}</div></div>`;
}
function readChallenges() {
  const r = R(); const t = today(); const y = Number(t.slice(0, 4));
  const g = r.goals[y] || {}; const yr = readList().filter((b) => (b.finished || "").startsWith(String(y)));
  const pagesY = sum(yr.map((b) => b.pages || 0)); const hrsY = hoursIn(y);
  const chs = (r.challenges || []);
  const cur = chs.filter((c) => Number(c.year) === y); const past = chs.filter((c) => Number(c.year) < y);
  const pastYears = [...new Set([...Object.keys(r.goals).map(Number), ...past.map((c) => Number(c.year))])].filter((x) => x < y).sort((a, b) => b - a);
  const chBox = (c) => { const p = chProgress(c); return `<div class="box"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h3 style="margin:0">${esc(c.name)}</h3><button class="x-btn" data-act="r-chdel" data-id="${c.id}" title="Delete challenge">×</button></div>
    <div class="sub" style="margin-bottom:8px">${esc((CH_KINDS.find((k) => k[0] === c.kind) || [])[1] || "")}${c.kind === "genre" ? `: ${esc(c.genre || "")}` : ""} · ${c.year}</div>${goalBar("Progress", p.have, Number(c.target) || 1, p.unit, c.year)}</div>`; };
  return `${readTabs("challenges")}
  <h2>${y} reading goals <span class="h-note">see your progress this year and set goals</span></h2>
  <div class="box">
    <div class="row" style="gap:14px;margin-bottom:8px"><span class="big md" style="margin:0">${yr.length}</span><span class="sub" style="margin:0">books read in ${y} · ${pagesY.toLocaleString()} pages · ${hrsY} hours logged</span></div>
    ${g.books ? goalBar("Books", yr.length, g.books, "books", y) : ""}${g.pages ? goalBar("Pages", pagesY, g.pages, "pages", y) : ""}${g.hours ? goalBar("Hours", hrsY, g.hours, "hours", y) : ""}
    <form data-form="rgoal" class="form-grid" style="margin-top:12px"><input type="hidden" name="year" value="${y}">
      <label>Books goal<input type="number" name="books" min="0" value="${g.books || ""}"></label><label>Pages goal<input type="number" name="pages" min="0" value="${g.pages || ""}"></label><label>Hours goal<input type="number" name="hours" min="0" value="${g.hours || ""}"></label>
      <label>&nbsp;<button class="btn sm" type="submit">Set goals</button></label></form>
    <div class="sub" style="margin-top:6px">Hours come from the minutes you log with “Update progress”.</div>
  </div>
  <h2>My ${y} challenges</h2>
  ${cur.length ? `<div class="grid g2">${cur.map(chBox).join("")}</div>` : `<div class="box empty">No challenges yet this year. Add one below.</div>`}
  <h2>Add a challenge</h2>
  <div class="box"><form data-form="rchallenge" class="form-grid">
    <label>Name<input type="text" name="name" placeholder="e.g. 12 books off my shelves" required></label>
    <label>Type<select name="kind">${CH_KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
    <label>Target<input type="number" name="target" min="1" required></label>
    <label>Genre (for genre challenges)<input type="text" name="genre" placeholder="e.g. Fantasy"></label>
    <label>Year<input type="number" name="year" value="${y}" min="2000" max="2100"></label>
    <label>&nbsp;<button class="btn primary" type="submit">Add challenge</button></label></form></div>
  <h2>Past years</h2>
  ${pastYears.length ? pastYears.map((py) => { const pg = r.goals[py] || {}; const pyr = readList().filter((b) => (b.finished || "").startsWith(String(py)));
    return `<div class="box" style="margin-bottom:12px"><h3>${py} <span class="muted" style="font-weight:400">· ${plural(pyr.length, "book")} read</span></h3>
      ${pg.books ? goalBar("Books goal", pyr.length, pg.books, "books", py) : ""}${pg.pages ? goalBar("Pages goal", sum(pyr.map((b) => b.pages || 0)), pg.pages, "pages", py) : ""}${pg.hours ? goalBar("Hours goal", hoursIn(py), pg.hours, "hours", py) : ""}
      ${past.filter((c) => Number(c.year) === py).map((c) => { const p = chProgress(c); return goalBar(c.name, p.have, Number(c.target) || 1, p.unit, py); }).join("")}</div>`; }).join("") : `<div class="box empty">Your challenges and goals from earlier years will be kept here.</div>`}`;
}
function readStats() {
  const all = allBooks(); const t = today();
  const years = [...new Set(all.map((b) => (b.finished || "").slice(0, 4)).filter(Boolean).concat(t.slice(0, 4)))].sort().reverse();
  const y = readUI.statYear || t.slice(0, 4); const m = readUI.statMonth;
  const per = all.filter((b) => b.status === "read" && (b.finished || "").startsWith(m ? `${y}-${m}` : y));
  const pages = sum(per.map((b) => b.pages || 0));
  const durs = per.filter((b) => b.started && b.finished).map((b) => Math.max(0, daysBetween(b.started, b.finished)));
  const count = (arr) => { const o = {}; arr.forEach((x) => { if (x) o[x] = (o[x] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const undated = all.filter((b) => b.status === "read" && !b.finished).length;
  const pb = [["<300", per.filter((b) => b.pages && b.pages < 300).length], ["300-499", per.filter((b) => b.pages >= 300 && b.pages < 500).length], ["500+", per.filter((b) => b.pages >= 500).length], ["Unknown", per.filter((b) => !b.pages).length]];
  const C = ["var(--d-career)", "var(--d-health)", "var(--d-finances)", "var(--d-degree)", "var(--d-family)", "var(--neutral-series)"];
  const yearReads = all.filter((b) => b.status === "read" && (b.finished || "").startsWith(y));
  const perMonth = Array.from({ length: 12 }, (_, i) => yearReads.filter((b) => b.finished.slice(5, 7) === pad(i + 1)));
  const rated = per.filter((b) => b.rating);
  const ratingRows = [5, 4, 3, 2, 1].map((s) => [`${s} ★`, rated.filter((b) => Math.min(5, Math.floor(b.rating)) === s).length]);
  const ty = t.slice(0, 4), ly = String(Number(ty) - 1); const allRead = readList();
  const tile = (label, list) => `<div class="box tight"><div class="label">${label}</div><div class="big md">${list.length} <span class="of">books</span></div><div class="sub">${sum(list.map((b) => b.pages || 0)).toLocaleString()} pages</div></div>`;
  return `${readTabs("stats")}
  <div class="grid g3" style="margin-top:14px">${tile(`This year (${ty})`, allRead.filter((b) => (b.finished || "").startsWith(ty)))}${tile(`Last year (${ly})`, allRead.filter((b) => (b.finished || "").startsWith(ly)))}${tile("All time", allRead)}</div>
  <div class="row" style="margin-top:10px"><a class="btn" href="#reading/read">View all books I've read →</a></div>
  <div class="box row" style="margin-top:14px"><span class="label">Viewing stats for read books in</span>
    <select data-act="r-year" style="width:auto">${years.map((x) => `<option ${x === y ? "selected" : ""}>${x}</option>`).join("")}</select>
    <select data-act="r-month" style="width:auto"><option value="">All year</option>${Array.from({ length: 12 }, (_, i) => `<option value="${pad(i + 1)}" ${m === pad(i + 1) ? "selected" : ""}>${fmt(`2026-${pad(i + 1)}-01`, { month: "long" })}</option>`).join("")}</select></div>
  ${undated ? `<div class="note" style="margin-top:10px">${plural(undated, "read book")} ${undated === 1 ? "has" : "have"} no finish date, so ${undated === 1 ? "it isn't" : "they aren't"} counted below. Add dates on each book's page, or import your StoryGraph export.</div>` : ""}
  <div class="grid g4" style="margin-top:14px">
    <div class="box tight"><div class="label">Read</div><div class="big md">${per.length} <span class="of">books</span></div></div>
    <div class="box tight"><div class="label">Pages</div><div class="big md">${pages.toLocaleString()}</div><div class="sub">${per.filter((b) => !b.pages).length ? `${per.filter((b) => !b.pages).length} without a page count` : ""}</div></div>
    <div class="box tight"><div class="label">Average time to finish</div><div class="big md">${durs.length ? fmtDays(sum(durs) / durs.length) : "–"}</div><div class="sub">${durs.length ? `from ${plural(durs.length, "book")} with start dates` : "needs start dates"}</div></div>
    <div class="box tight"><div class="label">Average rating</div><div class="big md">${rated.length ? (sum(rated.map((b) => b.rating)) / rated.length).toFixed(2) + " ★" : "–"}</div><div class="sub">${plural(rated.length, "rating")}</div></div>
  </div>
  <div class="grid g2" style="align-items:start">
    <div><h2>Moods</h2><div class="box">${hbars(count(per.flatMap((b) => b.moods || [])), "var(--moss)", { empty: "Tag moods on the books you finish." })}</div></div>
    <div><h2>Genres</h2><div class="box">${hbars(count(per.flatMap((b) => b.genres || [])).slice(0, 14), "var(--d-career)", { empty: "No genres yet. Try “Fill in covers & pages” in Import & export." })}</div></div>
  </div>
  <div class="grid g2" style="align-items:start">
    <div><h2>Pace</h2><div class="box">${shares(PACES.map((p) => [p, per.filter((b) => b.pace === p).length]), C)}</div></div>
    <div><h2>Page number</h2><div class="box">${shares(pb, C)}</div></div>
    <div><h2>Fiction / nonfiction</h2><div class="box">${shares([["fiction", per.filter((b) => b.fiction === true).length], ["nonfiction", per.filter((b) => b.fiction === false).length]], [C[4], C[0]])}</div></div>
    <div><h2>Format</h2><div class="box">${shares(FORMATS.map(([k, l]) => [l, per.filter((b) => (b.format || "print") === k).length]), C)}</div></div>
  </div>
  <div class="grid g2" style="align-items:start">
    <div><h2>Most read authors</h2><div class="box">${hbars(count(per.map((b) => b.author)).filter((r) => r[1] > 1).slice(0, 8), "var(--d-degree)", { empty: "No author read more than once in this period." })}</div></div>
    <div><h2>Star ratings</h2><div class="box">${rated.length ? hbars(ratingRows.filter((r) => r[1]), "var(--d-degree)") : `<div class="empty">No ratings yet.</div>`}</div></div>
  </div>
  <h2>Books per month <span class="h-note">${y}</span></h2><div class="box">${cols12(perMonth.map((l) => l.length), "var(--d-career)", "books")}</div>
  <h2>Pages per month <span class="h-note">${y}</span></h2><div class="box">${cols12(perMonth.map((l) => sum(l.map((b) => b.pages || 0))), "var(--d-health)", "pages")}</div>`;
}
function readLibrary() {
  const all = allBooks().sort((a, b) => normT(a.title).localeCompare(normT(b.title)));
  const f = readUI.libStatus || "all";
  const list = all.filter((b) => f === "all" || (f === "owned" ? b.owned : f === "none" ? !b.status : b.status === f));
  const n = (k) => all.filter((b) => k === "owned" ? b.owned : k === "none" ? !b.status : b.status === k).length;
  const lbl = Object.fromEntries(STATUSES);
  return `${readTabs("library")}
  <div class="row" style="margin:14px 0"><input type="search" placeholder="Search your books…" data-act="r-libq" style="flex:1;min-width:200px">
    <select data-act="r-libf" style="width:auto">${[["all", `All (${all.length})`], ["reading", `Currently reading (${n("reading")})`], ["to-read", `To-read (${n("to-read")})`], ["read", `Read (${n("read")})`], ["wishlist", `Wishlist (${n("wishlist")})`], ["dnf", `Did not finish (${n("dnf")})`], ["owned", `On my shelves (${n("owned")})`], ["none", `Not on a list (${n("none")})`]].map(([k, l]) => `<option value="${k}" ${f === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
  <div class="box"><ul class="rlib">${list.map((b) => `<li class="rlib-row" data-s="${esc((b.title + " " + (b.author || "")).toLowerCase())}"><a href="#reading/b-${b.id}">${coverHTML(b, "xs")}<span class="rl-t"><b>${esc(b.title)}</b><span class="sub">${esc(b.author || "")}</span></span>
    <span class="rl-m">${b.rating ? `<span class="chip">★ ${b.rating}</span>` : ""}${b.status ? `<span class="chip ${b.status === "read" ? "good" : b.status === "reading" ? "warn" : ""}">${lbl[b.status]}</span>` : ""}${b.owned ? `<span class="chip">Owned</span>` : ""}</span></a></li>`).join("") || `<li class="empty">No books here.</li>`}</ul></div>`;
}
function readAdd() {
  const s = readUI.search;
  return `${readTabs("add")}
  <h2>Search for a book</h2>
  <div class="box"><form data-form="rsearch" class="row"><input type="search" name="q" value="${esc(s.q)}" placeholder="Title, author or ISBN" style="flex:1;min-width:200px" required><button class="btn primary" type="submit">${s.loading ? "Searching…" : "Search"}</button></form>
    <div class="sub" style="margin-top:6px">Book details and covers come from Open Library.</div>
    ${s.err ? `<div class="note" style="margin-top:10px">${esc(s.err)}</div>` : ""}
    ${s.results.length ? `<ul class="rlib" style="margin-top:10px">${s.results.map((r, i) => `<li class="rlib-row"><div class="rl-a">${coverHTML(r, "xs")}<span class="rl-t"><b>${esc(r.title)}</b><span class="sub">${esc(r.author)}${r.year ? ` · ${r.year}` : ""}${r.pages ? ` · ${r.pages} pages` : ""}</span></span>
      <span class="rl-m"><select data-act="noop" id="rs-st-${i}" style="width:auto">${STATUSES.slice(0, 4).map(([k, l]) => `<option value="${k}" ${k === "to-read" ? "selected" : ""}>${l}</option>`).join("")}</select><button class="btn sm" data-act="r-addres" data-i="${i}">Add</button></span></div></li>`).join("")}</ul>` : ""}
  </div>
  <h2>Or add it by hand</h2>
  <div class="box"><form data-form="rmanual" class="form-grid">
    <label>Title<input type="text" name="title" required></label><label>Author<input type="text" name="author"></label><label>Pages<input type="number" name="pages" min="1"></label>
    <label>Status<select name="status">${STATUSES.map(([k, l]) => `<option value="${k}" ${k === "to-read" ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label>Format<select name="format">${FORMATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
    <label>Fiction?<select name="fiction"><option value="1">Fiction</option><option value="0">Nonfiction</option></select></label>
    <label class="row" style="flex-direction:row;align-items:center;gap:8px;margin-top:22px"><input type="checkbox" name="owned" style="width:auto"> I own it</label>
    <label>&nbsp;<button class="btn primary" type="submit">Add book</button></label></form></div>`;
}
function readImport() {
  const b = readUI.bulk; const missing = allBooks().filter((x) => !x.olKey && !x.olTried && (!x.cover || !x.pages)).length;
  return `${readTabs("import")}
  <h2>Import from StoryGraph</h2>
  <div class="box"><p style="font-size:14px">In StoryGraph: <b>Manage Account → Export StoryGraph Library</b>, then choose the file here. Your read dates, ratings, moods, pace, formats and statuses come across, and books already on your shelves are matched instead of duplicated.</p>
    <label class="btn" style="margin-top:10px">Choose StoryGraph CSV<input type="file" accept=".csv,text/csv" data-act="r-import" hidden></label>
    ${readUI.importMsg ? `<div class="note" style="margin-top:12px">${esc(readUI.importMsg)}</div>` : ""}</div>
  <h2>Fill in covers & pages</h2>
  <div class="box"><p style="font-size:14px">Looks up each book on Open Library for its cover, page count and genres. ${plural(missing, "book")} still need${missing === 1 ? "s" : ""} details. It takes a few minutes; keep this page open.</p>
    <div class="row" style="margin-top:10px">${b ? `<span>Looking up ${b.done} of ${b.total} · ${b.found} found</span><button class="btn sm" data-act="r-bulkstop">Stop</button>` : `<button class="btn primary" data-act="r-bulk" ${missing ? "" : "disabled"}>Fill in ${missing} books</button>`}</div>
    ${b ? `<div style="margin-top:10px">${bar(b.done / Math.max(1, b.total), "var(--moss)")}</div>` : ""}</div>
  <h2>Export</h2>
  <div class="box"><p style="font-size:14px">Download your reading log as a spreadsheet file (CSV).</p><button class="btn" data-act="r-export" style="margin-top:10px">Download reading log</button></div>`;
}
function readBook(id) {
  const b = bookById(id);
  if (!b) return `${readTabs("library")}<div class="box empty" style="margin-top:14px">That book isn't in your library.</div>`;
  const lk = readUI.lookup[id];
  const sess = (b.sessions || []).slice().sort((x, y) => (y.date || "").localeCompare(x.date || ""));
  return `${readTabs("library")}
  <div class="rbook">
    <div class="rbook-side">${coverHTML(b, "lg")}
      <button class="btn sm" data-act="r-lookup" data-id="${b.id}" style="margin-top:10px;width:100%">${lk === "loading" ? "Looking up…" : "Look up cover & pages"}</button>
      ${lk === "none" ? `<div class="sub">Not found on Open Library.</div>` : lk === "error" ? `<div class="sub">Couldn't reach Open Library.</div>` : ""}</div>
    <div class="rbook-main">
      <h1 style="font-size:34px">${esc(b.title)}</h1><p class="subtitle" style="margin-bottom:12px">${esc(b.author || "Unknown author")}${b.pages ? ` · ${b.pages} pages` : ""}${b.year ? ` · ${b.year}` : ""}</p>
      <div class="row" style="margin-bottom:6px">${(b.genres || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("")}${b.fiction != null ? `<span class="chip">${b.fiction ? "Fiction" : "Nonfiction"}</span>` : ""}${b.owned ? `<span class="chip good">On my shelves${b.shelf ? ` · ${esc(b.shelf)}` : ""}</span>` : ""}</div>
      ${b.status === "reading" ? `<div class="box" style="margin-top:12px"><div class="label">Progress</div><div style="margin:8px 0">${bar(pctOf(b), "var(--moss)", "thick")}</div><div class="sub">${pctTxt(pctOf(b))}${b.pages ? ` · page ${b.progress || 0} of ${b.pages}` : ""}</div>${readUI.edit === b.id ? progressForm(b) : `<div class="row" style="margin-top:10px"><button class="btn sm" data-act="r-edit" data-id="${b.id}">Update progress</button><button class="btn primary sm" data-act="r-finish" data-id="${b.id}">Finished</button></div>`}</div>` : ""}
      <form data-form="rbook" class="box" style="margin-top:12px"><input type="hidden" name="id" value="${b.id}">
        <div class="form-grid">
          <label>Status<select name="status">${STATUSES.map(([k, l]) => `<option value="${k}" ${(b.status || "") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label>Started<input type="date" name="started" value="${b.started || ""}"></label>
          <label>Finished<input type="date" name="finished" value="${b.finished || ""}"></label>
          <label>Rating<select name="rating"><option value="">No rating</option>${Array.from({ length: 20 }, (_, i) => (20 - i) / 4).map((r) => `<option value="${r}" ${b.rating === r ? "selected" : ""}>${r} ★</option>`).join("")}</select></label>
          <label>Pages<input type="number" name="pages" min="1" value="${b.pages || ""}"></label>
          <label>Format<select name="format">${FORMATS.map(([k, l]) => `<option value="${k}" ${(b.format || "print") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label>Fiction?<select name="fiction"><option value="">Not set</option><option value="1" ${b.fiction === true ? "selected" : ""}>Fiction</option><option value="0" ${b.fiction === false ? "selected" : ""}>Nonfiction</option></select></label>
          <label>Genres (comma-separated)<input type="text" name="genres" value="${esc((b.genres || []).join(", "))}"></label>
        </div>
        <div class="label" style="margin-top:14px">Moods</div>
        <div class="row" style="margin-top:6px">${MOODS.map((mo) => `<label class="mood"><input type="checkbox" name="mood" value="${mo}" ${(b.moods || []).includes(mo) ? "checked" : ""}><span>${mo}</span></label>`).join("")}</div>
        <div class="label" style="margin-top:14px">Pace</div>
        <div class="row" style="margin-top:6px">${PACES.map((p) => `<label class="mood"><input type="radio" name="pace" value="${p}" ${b.pace === p ? "checked" : ""}><span>${p}</span></label>`).join("")}<label class="mood"><input type="radio" name="pace" value="" ${!b.pace ? "checked" : ""}><span>not set</span></label></div>
        <label class="row" style="margin-top:14px;font-size:14px"><input type="checkbox" name="owned" ${b.owned ? "checked" : ""} style="width:auto"> I own this book</label>
        <label style="display:block;margin-top:12px;font-size:12.5px;color:var(--text-2)">Review / notes<textarea name="review" placeholder="What did you think?">${esc(b.review || "")}</textarea></label>
        <div class="row" style="margin-top:14px;justify-content:space-between"><button class="btn primary" type="submit">Save</button>${b.id.startsWith("lib-") || b.id.startsWith("seed-") ? "" : `<button class="btn danger sm" type="button" data-act="r-del" data-id="${b.id}">Remove book</button>`}</div>
      </form>
      ${sess.length ? `<h2>Reading journal</h2><div class="box"><table class="t"><thead><tr><th>Date</th><th class="num">Progress</th><th class="num">Minutes</th></tr></thead><tbody>${sess.map((s) => `<tr><td>${fmt(s.date)}</td><td class="num">${s.page != null ? `page ${s.page}` : s.pct != null ? pctTxt(s.pct) : ""}</td><td class="num">${s.minutes || ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
    </div></div>`;
}
pages.reading = (param) => {
  const p = param || "";
  const body = p === "stats" ? readStats() : p === "challenges" ? readChallenges() : p === "tbr" ? readTBR() : p === "wishlist" ? readWish() : p === "read" ? readRead() : p === "library" ? readLibrary() : p === "add" ? readAdd() : p === "import" ? readImport() : p.startsWith("b-") ? readBook(p.slice(2)) : readHome();
  return `<header class="page-head"><h1>Reading</h1><p class="subtitle">Your books, your progress, your stats.</p></header>${body}`;
};
pages.reading.after = () => {
  const q = document.querySelector('[data-act="r-libq"]'); if (q && readUI.libQ) { q.value = readUI.libQ; filterLib(readUI.libQ); }
  // fetch missing covers and page counts from Open Library in the background, once per visit
  if (!readUI.autoCovers && apiAvailable()) { readUI.autoCovers = true; setTimeout(bulkLookup, 800); }
};
function filterLib(v) { readUI.libQ = v; const s = v.trim().toLowerCase(); document.querySelectorAll(".rlib-row[data-s]").forEach((li) => { li.style.display = !s || li.dataset.s.includes(s) ? "" : "none"; }); }
document.addEventListener("input", (e) => { if (e.target.dataset && e.target.dataset.act === "r-libq") filterLib(e.target.value); });
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act^='r-']"); if (!el || el.tagName === "INPUT" || el.tagName === "SELECT") return;
  const ds = el.dataset;
  switch (ds.act) {
    case "r-edit": readUI.edit = ds.id || null; render(); return;
    case "r-finish": { const b = bookById(ds.id); patchBook(ds.id, { status: "read", finished: today(), started: b.started || null, progress: b.pages || b.progress, pct: 1 }); readUI.edit = null; commit(false); location.hash = `#reading/b-${ds.id}`; return; }
    case "r-lookup": lookupBook(ds.id); return;
    case "r-start": { const b = bookById(ds.id); patchBook(ds.id, { status: "reading", started: b.started || today() }); commit(); return; }
    case "r-bought": { patchBook(ds.id, { status: "to-read", owned: true }); commit(); return; }
    case "r-chdel": { if (!confirmSafe("Delete this challenge?")) return; R().challenges = (R().challenges || []).filter((c) => c.id !== ds.id); commit(); return; }
    case "r-bulk": bulkLookup(); return;
    case "r-bulkstop": readUI.bulk = null; commit(); return;
    case "r-export": exportReadingCSV(); return;
    case "r-del": { if (!confirmSafe("Remove this book from your log?")) return; patchBook(ds.id, { deleted: true }); commit(false); location.hash = "#reading/library"; return; }
    case "r-addres": {
      const r = readUI.search.results[Number(ds.i)]; if (!r) return;
      const st = (document.getElementById(`rs-st-${ds.i}`) || {}).value ?? "to-read";
      const ex = allBooks().find((b) => normT(b.title) === normT(r.title));
      const id = ex ? ex.id : "u-" + Date.now().toString(36);
      const p = { ...r, status: st, format: "print" }; if (ex) { delete p.title; if (ex.author) delete p.author; }
      if (st === "reading") p.started = today(); if (!ex) p.added = today();
      patchBook(id, p); commit(false); location.hash = `#reading/b-${id}`; return;
    }
  }
});
document.addEventListener("change", (e) => {
  const el = e.target; const a = el.dataset && el.dataset.act; if (!a || !a.startsWith("r-")) return;
  if (a === "r-year") { readUI.statYear = el.value; render(); }
  if (a === "r-month") { readUI.statMonth = el.value; render(); }
  if (a === "r-libf") { readUI.libStatus = el.value; render(); }
  if (a === "r-import") { const f = el.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { readUI.importMsg = importStoryGraph(String(rd.result)); commit(); }; rd.readAsText(f); }
});
document.addEventListener("submit", async (e) => {
  const f = e.target; const kind = f.dataset && f.dataset.form; if (!kind || !kind.startsWith("r")) return;
  e.preventDefault();
  const fd = new FormData(f); const v = Object.fromEntries(fd.entries()); const num = (x) => (x === "" || x == null ? null : Number(x));
  if (kind === "rsearch") {
    readUI.search = { q: v.q, results: [], loading: true, err: "" }; render();
    try { const docs = await olSearch(v.q); readUI.search.results = docs.map(olToBook); if (!docs.length) readUI.search.err = "No matches. Try fewer words, or add it by hand below."; }
    catch (err) { readUI.search.err = "Couldn't reach Open Library. Check your connection, or add the book by hand below."; }
    readUI.search.loading = false; render(); return;
  }
  if (kind === "rprogress") {
    const b = bookById(v.id); const p = {}; const s = { date: v.date || today(), minutes: num(v.minutes) };
    if (num(v.pages)) p.pages = num(v.pages);
    const pagesN = p.pages || b.pages;
    if (v.page != null && v.page !== "") { p.progress = num(v.page); s.page = p.progress; }
    else if (v.pct !== "" && v.pct != null) { const pc = clamp01(num(v.pct) / 100); if (pagesN) { p.progress = Math.round(pc * pagesN); s.page = p.progress; } else { p.pct = pc; s.pct = pc; } }
    if (!b.started) p.started = s.date;
    p.sessions = [...(b.sessions || []), s];
    patchBook(v.id, p); readUI.edit = null; commit(); return;
  }
  if (kind === "rchallenge") { const r = R(); r.challenges = r.challenges || []; r.challenges.push({ id: Date.now().toString(36), name: v.name.trim(), kind: v.kind, target: num(v.target), genre: v.genre.trim(), year: num(v.year) || Number(today().slice(0, 4)) }); commit(); return; }
  if (kind === "rwish") { const id = "u-" + Date.now().toString(36); patchBook(id, { title: v.title.trim(), author: v.author.trim(), status: "wishlist", format: "print", genres: [], added: today() }); commit(); lookupBook(id, true).then(() => commit()); return; }
  if (kind === "rgoal") { R().goals[v.year] = { books: num(v.books), pages: num(v.pages), hours: num(v.hours) }; commit(); return; }
  if (kind === "rmanual") {
    const id = "u-" + Date.now().toString(36);
    patchBook(id, { title: v.title.trim(), author: v.author.trim(), pages: num(v.pages), status: v.status, format: v.format, fiction: v.fiction === "1", owned: !!v.owned, genres: [], added: today(), started: v.status === "reading" ? today() : null });
    commit(false); location.hash = `#reading/b-${id}`; return;
  }
  if (kind === "rbook") {
    const b = bookById(v.id);
    const p = { status: v.status, started: v.started || null, finished: v.finished || null, rating: num(v.rating), pages: num(v.pages), format: v.format,
      fiction: v.fiction === "" ? null : v.fiction === "1", genres: v.genres.split(",").map((x) => x.trim()).filter(Boolean), moods: fd.getAll("mood"), pace: v.pace || null, owned: !!v.owned, review: v.review };
    if (p.status === "read" && !p.finished && b.status !== "read") p.finished = today();
    if (p.status === "reading" && !p.started) p.started = today();
    patchBook(v.id, p); commit();
  }
});

/* ============================== Personal ============================== */
pages.about = () => {
  const A = P.about; const t = today();
  return `<header class="page-head"><h1>About Me</h1><p class="subtitle">From Part 1 of the plan. Everything else traces back to this.</p></header>
  <div class="box prose">${A.intro.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  <h2>My life goals <span class="h-note">the dream and the realistic version; landing anywhere in between counts as a win</span></h2>
  <div class="grid g3" style="align-items:start">${A.goals.map(([h, list], gi) => `<div class="box"><h3>${esc(h)}</h3><ol class="goal-list" start="${A.goals.slice(0, gi).reduce((n, g) => n + g[1].length, 1)}">${list.map(([n, d]) => `<li><b>${esc(n)}</b>${d ? `<div class="sub">${esc(d)}</div>` : ""}</li>`).join("")}</ol></div>`).join("")}</div>
  <h2>Horizons</h2>
  <div class="box"><ul class="timeline" style="--mc:var(--brass)">${P.horizons.map((h) => `<li class="${t >= h.start && (!h.end || t < h.end) ? "now" : ""}"><span class="tl-dot"></span><span class="tl-when">${esc(h.years)}</span><div class="tl-body"><b>Horizon ${h.n}: ${esc(h.name)}</b>${t >= h.start && (!h.end || t < h.end) ? ` <span class="chip good">Now</span>` : ""}<div class="sub">Ages ${esc(h.ages)}</div></div></li>`).join("")}</ul></div>
  <h2>Life domains</h2>
  <div class="box"><p style="margin:0 0 12px">${esc(A.domainsWhy)}</p><div class="row">${P.domains.map((d) => `<a class="chip" href="#${ROUTES.find((r) => r.dom === d.id).id}"><span class="dot" style="background:${d.color}"></span>${esc(d.name)}</a>`).join("")}</div></div>
  <h2>Guardrails</h2>
  <div class="grid g3">${P.guardrails.map(([n, d]) => `<div class="box tight"><h3 style="margin-bottom:4px">${esc(n)}</h3><div class="sub" style="font-size:13px">${esc(d)}</div></div>`).join("")}</div>`;
};

let jDate = null;
pages.journal = () => {
  const t = today(); const d = jDate || t; const J = PRIV().journal; const e = J[d] || {};
  const past = Object.keys(J).filter((k) => J[k] && J[k].text).sort().reverse();
  const month = past.filter((k) => k.slice(0, 7) === t.slice(0, 7)).length;
  return `<header class="page-head"><h1>Journal</h1><p class="subtitle">Private to you: only your login can see these entries.</p></header>
  <div class="daynav">
    <button class="btn sm" data-act="j-day" data-n="-1">‹ Previous day</button>
    <strong style="font-size:16px;margin:0 6px">${fmtLong(d)}</strong>
    <button class="btn sm" data-act="j-day" data-n="1" ${d >= t ? "disabled" : ""}>Next day ›</button>
    ${d !== t ? `<button class="btn sm" data-act="j-day" data-n="0">Back to today</button>` : ""}
    <input type="date" data-act="j-pick" value="${d}" max="${t}" style="width:auto;margin-left:auto">
  </div>
  <form data-form="journal" class="box"><input type="hidden" name="date" value="${d}">
    <textarea name="text" class="journal-text" placeholder="What happened today? What's on your mind?">${esc(e.text || "")}</textarea>
    <div class="row" style="margin-top:10px"><label class="ci-time">Minutes spent <input type="number" name="mins" min="0" value="${e.mins || ""}" style="width:90px"></label>
      <span class="sub" style="margin:0">30 minutes or more ticks “Journal” on the daily check-in.</span>
      <button class="btn primary" type="submit" style="margin-left:auto">Save entry</button></div>
    ${e.saved ? `<div class="sub" style="margin-top:6px">Last saved ${new Date(e.saved).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>` : ""}
  </form>
  <h2>Past entries <span class="h-note">${plural(past.length, "entry")} · ${month} this month</span></h2>
  <div class="box">${past.length ? `<ul class="j-list">${past.slice(0, 60).map((k) => `<li><button data-act="j-open" data-date="${k}" class="${k === d ? "on" : ""}"><b>${fmt(k, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</b>${J[k].mins ? ` <span class="chip">${J[k].mins} min</span>` : ""}<span class="sub">${esc(J[k].text.slice(0, 160))}${J[k].text.length > 160 ? "…" : ""}</span></button></li>`).join("")}</ul>` : `<div class="empty">No entries yet.</div>`}</div>`;
};

/* ============================== Contacts ============================== */
const contactUI = { open: null, edit: false, cat: "all" };
const initials = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const avatar = (c, cls = "") => c.photo ? `<img class="avatar ${cls}" src="${c.photo}" alt="">` : `<span class="avatar ${cls}">${c.category === "pets" ? "🐾" : esc(initials(c.name))}</span>`;
const nextBday = (c) => { if (!c.birthday) return null; const t = today(); let d = `${t.slice(0, 4)}-${c.birthday.slice(5)}`; if (d < t) d = `${Number(t.slice(0, 4)) + 1}-${c.birthday.slice(5)}`; return d; };
const bdayTxt = (c) => c.birthday ? (c.birthday.startsWith("0000") ? fmt("2000" + c.birthday.slice(4), { day: "numeric", month: "long" }) : fmt(c.birthday, { day: "numeric", month: "long", year: "numeric" })) : "";
pages.contacts = () => {
  const list = contacts().slice().sort((a, b) => a.name.localeCompare(b.name));
  const f = contactUI.cat; const show = list.filter((c) => f === "all" || c.category === f);
  const t = today();
  const soon = list.filter((c) => c.birthday).map((c) => ({ c, d: nextBday(c) })).filter((x) => daysBetween(t, x.d) <= 45).sort((a, b) => a.d.localeCompare(b.d));
  const catName = Object.fromEntries(CONTACT_CATS);
  return `<header class="page-head"><h1>Family & Found Family</h1><p class="subtitle">Everyone in our circle, with the details that help me show up for them.</p></header>
  ${soon.length ? `<div class="box tight" style="margin-bottom:14px"><b>Birthdays coming up:</b> ${soon.map(({ c, d }) => `${esc(c.name)} ${fmtShort(d)} (${relDays(d)}${ageOn(c.birthday, d) != null ? `, turns ${ageOn(c.birthday, d)}` : ""})`).join(" · ")}</div>` : ""}
  <div class="row" style="margin-bottom:14px"><div class="seg" style="margin-left:0">${[["all", "Everyone"], ...CONTACT_CATS].map(([k, l]) => `<button data-act="ct-cat" data-k="${k}" class="${f === k ? "on" : ""}">${l} <span class="muted">${k === "all" ? list.length : list.filter((c) => c.category === k).length}</span></button>`).join("")}</div>
    <button class="btn primary" data-act="ct-new" style="margin-left:auto">+ Add a person</button></div>
  <div class="grid ct-grid">${show.map((c) => { const age = ageOn(c.birthday, t);
    return `<button class="box ct-card" data-act="ct-open" data-id="${c.id}">${avatar(c)}<div class="ct-body"><b>${esc(c.name)}</b>
      <div class="sub">${c.birthday ? `🎂 ${bdayTxt(c)}${age != null ? ` · ${age} years old` : ""}` : `<span class="muted">No birthday yet</span>`}</div>
      <div class="sub">${c.address ? esc(c.address.split("\n")[0]) : ""}</div>
      <span class="chip" style="margin-top:6px">${esc(catName[c.category] || "")}</span></div></button>`; }).join("") || `<div class="box empty">Nobody in this group yet.</div>`}</div>
  ${contactModal()}`;
};
function contactModal() {
  if (!contactUI.open) return "";
  const isNew = contactUI.open === "new"; const c = isNew ? { category: "family" } : contacts().find((x) => x.id === contactUI.open); if (!c) return "";
  const t = today(); const age = ageOn(c.birthday, t); const catName = Object.fromEntries(CONTACT_CATS);
  if (!isNew && !contactUI.edit) {
    const line = (k, v, html) => v ? `<div class="ct-line"><span class="label">${k}</span><span>${html || esc(v)}</span></div>` : "";
    return `<div class="modal-bg" data-act="ct-close"><div class="modal ct-modal" data-act="noop" role="dialog" aria-label="${esc(c.name)}">
      <div class="row" style="flex-wrap:nowrap;gap:16px;align-items:center">${avatar(c, "lg")}<div style="flex:1"><h3 style="font-size:22px;margin:0">${esc(c.name)}</h3><span class="chip">${esc(catName[c.category] || "")}</span></div><button class="x-btn" data-act="ct-close" aria-label="Close">×</button></div>
      <div style="margin-top:14px">
        ${line("Birthday", c.birthday, `${bdayTxt(c)}${age != null ? ` · ${age} years old` : ""}${c.birthday ? ` · next ${relDays(nextBday(c))}` : ""}`)}
        ${line("Address", c.address, esc(c.address || "").replace(/\n/g, "<br>"))}
        ${line("Telephone", c.phone, `<a href="tel:${esc((c.phone || "").replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a>`)}
        ${line("Email", c.email, `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`)}
        ${line("Notes", c.notes, esc(c.notes || "").replace(/\n/g, "<br>"))}
        ${!c.birthday && !c.address && !c.phone && !c.email ? `<div class="sub">No details yet. Press Edit to add them.</div>` : ""}
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn danger" data-act="ct-del" data-id="${c.id}">Delete</button><button class="btn primary" data-act="ct-edit">Edit</button></div>
    </div></div>`;
  }
  return `<div class="modal-bg" data-act="ct-close"><div class="modal ct-modal" data-act="noop" role="dialog" aria-label="${isNew ? "Add a person" : "Edit " + esc(c.name)}">
    <form data-form="contact"><input type="hidden" name="id" value="${isNew ? "" : esc(c.id)}">
      <div class="row" style="gap:14px;align-items:center;flex-wrap:nowrap">${avatar(c, "lg")}<div><label class="btn sm">Choose a photo<input type="file" accept="image/*" data-act="ct-photo" hidden></label>${c.photo ? ` <button type="button" class="btn sm" data-act="ct-nophoto">Remove photo</button>` : ""}<div class="sub">Shrunk to a small square before it's saved.</div></div></div>
      <div class="form-grid" style="margin-top:12px">
        <label>Name<input type="text" name="name" value="${esc(c.name || "")}" required></label>
        <label>Category<select name="category">${CONTACT_CATS.map(([k, l]) => `<option value="${k}" ${c.category === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Birthday<input type="date" name="birthday" value="${c.birthday && !c.birthday.startsWith("0000") ? c.birthday : ""}"></label>
        <label>Telephone<input type="tel" name="phone" value="${esc(c.phone || "")}"></label>
        <label>Email<input type="email" name="email" value="${esc(c.email || "")}"></label>
      </div>
      <label class="blk">Address<textarea name="address" rows="3">${esc(c.address || "")}</textarea></label>
      <label class="blk">Notes<textarea name="notes" rows="3">${esc(c.notes || "")}</textarea></label>
      <div class="row" style="margin-top:14px;justify-content:flex-end"><button type="button" class="btn" data-act="ct-close">Cancel</button><button class="btn primary" type="submit">Save</button></div>
    </form></div></div>`;
}
let ctPhotoDraft = undefined; // photo picked in the edit form, saved on Save
function shrinkPhoto(file) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const S = 240; const c = document.createElement("canvas"); c.width = c.height = S; const k = Math.max(S / img.width, S / img.height); const w = img.width * k, h = img.height * k;
      c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.82)); };
    img.onerror = rej; img.src = url;
  });
}

/* ============================== Health trackers ============================== */
const medsList = () => { const m = PRIV().meds; if (!m.list) m.list = []; return m.list; };
const medsTaken = (d) => PRIV().meds.log[d] || {};
let medsDate = null;
pages.meds = () => {
  const t = today(); const d = medsDate || t; const list = medsList(); const log = medsTaken(d);
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  return `<header class="page-head"><h1>Meds tracker</h1><p class="subtitle">Private to you. Ticking every med for the day also ticks “Take meds” on the daily check-in.</p></header>
  <div class="daynav"><button class="btn sm" data-act="md-day" data-n="-1">‹</button><strong style="font-size:16px;margin:0 6px">${fmtLong(d)}</strong><button class="btn sm" data-act="md-day" data-n="1" ${d >= t ? "disabled" : ""}>›</button>${d !== t ? `<button class="btn sm" data-act="md-day" data-n="0">Today</button>` : ""}</div>
  <div class="box">${list.length ? list.map((m) => `<div class="checkin-row">${chk(!!log[m.id], "md-tick", `data-id="${m.id}" data-date="${d}"`, "big-chk")}
      <div class="ci-text"><b>${esc(m.name)}</b>${m.dose ? ` <span class="chip">${esc(m.dose)}</span>` : ""}<div class="sub">${esc(m.when || "")}${m.notes ? ` · ${esc(m.notes)}` : ""}</div></div>
      <div class="days14">${days.map((x) => `<span class="${medsTaken(x)[m.id] ? "on" : ""}" title="${fmtShort(x)}"></span>`).join("")}</div>
      <button class="x-btn" data-act="md-del" data-id="${m.id}" title="Remove">×</button></div>`).join("") : `<div class="empty">Add your meds below and tick them off each day.</div>`}</div>
  <h2>Add a med</h2>
  <div class="box"><form data-form="med" class="form-grid">
    <label>Name<input type="text" name="name" required></label><label>Dose<input type="text" name="dose" placeholder="e.g. 20 mg"></label>
    <label>When<select name="when"><option>Morning</option><option>Midday</option><option>Evening</option><option>Bedtime</option><option>As needed</option></select></label>
    <label>Notes<input type="text" name="notes" placeholder="with food, refill date…"></label>
    <label>&nbsp;<button class="btn primary" type="submit">Add</button></label></form></div>`;
};

const MOOD_SCALES = [["mood", "Mood", ["Awful", "Low", "Okay", "Good", "Great"]], ["anxiety", "Anxiety", ["None", "A little", "Some", "High", "Very high"]], ["energy", "Energy", ["Drained", "Low", "Okay", "Good", "Full"]]];
let moodDate = null;
pages.mood = () => {
  const t = today(); const d = moodDate || t; const M = PRIV().mood; const e = M[d] || {};
  const days = Array.from({ length: 30 }, (_, i) => addDays(t, i - 29));
  const avg = (k, n) => { const v = days.slice(-n).map((x) => (M[x] || {})[k]).filter(Boolean); return v.length ? (sum(v) / v.length).toFixed(1) : "–"; };
  const therapy = days.filter((x) => (M[x] || {}).therapy).length;
  return `<header class="page-head"><h1>Mental health</h1><p class="subtitle">Private to you. A quick check-in each day shows patterns over time.</p></header>
  <div class="daynav"><button class="btn sm" data-act="mo-day" data-n="-1">‹</button><strong style="font-size:16px;margin:0 6px">${fmtLong(d)}</strong><button class="btn sm" data-act="mo-day" data-n="1" ${d >= t ? "disabled" : ""}>›</button>${d !== t ? `<button class="btn sm" data-act="mo-day" data-n="0">Today</button>` : ""}</div>
  <div class="box">${MOOD_SCALES.map(([k, l, words]) => `<div class="mood-row"><span class="label">${l}</span><div class="seg" style="margin-left:0">${words.map((w, i) => `<button data-act="mo-set" data-k="${k}" data-v="${i + 1}" data-date="${d}" class="${e[k] === i + 1 ? "on" : ""}">${i + 1} · ${w}</button>`).join("")}</div></div>`).join("")}
    <div class="mood-row"><span class="label">Therapy</span><label class="row" style="font-size:14px"><input type="checkbox" data-act="mo-therapy" data-date="${d}" ${e.therapy ? "checked" : ""} style="width:auto"> Had a therapy session today</label></div>
    <label class="blk">Notes<textarea data-act="mo-note" data-date="${d}" placeholder="What affected how you felt?">${esc(e.note || "")}</textarea></label></div>
  <div class="grid g4" style="margin-top:14px">
    <div class="box tight"><div class="label">Mood, last 7 days</div><div class="big md">${avg("mood", 7)}</div><div class="sub">30 days: ${avg("mood", 30)} (1-5)</div></div>
    <div class="box tight"><div class="label">Anxiety, last 7 days</div><div class="big md">${avg("anxiety", 7)}</div><div class="sub">30 days: ${avg("anxiety", 30)} (1-5)</div></div>
    <div class="box tight"><div class="label">Energy, last 7 days</div><div class="big md">${avg("energy", 7)}</div><div class="sub">30 days: ${avg("energy", 30)} (1-5)</div></div>
    <div class="box tight"><div class="label">Therapy sessions</div><div class="big md">${therapy}</div><div class="sub">in the last 30 days</div></div>
  </div>
  <h2>Last 30 days</h2>
  <div class="box scroll-x"><div class="heat">${MOOD_SCALES.map(([k, l]) => `<span class="label">${l}</span>${days.map((x) => { const v = (M[x] || {})[k]; return `<span class="hc" style="${v ? `background:color-mix(in srgb, var(--${k === "anxiety" ? "d-health" : k === "energy" ? "d-finances" : "accent"}) ${v * 20}%, var(--panel-2))` : ""}" data-tip="${esc(`${fmt(x, { weekday: "short", day: "numeric", month: "short" })}<br>${l}: <b>${v || "–"}</b>`)}"></span>`; }).join("")}`).join("")}
    <span></span>${days.map((x, i) => `<span class="hl">${i % 7 === 0 || i === 29 ? parseD(x).getDate() : ""}</span>`).join("")}</div>
    <div class="sub" style="margin-top:8px">Darker = higher. For anxiety, darker means more anxious.</div></div>`;
};

const FLOWS = [["spotting", "Spotting"], ["light", "Light"], ["medium", "Medium"], ["heavy", "Heavy"]];
function cycleInfo() {
  const days = PRIV().cycle.days; const flowDays = Object.keys(days).filter((d) => days[d] && days[d] !== "spotting").sort();
  const starts = flowDays.filter((d) => !days[addDays(d, -1)] || days[addDays(d, -1)] === "spotting").filter((d, i, arr) => !i || daysBetween(arr[i - 1], d) > 10);
  const lens = starts.slice(1).map((d, i) => daysBetween(starts[i], d)).filter((n) => n >= 18 && n <= 45).slice(-6);
  const cycleLen = lens.length ? Math.round(sum(lens) / lens.length) : 28;
  const periodLens = starts.map((s) => { let n = 0; while (days[addDays(s, n)] && days[addDays(s, n)] !== "spotting" && n < 15) n++; return n; }).slice(-6);
  const periodLen = periodLens.length ? Math.round(sum(periodLens) / periodLens.length) : 5;
  const last = starts[starts.length - 1] || null; const t = today();
  let next = last ? addDays(last, cycleLen) : null; while (next && next < t) next = addDays(next, cycleLen);
  return { starts, cycleLen, periodLen, last, next, day: last ? daysBetween(last, t) + 1 : null, measured: lens.length };
}
let cycleMonth = 0;
pages.cycle = () => {
  const t = today(); const C = PRIV().cycle.days; const ci = cycleInfo();
  const first = addMonths(t.slice(0, 8) + "01", cycleMonth); const start = sundayOf(first); const end = addDays(sundayOf(addDays(addMonths(first, 1), -1)), 6);
  const predicted = new Set(); if (ci.next) for (let n = 0; n < 3; n++) for (let i = 0; i < ci.periodLen; i++) predicted.add(addDays(ci.next, n * ci.cycleLen + i));
  const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return `<header class="page-head"><h1>Period tracker</h1><p class="subtitle">Private to you. Tap a day to log flow; tap again to change it.</p></header>
  <div class="grid g4">
    <div class="box tight"><div class="label">Cycle day</div><div class="big md">${ci.day ? ci.day : "–"}</div><div class="sub">${ci.last ? `Last period started ${fmt(ci.last)}` : "Log your last period to start"}</div></div>
    <div class="box tight"><div class="label">Next period (estimate)</div><div class="big md">${ci.next ? fmtShort(ci.next) : "–"}</div><div class="sub">${ci.next ? relDays(ci.next) : ""}</div></div>
    <div class="box tight"><div class="label">Average cycle</div><div class="big md">${ci.cycleLen} days</div><div class="sub">${ci.measured ? `from ${plural(ci.measured, "cycle")}` : "assumed until 2 periods are logged"}</div></div>
    <div class="box tight"><div class="label">Average period</div><div class="big md">${ci.periodLen} days</div><div class="sub">${ci.starts.length ? `from ${plural(Math.min(6, ci.starts.length), "period")}` : "assumed"}</div></div>
  </div>
  <div class="box" style="margin-top:14px"><div class="dc-head"><h3>${fmt(first, { month: "long", year: "numeric" })}</h3><span class="row" style="gap:4px">${cycleMonth ? `<button class="btn sm" data-act="cy-month" data-n="0">This month</button>` : ""}<button class="x-btn" data-act="cy-month" data-n="-1">‹</button><button class="x-btn" data-act="cy-month" data-n="1">›</button></span></div>
    <div class="cy-grid">${DOW.map((x) => `<span class="dm-h">${x}</span>`).join("")}${days.map((d) => { const f = C[d]; return `<button class="cy-day ${d.slice(0, 7) !== first.slice(0, 7) ? "out" : ""} ${d === t ? "today" : ""} ${f ? "f-" + f : predicted.has(d) ? "pred" : ""}" data-act="cy-tap" data-date="${d}" ${d > t ? "disabled" : ""} title="${fmtLong(d)}${f ? " · " + f : predicted.has(d) ? " · predicted" : ""}"><span>${parseD(d).getDate()}</span>${f ? `<small>${f}</small>` : ""}</button>`; }).join("")}</div>
    <div class="legend" style="margin-top:10px">${FLOWS.map(([k, l]) => `<span><span class="cy-key f-${k}"></span>${l}</span>`).join("")}<span><span class="cy-key pred"></span>Predicted</span></div>
    <div class="sub" style="margin-top:6px">Estimates are only a guide and get better as you log more cycles.</div></div>`;
};

/* ============================== Travel ============================== */
const bucketKeys = { all: "bucketAll", eu: "bucket" };
function bucketBox(which, title, note) {
  const list = ensureList(bucketKeys[which]);
  return `<div><h2>${title} <span class="h-note">${list.filter((b) => b.done).length} / ${list.length} done${note ? " · " + note : ""}</span></h2><div class="box">
    ${list.length ? `<ul class="list-edit">${list.map((b, i) => `<li>${chk(b.done, "bl-tick", `data-w="${which}" data-i="${i}"`)}<span class="grow ${b.done ? "muted" : ""}" style="${b.done ? "text-decoration:line-through" : ""}">${i + 1}. ${esc(b.t)}</span>${b.done && b.date ? `<span class="sub" style="margin:0">${fmt(b.date)}</span>` : ""}<button class="x-btn" data-act="bl-del" data-w="${which}" data-i="${i}" title="Remove">×</button></li>`).join("")}</ul>` : `<div class="empty">Nothing here yet.</div>`}
    <input type="text" placeholder="+ Add a place or experience and press Enter" data-act="bl-add" data-w="${which}" style="margin-top:10px"></div></div>`;
}
pages.bucket = () => `<header class="page-head"><h1>Bucket lists</h1><p class="subtitle">The living, not just the planning for later.</p></header>
  <div class="grid g2" style="align-items:start">${bucketBox("all", "My full bucket list", "")}${bucketBox("eu", "European bucket list", "2026-2029, while we're in Germany")}</div>`;

const allTravels = () => [...(window.TRAVELS || []).map((x, i) => ({ ...x, id: "fb" + i })), ...(state.travels || []).map((x, i) => ({ ...x, id: "u" + i, mine: true }))];
let travelYear = "all";
pages.places = () => {
  const all = allTravels(); const years = [...new Set(all.map((x) => x.year || (x.date || "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const countries = new Set(all.map((x) => x.country).filter(Boolean));
  const show = all.filter((x) => travelYear === "all" || (x.year || (x.date || "").slice(0, 4)) === travelYear);
  const byYear = {}; show.forEach((x) => { const y = x.year || (x.date || "").slice(0, 4) || "Undated"; const tr = x.trip || x.place; ((byYear[y] = byYear[y] || {})[tr] = byYear[y][tr] || []).push(x); });
  const when = (list) => { const ds = list.map((x) => x.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort(); const ends = list.map((x) => x.end || x.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (!ds.length) { const m = list.map((x) => x.date).find((d) => /^\d{4}-\d{2}$/.test(d)); return m ? fmt(m + "-01", { month: "long" }) : ""; }
    const a = ds[0], b = ends[ends.length - 1]; return a === b ? fmt(a, { day: "numeric", month: "short" }) : `${fmt(a, { day: "numeric", month: "short" })} – ${fmt(b, { day: "numeric", month: "short" })}`; };
  return `<header class="page-head"><h1>Past travels</h1><p class="subtitle">Places I've been, by year. Pulled from Facebook on 1 Nov 2026, plus anything added here.</p></header>
  <div class="grid g3">
    <div class="box tight"><div class="label">Places</div><div class="big md">${all.length}</div></div>
    <div class="box tight"><div class="label">Countries</div><div class="big md">${countries.size}</div><div class="sub">${[...countries].sort().slice(0, 40).join(", ")}</div></div>
    <div class="box tight"><div class="label">Years of travel</div><div class="big md">${years.length}</div><div class="sub">${years[years.length - 1] || ""} – ${years[0] || ""}</div></div>
  </div>
  <h2>Map</h2>
  <div class="box" style="padding:0;overflow:hidden"><iframe class="places-map" src="places.html" title="Map of places I've been" loading="lazy"></iframe></div>
  <div class="sub" style="margin-top:6px">The map shows the places from the Facebook pull. Trips added below show in the list.</div>
  <h2>By year</h2>
  <div class="row" style="margin-bottom:12px"><div class="seg" style="margin-left:0;flex-wrap:wrap">${["all", ...years].map((y) => `<button data-act="tr-year" data-y="${y}" class="${travelYear === y ? "on" : ""}">${y === "all" ? "All years" : y}</button>`).join("")}</div></div>
  ${Object.keys(byYear).sort().reverse().map((y) => `<h3 class="ryear">${y} <span class="muted">· ${plural(Object.keys(byYear[y]).length, "trip")}</span></h3><div class="box"><ul class="trips">
    ${Object.entries(byYear[y]).sort((a, b) => (b[1][0].date || "").localeCompare(a[1][0].date || "")).map(([trip, list]) => { const where = [...new Set(list.map((x) => [x.city, x.country].filter(Boolean).join(", ")).filter(Boolean))];
      return `<li><div class="trip-when">${when(list)}</div><div><b>${esc(trip)}</b><div class="sub">${esc(where.join(" · ") || "No place given")}</div>
        ${list.length > 1 || list[0].place !== trip ? `<div class="trip-places">${list.map((x) => `<span class="chip">${esc(x.place)}${x.mine ? ` <button class="x-btn" data-act="tr-del" data-i="${x.id.slice(1)}" title="Remove">×</button>` : ""}</span>`).join("")}</div>` : list[0].mine ? `<button class="x-btn" data-act="tr-del" data-i="${list[0].id.slice(1)}" title="Remove">× remove</button>` : ""}
        ${list.map((x) => x.notes).filter(Boolean).length ? `<div class="sub">${esc([...new Set(list.map((x) => x.notes).filter(Boolean))].join(" · "))}</div>` : ""}</div></li>`; }).join("")}</ul></div>`).join("")}
  <h2>Add a trip or place</h2>
  <div class="box"><form data-form="travel" class="form-grid">
    <label>Date<input type="date" name="date" required></label><label>End date<input type="date" name="end"></label>
    <label>Place<input type="text" name="place" placeholder="e.g. Christmas market" required></label><label>City / region<input type="text" name="city"></label>
    <label>Country<input type="text" name="country"></label><label>Trip name<input type="text" name="trip" placeholder="Groups places into one trip"></label>
    <label>&nbsp;<button class="btn primary" type="submit">Add</button></label></form></div>`;
};

pages.settings = () => `
  <h1>Settings & backup</h1>
  <p class="subtitle">Your ticks and entries are saved to your private Cloudflare database and also kept on this device.</p>
  <div class="box">
    <h3>Sync</h3>
    <p class="sub" style="font-size:14px">Status: <b>${{ synced: "Synced", saving: "Saving…", offline: "Couldn't reach the database (kept on this device)", local: "Saved on this device only (opened as a local file)" }[sync.status]}</b>${sync.at ? ` · last synced ${new Date(sync.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
    <div class="row" style="margin-top:10px"><button class="btn" data-act="sync-now">Sync now</button></div>
  </div>
  <div class="box" style="margin-top:14px">
    <h3>Google Calendar</h3>
    <p class="sub" style="font-size:14px">${gcal.connected ? `<span class="good">Connected</span>: ${gcal.calendars.map((g) => esc(g.name)).join(", ")}. Events update about every 5 minutes; edit them in Google Calendar.` : gcal.connected === false ? "Not connected yet. Add your calendars' secret iCal addresses as the GCAL_FEEDS secret (see the README)." : "Open the Calendar page to check the connection."}</p>
    ${gcal.errors.length ? `<div class="note" style="margin-top:8px">${gcal.errors.map(esc).join("<br>")}</div>` : ""}
  </div>
  <div class="box" style="margin-top:14px">
    <h3>Garmin</h3>
    <p class="sub" style="font-size:14px">${garmin.connected && garmin.ok ? `<span class="good">Connected</span>. Workouts tick off matching training-plan sessions; sleep, HRV, Body Battery and steps show on the Health page.` : garmin.connected && !garmin.ok ? `<span class="bad">${esc(garmin.error)}</span> Create a new key in Garmin Connect and save it again (see the README).` : garmin.connected === false ? "Not connected yet. Save your Garmin personal API key as the GARMIN_API_KEY secret (see the README)." : "Open the Health page to check the connection."}</p>
    ${Object.keys(garmin.errors || {}).length ? `<div class="note" style="margin-top:8px">Some Garmin data couldn't be read: ${Object.entries(garmin.errors).map(([k, v]) => `${esc(k)} (${esc(v)})`).join(", ")}</div>` : ""}
    <div class="row" style="margin-top:10px"><button class="btn sm" data-act="garmin-refresh">Refresh Garmin data</button></div>
    ${Object.keys(garmin.shapes || {}).length ? `<details style="margin-top:10px"><summary class="sub" style="cursor:pointer">Technical details (field names Garmin sent)</summary><pre style="white-space:pre-wrap;font-size:11px;margin-top:6px">${esc(JSON.stringify(garmin.shapes, null, 1))}</pre></details>` : ""}
  </div>
  ${document.querySelector('link[rel="stylesheet"][href="theme.css"]') ? "" : "<!--"}<div class="box" style="margin-top:14px">
    <h3>Season colours</h3>
    <p class="sub" style="font-size:14px">The colours turn with the Wheel of the Year: spring from Ostara (20 Mar), summer from Litha (21 Jun), autumn from Mabon (22 Sep), winter from Yule (21 Dec). Now showing: <b>${activeSeason()[0].toUpperCase() + activeSeason().slice(1)}</b>.</p>
    <div class="row" style="margin-top:10px"><select data-act="season-theme" style="width:auto">${[["", "Follow the seasons"], ["winter", "Always winter"], ["spring", "Always spring"], ["summer", "Always summer"], ["autumn", "Always autumn"]].map(([v, l]) => `<option value="${v}" ${(state.seasonTheme || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
  </div>${document.querySelector('link[rel="stylesheet"][href="theme.css"]') ? "" : "-->"}
  <div class="box" style="margin-top:14px">
    <h3>Backup</h3>
    <p class="sub" style="font-size:14px">Download everything you've entered as a file, or restore from one. Your database also keeps a daily backup automatically.</p>
    <div class="row" style="margin-top:10px"><button class="btn" data-act="export">Download backup</button>
      <label class="btn">Restore from file<input type="file" accept="application/json" data-act="import" hidden></label></div>
  </div>
  <div class="box" style="margin-top:14px">
    <h3>Your plan</h3>
    <p class="sub" style="font-size:14px">Projects, tasks, training plans, menus and targets live in <code>data.js</code> in your GitHub repo. Edit it there and the site updates within a minute.</p>
  </div>`;

/* ============================== render ============================== */
let lastRoute = null;
function render() {
  if (glassSeason && activeSeason() !== glassSeason) applyGlass();
  const [route, param] = (location.hash.slice(1) || "dashboard").split("?")[0].split("/");
  const r = pages[route] ? route : "dashboard";
  const key = r + "/" + (param || "");
  renderNav(r);
  const main = document.getElementById("main");
  const y = window.scrollY;
  // keep anything typed into a form that hasn't been submitted yet
  const typed = key === lastRoute ? [...main.querySelectorAll("form[data-form] input")].filter((i) => i.value !== i.defaultValue).map((i) => [i.form.dataset.form, i.name, i.value]) : [];
  main.innerHTML = pages[r](param);
  typed.forEach(([f, n, v]) => { const i = main.querySelector(`form[data-form="${f}"] [name="${n}"]`); if (i) i.value = v; });
  if (pages[r].after) pages[r].after(param);
  const art = r === "artifacts" && param && (window.ARTIFACTS || []).find((a) => a.id === param);
  document.title = (art ? art.title : (ROUTES.find((x) => x.id === r) || {}).label) + " · " + P.title;
  if (key !== lastRoute) window.scrollTo(0, 0); else window.scrollTo(0, y);
  lastRoute = key;
  setSync(sync.status);
}
window.addEventListener("hashchange", () => { ciDate = null; cal.modal = null; contactUI.open = null; render(); });

/* ============================== events ============================== */
const ensureSpaces = () => { if (!state.spaces) state.spaces = P.defaults.homeSpaces.map((s) => ({ name: s.name, month: s.month, tasks: s.tasks.map((x) => ({ t: x, done: false })) })); return state.spaces; };
const ensureList = (k) => { if (!state[k]) state[k] = JSON.parse(JSON.stringify(P.defaults[k])); return state[k]; };

document.addEventListener("click", (e) => {
  if (e.target.closest("a.signout")) { try { localStorage.removeItem(LS_KEY); } catch (x) {} return; }
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act; const ds = el.dataset;
  if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") return;
  if (el.closest("summary")) e.preventDefault();
  switch (a) {
    case "task": { const t = TASK[ds.id]; state.tasks[t.id] = status(t) === "done" ? "todo" : "done"; break; }
    case "started": { const t = TASK[ds.id]; state.tasks[t.id] = status(t) === "started" ? "todo" : "started"; break; }
    case "session": { if (state.sessions[ds.key]) delete state.sessions[ds.key]; else state.sessions[ds.key] = true; break; }
    case "habit": { const c = state.checkins[ds.date] = state.checkins[ds.date] || {}; c[ds.h] = !c[ds.h]; break; }
    case "ci-day": { const n = Number(ds.n); ciDate = n === 0 ? null : addDays(ciDate || today(), n); if (ciDate && ciDate >= today()) ciDate = null; render(); return; }
    case "meal-year": { mealYear = (mealYear || isoWeek(today()).y) + Number(ds.n); render(); return; }
    case "mealweek": { state.mealWeeks[ds.k] = !state.mealWeeks[ds.k]; break; }
    case "event": { const ev = state.events[ds.id] = state.events[ds.id] || {}; ev.done = !ev.done; ev.date = ev.done ? today() : null; break; }
    case "r222": { state.rule222.done[ds.k] = !state.rule222.done[ds.k]; break; }
    case "sp-task": { const s = ensureSpaces()[ds.si]; s.tasks[ds.ti].done = !s.tasks[ds.ti].done; break; }
    case "sp-tdel": { ensureSpaces()[ds.si].tasks.splice(ds.ti, 1); break; }
    case "sp-del": { if (!confirmSafe("Remove this space?")) return; ensureSpaces().splice(ds.si, 1); break; }
    case "sp-new": { ensureSpaces().push({ name: "New space", month: "", tasks: ["Fully unpacked", "Art and photos up", "Small annoyances fixed"].map((t) => ({ t, done: false })) }); break; }
    case "study-block": { state.studyDone[ds.i] = !state.studyDone[ds.i]; break; }
    case "bucket-tick": { const b = ensureList("bucket")[ds.i]; b.done = !b.done; break; }
    case "bucket-del": { ensureList("bucket").splice(ds.i, 1); break; }
    case "country-del": { ensureList("countries").splice(ds.i, 1); break; }
    case "pt-del": { state.ptScores.splice(ds.i, 1); break; }
    case "body-del": { if (!confirmSafe("Delete this entry?")) return; state.body.entries.splice(ds.i, 1); break; }
    case "snap-del": { if (!confirmSafe("Delete this snapshot?")) return; state.snapshots.splice(ds.i, 1); break; }
    case "sync-now": { pullRemote().then(render); return; }
    case "export": { exportState(); return; }
    case "print": { window.print(); return; }
    case "noop": return;
    case "j-day": { const n = Number(ds.n); jDate = n === 0 ? null : addDays(jDate || today(), n); if (jDate && jDate >= today()) jDate = null; render(); return; }
    case "j-open": { jDate = ds.date === today() ? null : ds.date; render(); window.scrollTo(0, 0); return; }
    case "ct-cat": { contactUI.cat = ds.k; render(); return; }
    case "ct-new": { contactUI.open = "new"; contactUI.edit = true; ctPhotoDraft = undefined; render(); return; }
    case "ct-open": { contactUI.open = ds.id; contactUI.edit = false; ctPhotoDraft = undefined; render(); return; }
    case "ct-edit": { contactUI.edit = true; ctPhotoDraft = undefined; render(); return; }
    case "ct-close": { contactUI.open = null; contactUI.edit = false; render(); return; }
    case "ct-nophoto": { ctPhotoDraft = null; const av = document.querySelector(".ct-modal .avatar.lg"); if (av) av.outerHTML = `<span class="avatar lg">–</span>`; el.remove(); return; }
    case "ct-del": { const c = contacts().find((x) => x.id === ds.id); if (!c || !confirmSafe(`Delete ${c.name}?`)) return; state.contacts = contacts().filter((x) => x.id !== ds.id); contactUI.open = null; break; }
    case "md-day": { const n = Number(ds.n); medsDate = n === 0 ? null : addDays(medsDate || today(), n); if (medsDate && medsDate >= today()) medsDate = null; render(); return; }
    case "md-tick": { const m = PRIV().meds; const l = m.log[ds.date] = m.log[ds.date] || {}; l[ds.id] = !l[ds.id]; const list = medsList();
      if (list.length) { const c = state.checkins[ds.date] = state.checkins[ds.date] || {}; c.meds = list.every((x) => l[x.id]); } break; }
    case "md-del": { if (!confirmSafe("Remove this med from the list? Past ticks are kept.")) return; PRIV().meds.list = medsList().filter((x) => x.id !== ds.id); break; }
    case "mo-day": { const n = Number(ds.n); moodDate = n === 0 ? null : addDays(moodDate || today(), n); if (moodDate && moodDate >= today()) moodDate = null; render(); return; }
    case "mo-set": { const M = PRIV().mood; const e = M[ds.date] = M[ds.date] || {}; const v = Number(ds.v); e[ds.k] = e[ds.k] === v ? null : v; break; }
    case "cy-month": { const n = Number(ds.n); cycleMonth = n === 0 ? 0 : cycleMonth + n; render(); return; }
    case "cy-tap": { const D = PRIV().cycle.days; const order = ["", "light", "medium", "heavy", "spotting"]; const nx = order[(order.indexOf(D[ds.date] || "") + 1) % order.length]; if (nx) D[ds.date] = nx; else delete D[ds.date]; break; }
    case "bl-tick": { const b = ensureList(bucketKeys[ds.w])[ds.i]; b.done = !b.done; b.date = b.done ? today() : null; break; }
    case "bl-del": { if (!confirmSafe("Remove this from the list?")) return; ensureList(bucketKeys[ds.w]).splice(ds.i, 1); break; }
    case "tr-year": { travelYear = ds.y; render(); return; }
    case "tr-del": { if (!confirmSafe("Remove this place?")) return; (state.travels || []).splice(Number(ds.i), 1); break; }
    case "dash-month": { const n = Number(ds.n); dashMonth = n === 0 ? 0 : dashMonth + n; render(); return; }
    case "dash-day": { cal.date = ds.date; cal.view = "day"; miniAnchor = null; location.hash = "#calendar"; return; }
    case "garmin-refresh": { garmin.windows = []; garminEnsure(addDays(today(), -27), today(), true); return; }
    case "cal-view": { cal.view = ds.v; cal.modal = null; render(); return; }
    case "cal-today": { cal.date = today(); miniAnchor = null; render(); return; }
    case "cal-nav": { const n = Number(ds.n); const v = cal.view; cal.date = v === "month" ? addMonths(cal.date.slice(0, 8) + "01", n) : v === "week" ? addDays(cal.date, 7 * n) : v === "day" ? addDays(cal.date, n) : addDays(cal.date, 30 * n); miniAnchor = null; render(); return; }
    case "cal-goto": { cal.date = ds.date; cal.view = "day"; miniAnchor = null; render(); return; }
    case "cal-pick": { cal.date = ds.date; miniAnchor = null; render(); return; }
    case "cal-mini": { miniAnchor = addMonths((miniAnchor || cal.date).slice(0, 8) + "01", Number(ds.n)); render(); return; }
    case "cal-new": { cal.modal = { mode: "form", date: ds.date, time: ds.time || null }; render(); return; }
    case "cal-ev": { const ev = (cal._evs || []).find((x) => x.id === ds.id); if (ev) { cal.modal = { mode: "view", id: ev.id, ev }; render(); } return; }
    case "cal-close": { cal.modal = null; render(); return; }
    case "cal-edit": { const ev = cal.modal && ((cal._evs || []).find((x) => x.id === cal.modal.id) || cal.modal.ev); const u = ev && (state.calendar || []).find((x) => x.id === ev.ref); if (u) { cal.modal = { mode: "form", ev: u }; render(); } return; }
    case "cal-del": { const ev = cal.modal && cal.modal.ev; if (!ev || !confirmSafe(`Delete "${ev.title}"?`)) return; state.calendar = (state.calendar || []).filter((x) => x.id !== ev.ref); cal.modal = null; break; }
    case "cal-tick": {
      const ev = cal.modal && ((cal._evs || []).find((x) => x.id === cal.modal.id) || cal.modal.ev); if (!ev) return;
      if (ev.kind === "task") { const t = TASK[ev.ref]; state.tasks[t.id] = status(t) === "done" ? "todo" : "done"; }
      if (ev.kind === "session") { if (state.sessions[ev.ref]) delete state.sessions[ev.ref]; else state.sessions[ev.ref] = true; }
      if (ev.kind === "r222") state.rule222.done[ev.ref] = !state.rule222.done[ev.ref];
      if (ev.kind === "study") state.studyDone[ev.ref] = !state.studyDone[ev.ref];
      if (ev.kind === "habit") { const [d, h] = ev.ref.split("|"); const c = state.checkins[d] = state.checkins[d] || {}; c[h] = !c[h]; }
      break;
    }
    default: return;
  }
  commit();
});
// window.confirm blocks; keep it but guard for environments without it
const confirmSafe = (m) => { try { return window.confirm(m); } catch (e) { return true; } };

document.addEventListener("change", (e) => {
  const el = e.target; const a = el.dataset.act; if (!a) return; const ds = el.dataset;
  switch (a) {
    case "j-pick": { if (!el.value) return; jDate = el.value >= today() ? null : el.value; render(); return; }
    case "ct-photo": { const file = el.files[0]; if (!file) return; shrinkPhoto(file).then((url) => { ctPhotoDraft = url; const av = document.querySelector(".ct-modal .avatar.lg"); if (av) av.outerHTML = `<img class="avatar lg" src="${url}" alt="">`; }).catch(() => alert("That picture couldn't be read. Try a JPG or PNG.")); return; }
    case "mo-therapy": { const M = PRIV().mood; const e = M[ds.date] = M[ds.date] || {}; e.therapy = el.checked; break; }
    case "mo-note": { const M = PRIV().mood; const e = M[ds.date] = M[ds.date] || {}; e.note = el.value; commit(false); return; }
    case "ci-time": { const c = state.checkins[ds.date] = state.checkins[ds.date] || {}; const v = el.value; c[ds.h + "T"] = v || undefined;
      c[ds.h] = ds.h === "work" ? (v ? v <= WORK_START : false) : !!v; break; }
    case "ci-note": { const c = state.checkins[ds.date] = state.checkins[ds.date] || {}; c.note = el.value; break; }
    case "r222-start": { if (!el.value) return; state.rule222.start = el.value; break; }
    case "sp-name": { ensureSpaces()[ds.si].name = el.value; break; }
    case "sp-month": { ensureSpaces()[ds.si].month = el.value; break; }
    case "study-start": { if (!el.value) return; state.studyStart = el.value; break; }
    case "study-link": { const v = el.value.trim(); if (v && !/^https:\/\//.test(v)) return; state.studyLinks = state.studyLinks || {}; state.studyLinks[ds.k] = { url: v }; break; }
    case "study-score": { state.studyLinks = state.studyLinks || {}; state.studyLinks[ds.k] = el.value; break; }
    case "body-unit": { state.body.unit = el.value; break; }
    case "body-height": { state.body.height = el.value ? Number(el.value) : null; break; }
    case "import": { importState(el.files[0]); return; }
    case "season-theme": { state.seasonTheme = el.value || null; break; }
    case "cal-allday": { el.form.classList.toggle("allday", el.checked); return; }
    case "cal-toggle": { const h = Object.assign({ meals: true }, state.calHidden || {}); h[ds.cal] = !el.checked; state.calHidden = h; break; }
    default: return;
  }
  commit();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cal.modal) { cal.modal = null; render(); return; }
  if (e.key === "Escape" && contactUI.open) { contactUI.open = null; render(); return; }
  const el = e.target; if (e.key !== "Enter" || !el.dataset || !el.dataset.act) return;
  const v = el.value.trim(); const a = el.dataset.act;
  if (a === "sp-add") { e.preventDefault(); if (!v) return; ensureSpaces()[el.dataset.si].tasks.push({ t: v, done: false }); commit(); }
  if (a === "bl-add") { e.preventDefault(); if (!v) return; const w = el.dataset.w; ensureList(bucketKeys[w]).push({ t: v, done: false }); commit(); setTimeout(() => { const i = document.querySelector(`[data-act="bl-add"][data-w="${w}"]`); if (i) i.focus(); }, 0); }
  if (a === "bucket-add") { e.preventDefault(); if (!v) return; ensureList("bucket").push({ t: v, done: false }); commit(); setTimeout(() => { const i = document.querySelector('[data-act="bucket-add"]'); if (i) i.focus(); }, 0); }
});
document.addEventListener("submit", (e) => {
  const f = e.target; const kind = f.dataset.form; if (!kind || kind.startsWith("r")) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  const num = (v) => (v === "" || v == null ? null : Number(v));
  if (kind === "pt") state.ptScores.push({ date: fd.date, hrpu: num(fd.hrpu), situp: num(fd.situp), hamr: num(fd.hamr), total: num(fd.total) });
  if (kind === "body") {
    const entry = { date: fd.date }; BODY_FIELDS.forEach(([k]) => { if (fd[k] !== "") entry[k] = Number(fd[k]); });
    if (Object.keys(entry).length < 2) return;
    state.body.entries.push(entry);
  }
  if (kind === "journal") {
    const J = PRIV().journal; const mins = num(fd.mins); const text = (fd.text || "").trim();
    if (!text && !mins) delete J[fd.date]; else J[fd.date] = { text, mins, saved: Date.now() };
    if (mins >= 30) { const c = state.checkins[fd.date] = state.checkins[fd.date] || {}; c.journal = true; }
  }
  if (kind === "contact") {
    const list = contacts(); const old = fd.id ? list.find((x) => x.id === fd.id) : null;
    const c = { ...(old || { id: "c" + Date.now().toString(36) }), name: fd.name.trim(), category: fd.category, birthday: fd.birthday || (old && old.birthday && old.birthday.startsWith("0000") ? old.birthday : ""), phone: fd.phone.trim(), email: fd.email.trim(), address: fd.address.trim(), notes: fd.notes.trim() };
    if (ctPhotoDraft !== undefined) c.photo = ctPhotoDraft || null;
    if (old) Object.assign(old, c); else list.push(c);
    contactUI.open = c.id; contactUI.edit = false; ctPhotoDraft = undefined;
  }
  if (kind === "med") medsList().push({ id: "m" + Date.now().toString(36), name: fd.name.trim(), dose: fd.dose.trim(), when: fd.when, notes: fd.notes.trim() });
  if (kind === "travel") { state.travels = state.travels || []; const y = fd.date.slice(0, 4);
    state.travels.push({ date: fd.date, end: fd.end && fd.end > fd.date ? fd.end : undefined, year: y, place: fd.place.trim(), city: fd.city.trim() || undefined, country: fd.country.trim() || undefined, trip: fd.trip.trim() || undefined, src: "Added here" }); travelYear = "all"; }
  if (kind === "country") ensureList("countries").push({ name: fd.name.trim(), date: fd.date || null });
  if (kind === "calev") {
    const allDay = !!fd.allDay;
    let endT = fd.endT; if (!allDay && toMin(endT) <= toMin(fd.start)) { const m = Math.min(23 * 60 + 59, toMin(fd.start) + 60); endT = pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
    const ev = { id: fd.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: fd.title.trim(), date: fd.date,
      end: fd.end && fd.end > fd.date ? fd.end : null, allDay, start: allDay ? null : fd.start, endT: allDay ? null : endT,
      cal: fd.cal || "mine", repeat: fd.repeat || null, notes: fd.notes || "" };
    state.calendar = state.calendar || [];
    const i = state.calendar.findIndex((x) => x.id === ev.id);
    if (i >= 0) state.calendar[i] = ev; else state.calendar.push(ev);
    cal.modal = null; cal.date = ev.date;
  }
  if (kind === "snap") {
    const funds = {}; F.funds.forEach((x) => { funds[x.id] = Number(fd["f_" + x.id]) || 0; });
    const debts = {}; Object.keys(F.debtsMeta).forEach((k) => { debts[k] = Number(fd["d_" + k]) || 0; });
    if (Number(fd.d_other)) debts.other = Number(fd.d_other);
    state.snapshots.push({ date: fd.date, label: fd.label || "Monthly check-in", funds, cash: Number(fd.cash) || 0, debts, credit: num(fd.credit), expenses: num(fd.expenses) });
  }
  commit();
});

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `project-me-backup-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importState(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => { try { const s = JSON.parse(rd.result); if (!s || typeof s !== "object" || !("tasks" in s)) throw new Error(); if (!confirmSafe("Replace everything on the site with this backup?")) return; state = Object.assign(blank(), s); commit(); } catch (err) { alert("That file isn't a Project Me backup."); } };
  rd.readAsText(file);
}

/* tooltip */
const tip = document.getElementById("tip");
document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (!el) { tip.style.display = "none"; return; } tip.innerHTML = el.dataset.tip; tip.style.display = "block"; });
document.addEventListener("mousemove", (e) => { if (tip.style.display !== "block") return; const w = tip.offsetWidth; tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + "px"; tip.style.top = (e.clientY + 16) + "px"; });

applyGlass(new URLSearchParams(location.search).get("glass"));
render();
loadMe().then(() => { render(); return pullRemote(); });
})();
