/* ==========================================================================
   CONTROL CENTER — Auth API (Google-only, admin restricted)
   Endpoints:
     POST  /api/auth/login    { email }  -> sign in (Gmail only, main admin)
     GET   /api/auth/session              -> current session user
     POST  /api/auth/logout               -> clear session
   ========================================================================== */

const { load, save, clone } = require("./store");
const SUPER_ADMINS = ["actinst.admin@gmail.com", "dcchamie25@gmail.com"];
const ADMIN_EMAIL = "actinst.admin@gmail.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

module.exports = (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }

  const url = (req.url || "").split("?")[0];
  const method = req.method;

  // ---- POST /api/auth/login ----
  if (method === "POST" && url === "/api/auth/login") {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const { email } = JSON.parse(body || "{}");
        const gmail = String(email || "").trim().toLowerCase();
        if (!gmail.endsWith("@gmail.com")) {
          return json(res, 400, { error: "Only Gmail accounts are allowed." });
        }
        if (!SUPER_ADMINS.includes(gmail)) {
          return json(res, 403, { error: "Access denied. Only super admins (" + SUPER_ADMINS.join(" or ") + ") can sign in." });
        }
        const state = load();
        let user = state.users.find(u => u.email.toLowerCase() === gmail);
        if (!user) {
          user = {
            id: "u" + Date.now(),
            email: gmail,
            name: gmail.split("@")[0],
            role: "admin",
            status: "active",
            createdAt: new Date().toISOString()
          };
          state.users.push(user);
          state.audit.push({ id: "aud_" + Date.now(), userId: user.id, email: user.email, action: "user_created", target: user.email, meta: "Auto-registered on Google login", at: new Date().toISOString() });
        }
        // Blocked check
        if (user.status === "blocked") {
          return json(res, 403, { error: "Your account is blocked. Contact the main admin." });
        }
        const session = { id: "s" + Date.now(), userId: user.id, email: user.email, loginAt: new Date().toISOString() };
        state.sessions.push(session);
        state.audit.push({ id: "aud_" + Date.now(), userId: user.id, email: user.email, action: "login", target: user.email, meta: "Signed in with Google", at: new Date().toISOString() });
        save(state);
        res.setHeader("Set-Cookie", `cc_sid=${session.id}; Path=/; SameSite=Lax`);
        return json(res, 200, { ok: true, user, sessionId: session.id });
      } catch (e) {
        return json(res, 500, { error: "Login failed" });
      }
    });
    return;
  }

  // ---- GET /api/auth/session ----
  if (method === "GET" && url === "/api/auth/session") {
    const sessionId = (req.headers.cookie || "").match(/(?:^|; )cc_sid=([^;]+)/);
    const state = load();
    const session = sessionId ? state.sessions.find(s => s.id === sessionId[1]) : null;
    if (!session) return json(res, 401, { error: "Not signed in" });
    const user = state.users.find(u => u.id === session.userId);
    if (!user || user.status === "blocked") return json(res, 403, { error: "Account blocked or not found" });
    return json(res, 200, { ok: true, user });
  }

  // ---- POST /api/auth/logout ----
  if (method === "POST" && url === "/api/auth/logout") {
    const sessionId = (req.headers.cookie || "").match(/(?:^|; )cc_sid=([^;]+)/);
    if (sessionId) {
      const state = load();
      state.sessions = state.sessions.filter(s => s.id !== sessionId[1]);
      save(state);
    }
    res.setHeader("Set-Cookie", "cc_sid=; Path=/; Max-Age=0");
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: "Not found" });
};
