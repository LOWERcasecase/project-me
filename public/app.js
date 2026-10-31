/* Project Me: site logic. You shouldn't need to edit this file; your plan lives in data.js. */
(() => {
"use strict";
const P = window.PLAN;
const F = P.finance;

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
});
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
const seasonOf = (code) => code.startsWith("SP") ? ["Spring", "#1baf7a"] : code.startsWith("SU") ? ["Summer", "#eda100"] : code.startsWith("A") ? ["Autumn", "#eb6834"] : ["Winter", "#2a78d6"];

function studyBlocks() {
  let d = state.studyStart || P.defaults.studyStart;
  return P.studyYear1.map((b, i) => {
    const start = d; const end = addDays(d, b.weeks * 7 - 1); d = addDays(d, b.weeks * 7);
    return { ...b, i, start, end };
  });
}
const studyBlockOn = (date) => studyBlocks().find((b) => date >= b.start && date <= b.end);

const HABITS = [
  { id: "meals", label: "At or under macros", sub: (d) => { const m = menuForDate(d); const t = menuTotals(m); return `This week's menu ${m}: ${t.kcal} kcal in meals, ${P.macros.kcal} target (room for snacks)`; } },
  { id: "meds", label: "Meds taken", sub: () => "Pill organizer + phone alarm" },
  { id: "german", label: "German practice", sub: () => "30-60 minutes" },
  { id: "study", label: "Study", sub: (d) => {
      const b = studyBlockOn(d); const dn = dowOf(d);
      if (b && b.half) return "Half-term: flashcards only";
      const hrs = dn === "Sun" ? "4 hrs (2 per course)" : dn === "Sat" ? "Day off (or catch-up)" : "2 hrs (1 per course)";
      return b && !b.half ? `${hrs} · Block ${b.block}: ${b.courses}` : hrs;
    } },
];
const habitDone = (date, id) => !!(state.checkins[date] && state.checkins[date][id]);
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
  const items = HABITS.map((h) => habitDone(date, h.id));
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
    <circle class="fg" cx="60" cy="60" r="${r}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp01(p))}"/>
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
    const dots = s.points.map((p) => `<circle class="pt" cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" fill="${s.color}"/><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="13" data-tip="${esc(`${s.name}<br>${fmt(p.x)}: <b>${isMoney ? money(p.y) : p.y}</b>${p.note ? "<br>" + p.note : ""}`)}"/>`).join("");
    return `<path class="ln" d="${path}" stroke="${s.color}" ${s.dashed ? 'stroke-dasharray="5 5"' : ""}/>${dots}`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}${lines}</svg>`;
}

/* ============================== nav ============================== */
const ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: "◆" },
  { id: "today", label: "Daily check-in", icon: "✓" },
  { label: "Life domains" },
  { id: "family", label: "Family", dom: "family" },
  { id: "health", label: "Health", dom: "health" },
  { id: "training", label: "Training", sub: true },
  { id: "meals", label: "Meals & macros", sub: true },
  { id: "body", label: "Body", sub: true },
  { id: "finances", label: "Finances", dom: "finances" },
  { id: "career", label: "Career", dom: "career" },
  { id: "education", label: "Education", dom: "degree" },
  { id: "travel", label: "Travel", dom: "travel" },
  { id: "community", label: "Community", dom: "community" },
  { label: "" },
  { id: "settings", label: "Settings & backup", icon: "⚙" },
];
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

pages.dashboard = () => {
  const t = today();
  const all = progressOf(TASKS);
  const h1 = P.horizons[0];
  const timeP = clamp01(daysBetween(h1.start, t) / daysBetween(h1.start, h1.end));
  const daysLeft = daysBetween(t, P.keyDates.retire);
  const fin = finance();
  const score = checkinScore(t);
  const s = activeSession(t);
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const upcoming = countable(TASKS).filter((x) => status(x) !== "done" && x.d && x.d >= t && x.d <= addDays(t, 21)).sort((a, b) => a.d.localeCompare(b.d));
  const overdue = countable(TASKS).filter((x) => status(x) !== "done" && x.d && x.d < t).sort((a, b) => a.d.localeCompare(b.d));
  const countdowns = [
    fin.debt > 0 && fin.debtFree ? ["Debt-free", fin.debtFree, "Step 1 done"] : null,
    ["PT test window", "2027-02-01", "Feb 1-14; due by 28 Feb"],
    ["Berlin Sprint", "2027-06-05", "750m · 20K · 5K"],
    ["DEROS", P.keyDates.deros, "Leave Germany"],
    ["Retire at 20", P.keyDates.retire, "6 Dec 2031"],
  ].filter(Boolean).filter((c) => c[1] >= t);

  return `
  <h1>${greet}, ${esc(P.owner)}</h1>
  <p class="subtitle">${fmtLong(t)} · Horizon 1: Active-Duty AF Career</p>

  <div class="grid g4">
    <div class="box hero span2">
      ${ring(all.p, "#2a78d6", 112)}
      <div style="flex:1;min-width:0">
        <div class="label">Horizon 1 plan complete</div>
        <div class="big">${all.done}<span class="of"> / ${all.total} tasks</span></div>
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
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">
    ${countdowns.map(([n, d, sub]) => `<div class="box tight"><div class="label">${n}</div><div class="big md">${plural(daysBetween(t, d), "day")}</div><div class="sub">${fmt(d)}${sub ? " · " + sub : ""}</div></div>`).join("")}
  </div>

  <h2>Life domains</h2>
  <div class="grid cards">
    ${P.domains.map((d) => {
      const list = domainTasks(d.id); const pr = progressOf(list); const nx = nextTask(list);
      const route = ROUTES.find((r) => r.dom === d.id).id;
      return `<a class="box" href="#${route}">
        <div class="card-head"><span class="dot" style="background:${d.color}"></span><h3>${d.name}</h3><span class="pct">${pr.total ? pctTxt(pr.p) : "–"}</span></div>
        ${bar(pr.p, d.color)}
        <div class="card-meta">${pr.total ? `${pr.done} of ${pr.total} tasks done` : "On hold until Horizon 2"}${nx ? `<br>Next: <b>${esc(nx.t)}</b> <span class="muted">(${esc(nx.due)})</span>` : ""}</div>
      </a>`;
    }).join("")}
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
  const s = activeSession(d);
  const next = P.programs.find((p) => p.start > d);
  const ci = state.checkins[d] || {};
  const score = checkinScore(d);
  const last14 = (fn) => Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)).map((x) => `<span class="${fn(x) ? "on" : ""}" title="${fmtShort(x)}"></span>`).join("");
  const sessionDone = (x) => { const ss = activeSession(x); return ss && ss.text && state.sessions[ss.key]; };
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

  <div class="box">
    <div class="checkin-row">
      ${s && s.text ? chk(!!state.sessions[s.key], "session", `data-key="${s.key}"`, "big-chk") : `<span class="ongoing-dot" style="width:26px">–</span>`}
      <div class="ci-text">
        <b>Workout</b> ${s ? `<span class="chip">${esc(s.prog.name)} · week ${s.week}${s.module ? " · " + esc(s.module.name) : ""}</span>` : ""}
        <div class="sub" style="font-size:14px;color:var(--text)">${s ? (s.text ? esc(s.text) : "Rest day") : next ? `No plan running. ${esc(next.name)} starts ${fmt(next.start)}.` : "No training plan running."}</div>
      </div>
      <div style="text-align:right"><div class="days14">${last14(sessionDone)}</div><div class="streak">${plural(workoutStreak(), "session")} in a row</div></div>
    </div>
    ${HABITS.map((h) => `
    <div class="checkin-row">
      ${chk(!!ci[h.id], "habit", `data-h="${h.id}" data-date="${d}"`, "big-chk")}
      <div class="ci-text"><b>${h.label}</b><div class="sub">${esc(h.sub(d))}</div></div>
      <div style="text-align:right"><div class="days14">${last14((x) => habitDone(x, h.id))}</div><div class="streak">${plural(streak(h.id), "day")} streak</div></div>
    </div>`).join("")}
    <div class="checkin-row" style="align-items:flex-start">
      <span class="ongoing-dot" style="width:26px">✎</span>
      <div class="ci-text"><b>Notes</b><textarea data-act="ci-note" data-date="${d}" placeholder="How did today go? Energy, mood, wins, anything to remember.">${esc(ci.note || "")}</textarea></div>
    </div>
  </div>

  <h2>This week's menu <span class="h-note">${menuForDate(d)} · <a href="#meals">Meal plan →</a></span></h2>
  ${menuTable(menuForDate(d))}`;
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
  <p class="subtitle">My wife, our dogs, Allie, and the people we've chosen to keep close.</p>
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
  const t = today(); const c = domain("health").color;
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
            return `<div class="session ${date === t ? "is-today" : ""}">${chk(!!state.sessions[key], "session", `data-key="${key}"`)}<span class="sday">${d} ${fmtShort(date)}</span><span>${esc(w[d])}</span></div>`; }).join("")}</div>
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
  const kindColor = { fixed: "#2a78d6", save: "#1baf7a", tax: "#8a8f98" };
  const kindOrder = { tax: 0, fixed: 1, save: 2 };
  const alloc = [...outs.map((o) => ({ ...o, kind: o.name.startsWith("Taxes") ? "tax" : o.kind })).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]).map((o) => ({ ...o, color: kindColor[o.kind] })), { name: "Day-to-day & unassigned", amt: rest, color: "#eda100" }];
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
        <div class="legend"><span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="${c}" stroke-width="2"/></svg>Actual</span><span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="${c}" stroke-width="2" stroke-dasharray="5 4"/></svg>Planned</span></div>
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
          ${gp > 0 ? `<path d="M20,100 A80,80 0 0 1 ${gx.toFixed(1)},${gy.toFixed(1)}" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round"/>` : ""}
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
    <div class="legend"><span><span class="dot" style="background:${kindColor.tax}"></span>Taxes</span><span><span class="dot" style="background:${kindColor.fixed}"></span>Fixed bills</span><span><span class="dot" style="background:${kindColor.save}"></span>Saving & investing</span><span><span class="dot" style="background:#eda100"></span>Day-to-day & unassigned</span></div>
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
  <h1>Degree & Education</h1>
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
         <div class="meta"><span>${b.term} · ${b.weeks} weeks · ${fmtShort(b.start)} - ${fmt(b.end)}</span>${b === curB ? '<span class="chip good">Current block</span>' : ""}</div></div></li>`).join("")}</ul>
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
    <div class="box"><div class="label">Bucket list</div><div class="big md">${bucket.filter((b) => b.done).length}<span class="of"> / ${bucket.length}</span></div><div class="sub">${bucket.length ? "done" : "Brainstorm the top 10 with your wife"}</div></div>
  </div>
  <div class="grid g2">
    <div><h2>Europe bucket list</h2><div class="box">
      ${bucket.length ? `<ul class="list-edit">${bucket.map((b, i) => `<li>${chk(b.done, "bucket-tick", `data-i="${i}"`)}<span class="grow ${b.done ? "muted" : ""}" style="${b.done ? "text-decoration:line-through" : ""}">${i + 1}. ${esc(b.t)}</span><button class="x-btn" data-act="bucket-del" data-i="${i}">×</button></li>`).join("")}</ul>` : `<div class="empty">Nothing yet.</div>`}
      <input type="text" placeholder="+ Add a place or experience and press Enter" data-act="bucket-add" style="margin-top:10px">
    </div></div>
    <div><h2>Country tracker</h2><div class="box">
      ${countries.length ? `<ul class="list-edit">${countries.map((x, i) => `<li><span class="dot" style="background:${c}"></span><span class="grow">${esc(x.name)}</span><span class="sub" style="margin:0">${x.date ? fmt(x.date) : ""}</span><button class="x-btn" data-act="country-del" data-i="${i}">×</button></li>`).join("")}</ul>` : `<div class="empty">No trips logged yet. Poland and Czechia are on the list.</div>`}
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

pages.settings = () => `
  <h1>Settings & backup</h1>
  <p class="subtitle">Your ticks and entries are saved to your private Cloudflare database and also kept on this device.</p>
  <div class="box">
    <h3>Sync</h3>
    <p class="sub" style="font-size:14px">Status: <b>${{ synced: "Synced", saving: "Saving…", offline: "Couldn't reach the database (kept on this device)", local: "Saved on this device only (opened as a local file)" }[sync.status]}</b>${sync.at ? ` · last synced ${new Date(sync.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
    <div class="row" style="margin-top:10px"><button class="btn" data-act="sync-now">Sync now</button></div>
  </div>
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
  const route = (location.hash.slice(1) || "dashboard").split("?")[0];
  const r = pages[route] ? route : "dashboard";
  renderNav(r);
  const main = document.getElementById("main");
  const y = window.scrollY;
  // keep anything typed into a form that hasn't been submitted yet
  const typed = r === lastRoute ? [...main.querySelectorAll("form[data-form] input")].filter((i) => i.value !== i.defaultValue).map((i) => [i.form.dataset.form, i.name, i.value]) : [];
  main.innerHTML = pages[r]();
  typed.forEach(([f, n, v]) => { const i = main.querySelector(`form[data-form="${f}"] [name="${n}"]`); if (i) i.value = v; });
  document.title = (ROUTES.find((x) => x.id === r) || {}).label + " · " + P.title;
  if (r !== lastRoute) window.scrollTo(0, 0); else window.scrollTo(0, y);
  lastRoute = r;
  setSync(sync.status);
}
window.addEventListener("hashchange", () => { ciDate = null; render(); });

/* ============================== events ============================== */
const ensureSpaces = () => { if (!state.spaces) state.spaces = P.defaults.homeSpaces.map((s) => ({ name: s.name, month: s.month, tasks: s.tasks.map((x) => ({ t: x, done: false })) })); return state.spaces; };
const ensureList = (k) => { if (!state[k]) state[k] = JSON.parse(JSON.stringify(P.defaults[k])); return state[k]; };

document.addEventListener("click", (e) => {
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
    default: return;
  }
  commit();
});
// window.confirm blocks; keep it but guard for environments without it
const confirmSafe = (m) => { try { return window.confirm(m); } catch (e) { return true; } };

document.addEventListener("change", (e) => {
  const el = e.target; const a = el.dataset.act; if (!a) return; const ds = el.dataset;
  switch (a) {
    case "ci-note": { const c = state.checkins[ds.date] = state.checkins[ds.date] || {}; c.note = el.value; break; }
    case "r222-start": { if (!el.value) return; state.rule222.start = el.value; break; }
    case "sp-name": { ensureSpaces()[ds.si].name = el.value; break; }
    case "sp-month": { ensureSpaces()[ds.si].month = el.value; break; }
    case "study-start": { if (!el.value) return; state.studyStart = el.value; break; }
    case "body-unit": { state.body.unit = el.value; break; }
    case "body-height": { state.body.height = el.value ? Number(el.value) : null; break; }
    case "import": { importState(el.files[0]); return; }
    default: return;
  }
  commit();
});
document.addEventListener("keydown", (e) => {
  const el = e.target; if (e.key !== "Enter" || !el.dataset || !el.dataset.act) return;
  const v = el.value.trim(); const a = el.dataset.act;
  if (a === "sp-add") { e.preventDefault(); if (!v) return; ensureSpaces()[el.dataset.si].tasks.push({ t: v, done: false }); commit(); }
  if (a === "bucket-add") { e.preventDefault(); if (!v) return; ensureList("bucket").push({ t: v, done: false }); commit(); setTimeout(() => { const i = document.querySelector('[data-act="bucket-add"]'); if (i) i.focus(); }, 0); }
});
document.addEventListener("submit", (e) => {
  const f = e.target; const kind = f.dataset.form; if (!kind) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  const num = (v) => (v === "" || v == null ? null : Number(v));
  if (kind === "pt") state.ptScores.push({ date: fd.date, hrpu: num(fd.hrpu), situp: num(fd.situp), hamr: num(fd.hamr), total: num(fd.total) });
  if (kind === "body") {
    const entry = { date: fd.date }; BODY_FIELDS.forEach(([k]) => { if (fd[k] !== "") entry[k] = Number(fd[k]); });
    if (Object.keys(entry).length < 2) return;
    state.body.entries.push(entry);
  }
  if (kind === "country") ensureList("countries").push({ name: fd.name.trim(), date: fd.date || null });
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

render();
pullRemote();
})();
