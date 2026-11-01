// Cloudflare Pages Function: saves and loads your ticks/check-ins at /api/state.
// Storage: a KV namespace bound to this project with the variable name PROJECT_ME.
// Cloudflare Access sits in front of the whole site, so only you can reach this.

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

// Extra safety net: if Access is ever switched off by mistake, refuse to serve data.
// Set an environment variable ALLOWED_EMAILS (comma-separated) in the Pages project
// to also check WHO is signed in. Leave it unset to just require any Access login.
function allowed(request, env) {
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").toLowerCase();
  if (!email) return false;
  if (!env.ALLOWED_EMAILS) return true;
  return env.ALLOWED_EMAILS.toLowerCase().split(",").map((s) => s.trim()).includes(email);
}

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS });
  if (!env.PROJECT_ME) return new Response(JSON.stringify({ error: "KV binding PROJECT_ME missing" }), { status: 500, headers: JSON_HEADERS });
  const value = await env.PROJECT_ME.get("state");
  return new Response(value || "{}", { headers: JSON_HEADERS });
}

export async function onRequestPut({ request, env }) {
  if (!allowed(request, env)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS });
  if (!env.PROJECT_ME) return new Response(JSON.stringify({ error: "KV binding PROJECT_ME missing" }), { status: 500, headers: JSON_HEADERS });
  const body = await request.text();
  if (body.length > 5_000_000) return new Response(JSON.stringify({ error: "too large" }), { status: 413, headers: JSON_HEADERS });
  let parsed;
  try { parsed = JSON.parse(body); } catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: JSON_HEADERS }); }
  if (!parsed || typeof parsed !== "object" || typeof parsed.updatedAt !== "number") {
    return new Response(JSON.stringify({ error: "not a Project Me state" }), { status: 400, headers: JSON_HEADERS });
  }

  // Keep one backup per day (kept for 60 days) before overwriting.
  const day = new Date().toISOString().slice(0, 10);
  const backupKey = `backup:${day}`;
  if (!(await env.PROJECT_ME.get(backupKey))) {
    const previous = await env.PROJECT_ME.get("state");
    if (previous) await env.PROJECT_ME.put(backupKey, previous, { expirationTtl: 60 * 24 * 3600 });
  }

  await env.PROJECT_ME.put("state", body);
  return new Response(JSON.stringify({ ok: true, savedAt: Date.now() }), { headers: JSON_HEADERS });
}
