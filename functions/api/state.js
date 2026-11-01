// Cloudflare Pages Function: saves and loads your ticks/check-ins at /api/state.
// Storage: a KV namespace bound to this project with the variable name PROJECT_ME.
// The site login (functions/_middleware.js) sits in front of everything, so only you can reach this.

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

// The login in functions/_middleware.js signs you in and puts your name in data.user.
const allowed = (data) => !!(data && data.user);
const privKey = (user) => `private:${String(user).toLowerCase()}`;

export async function onRequestGet({ request, env, data }) {
  if (!allowed(data)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS });
  if (!env.PROJECT_ME) return new Response(JSON.stringify({ error: "KV binding PROJECT_ME missing" }), { status: 500, headers: JSON_HEADERS });
  const value = await env.PROJECT_ME.get("state");
  const shared = value ? JSON.parse(value) : {};
  // each person's private part (journal, mood, cycle, meds) is stored on its own and only handed to its owner
  const priv = await env.PROJECT_ME.get(privKey(data.user));
  shared.priv = priv ? JSON.parse(priv) : {};
  shared.privOwner = data.user;
  return new Response(JSON.stringify(shared), { headers: JSON_HEADERS });
}

export async function onRequestPut({ request, env, data }) {
  if (!allowed(data)) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: JSON_HEADERS });
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

  // split off the private part so it is never shared with the other login
  const priv = parsed.priv; delete parsed.priv; const owner = parsed.privOwner; delete parsed.privOwner;
  if (priv && typeof priv === "object" && owner === data.user) {
    const pk = privKey(data.user);
    if (!(await env.PROJECT_ME.get(`${pk}:backup:${day}`))) { const prev = await env.PROJECT_ME.get(pk); if (prev) await env.PROJECT_ME.put(`${pk}:backup:${day}`, prev, { expirationTtl: 60 * 24 * 3600 }); }
    await env.PROJECT_ME.put(pk, JSON.stringify(priv));
  }
  await env.PROJECT_ME.put("state", JSON.stringify(parsed));
  return new Response(JSON.stringify({ ok: true, savedAt: Date.now() }), { headers: JSON_HEADERS });
}
