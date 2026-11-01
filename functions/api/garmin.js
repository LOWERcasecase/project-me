// Cloudflare Pages Function: reads your Garmin Connect data at /api/garmin?from=YYYY-MM-DD&to=YYYY-MM-DD
// Uses Garmin's official Personal API. Your personal API key lives in the encrypted secret GARMIN_API_KEY.
// Read-only: nothing is ever sent back to Garmin.

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };
const BASE = "https://personal.connectapi.garmin.com";
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";

function allowed(request, env) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  if (!email) return false;
  if (!env.ALLOWED_EMAILS) return true;
  return env.ALLOWED_EMAILS.toLowerCase().split(",").map((s) => s.trim()).includes(email);
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: JSON_HEADERS });

function jwtExp(t) {
  try { const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); return (p.exp || 0) * 1000; } catch { return Date.now() + 20 * 3600 * 1000; }
}
async function getToken(env, force) {
  if (!force && env.PROJECT_ME) {
    const c = await env.PROJECT_ME.get("garmin:token", "json");
    if (c && c.exp - Date.now() > 3600 * 1000) return c.t;
  }
  const r = await fetch(BASE + TOKEN_PATH, { method: "POST", headers: { Accept: "*/*", Authorization: `ApiKey ${env.GARMIN_API_KEY.trim()}` } });
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "Garmin rejected the API key (expired or deleted?)" : `Garmin token request failed (${r.status})`);
  const t = (await r.text()).trim().replace(/^"|"$/g, "");
  if (env.PROJECT_ME) await env.PROJECT_ME.put("garmin:token", JSON.stringify({ t, exp: jwtExp(t) }), { expirationTtl: 86400 });
  return t;
}

/* ---------- reading Garmin's JSON defensively ---------- */
function rows(j) {
  if (Array.isArray(j)) return j;
  if (j && typeof j === "object") for (const v of Object.values(j)) if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
  return [];
}
function deepPick(o, keys, depth = 3) {
  if (!o || typeof o !== "object" || depth < 0) return undefined;
  for (const k of keys) if (o[k] != null && typeof o[k] !== "object") return o[k];
  for (const k of keys) if (o[k] && typeof o[k] === "object" && o[k].value != null) return o[k].value;
  for (const v of Object.values(o)) if (v && typeof v === "object" && !Array.isArray(v)) { const r = deepPick(v, keys, depth - 1); if (r !== undefined) return r; }
  return undefined;
}
const dateOf = (r) => String(deepPick(r, ["calendarDate", "summaryDate", "date", "calendarDateString", "startDate", "startDateLocal"], 2) || "").slice(0, 10);
const num = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return json({ error: "not signed in" }, 401);
  if (!env.GARMIN_API_KEY) return json({ connected: false });
  const url = new URL(request.url);
  const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return json({ error: "bad range" }, 400);
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 31) return json({ error: "range too long (max 31 days)" }, 400);

  const cacheKey = `garmin:cache:${from}:${to}`;
  if (env.PROJECT_ME && !url.searchParams.has("fresh")) { const c = await env.PROJECT_ME.get(cacheKey); if (c) return new Response(c, { headers: JSON_HEADERS }); }

  let token;
  try { token = await getToken(env); } catch (e) { return json({ connected: true, ok: false, error: e.message }); }
  const get = async (path) => {
    let r = await fetch(BASE + path, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    if (r.status === 401) { token = await getToken(env, true); r = await fetch(BASE + path, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }); }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt = await r.text(); return txt ? JSON.parse(txt) : null;
  };
  const q = (o) => new URLSearchParams(o).toString();
  const sources = {
    activities: `/activitylist-service/activities/search/activities?${q({ start: 0, limit: 100, startDate: from, endDate: to })}`,
    steps: `/usersummary-service/stats/steps/daily/${from}/${to}`,
    stress: `/usersummary-service/stats/stress/daily/${from}/${to}`,
    sleep: `/sleep-service/sleep/dailySleepSummariesByDate?${q({ startDate: from, endDate: to })}`,
    bodyBattery: `/wellness-service/wellness/bodyBattery/reports/daily?${q({ startDate: from, endDate: to })}`,
    hrv: `/hrv-service/hrv/daily/${from}/${to}`,
    weight: `/weight-service/weight/range/${from}/${to}?includeAll=true`,
    summaries: `/usersummary-service/v2/dailysummaries?${q({ startDate: from, endDate: to })}`,
  };
  const raw = {}, errors = {};
  await Promise.all(Object.entries(sources).map(async ([k, p]) => { try { raw[k] = await get(p); } catch (e) { errors[k] = e.message; } }));

  const days = {};
  const day = (d) => (days[d] = days[d] || { date: d });
  const put = (k, src, fields, tf = (x) => x) => rows(raw[src]).forEach((r) => { const d = dateOf(r); const v = num(deepPick(r, fields)); if (d && v != null) day(d)[k] = tf(v); });
  put("steps", "steps", ["totalSteps", "steps"]);
  put("steps", "summaries", ["totalSteps"]);
  put("stress", "stress", ["overallStressLevel", "averageStressLevel", "avgStressLevel", "stressLevel"]);
  put("stress", "summaries", ["averageStressLevel"]);
  put("restingHR", "summaries", ["restingHeartRate", "restingHR"]);
  put("sleepHours", "sleep", ["sleepTimeSeconds", "totalSleepSeconds", "sleepTimeInSeconds"], (v) => Math.round((v / 3600) * 10) / 10);
  put("sleepScore", "sleep", ["overallSleepScore", "sleepScore", "overall"]);
  put("bbHigh", "bodyBattery", ["highest", "bodyBatteryHighestValue", "maxValue", "charged"]);
  put("bbLow", "bodyBattery", ["lowest", "bodyBatteryLowestValue", "minValue"]);
  put("hrv", "hrv", ["lastNightAvg", "lastNight", "hrvValue"]);
  rows(raw.hrv).forEach((r) => { const d = dateOf(r); const s = deepPick(r, ["status", "hrvStatus"]); if (d && s && typeof s === "string") day(d).hrvStatus = s.toLowerCase(); });
  put("weightKg", "weight", ["weight"], (v) => Math.round((v > 1000 ? v / 1000 : v) * 10) / 10);

  const activities = rows(raw.activities).map((a) => {
    const start = String(a.startTimeLocal || a.startTimeGMT || "");
    return { id: a.activityId, name: a.activityName || "", type: (a.activityType && a.activityType.typeKey) || (a.activityTypeDTO && a.activityTypeDTO.typeKey) || "",
      start, date: start.slice(0, 10), durationMin: num(a.duration || a.elapsedDuration || a.movingDuration) != null ? Math.round(num(a.duration || a.elapsedDuration || a.movingDuration) / 60) : null,
      distanceKm: num(a.distance) != null ? Math.round(num(a.distance) / 10) / 100 : null, avgHR: num(a.averageHR || a.averageHr), calories: num(a.calories) };
  }).filter((a) => a.date);

  // a short peek at the raw shapes, so field names can be fixed if Garmin's differ
  const shapes = {}; for (const [k, v] of Object.entries(raw)) { const r = rows(v)[0] || v; shapes[k] = r && typeof r === "object" ? Object.keys(r).slice(0, 40) : typeof v; }
  const body = JSON.stringify({ connected: true, ok: true, from, to, days: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)), activities, errors, shapes, fetchedAt: Date.now() });
  if (env.PROJECT_ME) await env.PROJECT_ME.put(cacheKey, body, { expirationTtl: 900 });
  return new Response(body, { headers: JSON_HEADERS });
}
