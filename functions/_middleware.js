// Login for the whole site (pages, files and /api), replacing Cloudflare Access.
// Users and passwords live in the encrypted secret LOGIN_USERS, e.g.  Casey=her-password;Amanda=her-password
// Sessions are stored in the PROJECT_ME database and last 30 days.

const SESSION_DAYS = 30;
const COOKIE = "pm_session";

function users(env) {
  const out = {};
  String(env.LOGIN_USERS || "").split(/[;\n]/).forEach((pair) => {
    const i = pair.indexOf("="); if (i < 1) return;
    const name = pair.slice(0, i).trim(), pass = pair.slice(i + 1).trim();
    if (name && pass) out[name.toLowerCase()] = { name, pass };
  });
  return out;
}
function safeEqual(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
const getCookie = (req, name) => { const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)); return m ? decodeURIComponent(m[1]) : null; };
const randomToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function loginPage(msg = "", status = 200) {
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Project Me · Sign in</title>
<style>
:root{color-scheme:light dark;--bg:#f6f5f2;--panel:#fff;--text:#111;--muted:#6b6b6b;--border:#e3e1dc;--accent:#2a78d6}
@media (prefers-color-scheme:dark){:root{--bg:#131416;--panel:#1c1d1f;--text:#f0efec;--muted:#9a9a9a;--border:#2d2e2f;--accent:#3987e5}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;padding:20px}
form{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:30px 28px;width:min(380px,100%)}
h1{font-size:24px;margin:0 0 4px}p{color:var(--muted);margin:0 0 20px}
label{display:block;font-size:13px;color:var(--muted);margin:12px 0 4px}
input{width:100%;font:inherit;color:inherit;background:transparent;border:1px solid var(--border);border-radius:9px;padding:10px 12px}
input:focus{outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent)}
button{margin-top:20px;width:100%;font:inherit;font-weight:600;border:0;border-radius:9px;padding:11px;background:var(--accent);color:#fff;cursor:pointer}
.err{background:color-mix(in srgb,#e34948 14%,transparent);color:#c43c3b;border-radius:8px;padding:8px 12px;font-size:14px;margin-bottom:6px}
</style></head><body>
<form method="post" action="/login"><h1>Project Me</h1><p>Sign in to continue.</p>
${msg ? `<div class="err">${esc(msg)}</div>` : ""}
<label for="u">Username</label><input id="u" name="username" autocomplete="username" required autofocus>
<label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in</button></form></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);
  const kv = env.PROJECT_ME;
  const U = users(env);

  // Not set up yet: don't lock you out, and say what's missing.
  if (!Object.keys(U).length || !kv) {
    if (url.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "login not set up" }), { status: 401, headers: { "content-type": "application/json" } });
    return loginPage(!kv ? "The PROJECT_ME database isn't connected." : "No users set up yet. Add the LOGIN_USERS secret (see the README).", 503);
  }

  if (url.pathname === "/login" && request.method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const rlKey = `login:fail:${ip}`;
    const fails = Number((await kv.get(rlKey)) || 0);
    if (fails >= 10) return loginPage("Too many attempts. Try again in 15 minutes.", 429);
    const form = await request.formData();
    const name = String(form.get("username") || "").trim().toLowerCase(), pass = String(form.get("password") || "");
    const user = U[name];
    if (!user || !safeEqual(pass, user.pass)) {
      await kv.put(rlKey, String(fails + 1), { expirationTtl: 900 });
      return loginPage("That username and password don't match.", 401);
    }
    const token = randomToken();
    await kv.put(`session:${token}`, JSON.stringify({ user: user.name, created: Date.now() }), { expirationTtl: SESSION_DAYS * 86400 });
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`, "cache-control": "no-store" } });
  }

  const token = getCookie(request, COOKIE);
  const session = token ? await kv.get(`session:${token}`, "json") : null;

  if (url.pathname === "/logout") {
    if (token) await kv.delete(`session:${token}`);
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (!session) {
    if (url.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "not signed in" }), { status: 401, headers: { "content-type": "application/json" } });
    return loginPage();
  }

  data.user = session.user;
  if (url.pathname === "/api/me") return new Response(JSON.stringify({ user: session.user }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const res = await next();
  // keep signed-in pages out of shared caches
  const out = new Response(res.body, res); out.headers.set("cache-control", "private, no-store"); return out;
}
