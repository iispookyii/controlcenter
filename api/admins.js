/* ==========================================================================
   CONTROL CENTER — Admins API (CRUD + block/unblock)
   Endpoints (require session cookie cc_sid):
     GET    /api/admins              -> list admins
     POST   /api/admins              -> add admin  {email, name}
     PUT    /api/admins/:id          -> edit admin {email, name}
     DELETE /api/admins/:id          -> delete admin
     PATCH  /api/admins/:id/block    -> block/unblock {blocked: boolean}
   ========================================================================== */

const { load, save, clone } = require("./store");
const SUPER_ADMINS = ["actinst.admin@gmail.com", "dcchamie25@gmail.com"];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function getSessionId(req) {
  const m = (req.headers.cookie || "").match(/(?:^|; )cc_sid=([^;]+)/);
  return m ? m[1] : null;
}

function requireAdmin(req, res) {
  const state = load();
  const sid = getSessionId(req);
  const session = sid ? state.sessions.find(s => s.id === sid) : null;
  if (!session) return { ok: false, status: 401, error: "Not signed in" };
  const user = state.users.find(u => u.id === session.userId);
  if (!user || user.status === "blocked") return { ok: false, status: 403, error: "Account blocked or not found" };
  if (user.role !== "admin" && !SUPER_ADMINS.includes(user.email.toLowerCase())) {
    return { ok: false, status: 403, error: "Admin access required" };
  }
  return { ok: true, user, state };
}

module.exports = (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }

  const url = (req.url || "").split("?")[0];
  const method = req.method;

  // ---- GET /api/admins ----
  if (method === "GET" && url === "/api/admins") {
    const check = requireAdmin(req, res);
    if (!check.ok) return json(res, check.status, { error: check.error });
    return json(res, 200, { ok: true, admins: check.state.admins });
  }

  const idMatch = url.match(/^\/api\/admins\/([^\/]+)$/);
  const blockMatch = url.match(/^\/api\/admins\/([^\/]+)\/block$/);

  // ---- POST /api/admins ----
  if (method === "POST" && url === "/api/admins") {
    const check = requireAdmin(req, res);
    if (!check.ok) return json(res, check.status, { error: check.error });
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const { email, name } = JSON.parse(body || "{}");
        const gmail = String(email || "").trim().toLowerCase();
        if (!gmail) return json(res, 400, { error: "Email required" });
        const state = load();
        if (state.admins.find(a => a.email.toLowerCase() === gmail)) {
          return json(res, 409, { error: "Admin already exists" });
        }
        const admin = {
          id: "a" + Date.now(),
          email: gmail,
          name: name || gmail.split("@")[0],
          role: "admin",
          status: "active",
          createdAt: new Date().toISOString()
        };
        // also ensure a user record exists
        if (!state.users.find(u => u.email.toLowerCase() === gmail)) {
          state.users.push({ id: "u" + Date.now(), email: gmail, name: admin.name, role: "admin", status: "active", createdAt: admin.createdAt });
        }
        state.admins.push(admin);
        state.audit.push({ id: "aud_" + Date.now(), userId: check.user.id, email: check.user.email, action: "admin_added", target: gmail, meta: `${check.user.name} added admin ${admin.name}`, at: new Date().toISOString() });
        save(state);
        return json(res, 200, { ok: true, admin });
      } catch (e) { return json(res, 500, { error: "Failed to add admin" }); }
    });
    return;
  }

  // ---- PUT /api/admins/:id ----
  if (method === "PUT" && idMatch) {
    const check = requireAdmin(req, res);
    if (!check.ok) return json(res, check.status, { error: check.error });
    const id = idMatch[1];
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const { email, name } = JSON.parse(body || "{}");
        const state = load();
        const admin = state.admins.find(a => a.id === id);
        if (!admin) return json(res, 404, { error: "Admin not found" });
        if (email) {
          const gmail = String(email).trim().toLowerCase();
          if (!gmail.endsWith("@gmail.com")) return json(res, 400, { error: "Only Gmail" });
          if (state.admins.find(a => a.id !== id && a.email.toLowerCase() === gmail)) {
            return json(res, 409, { error: "Email already in use" });
          }
          admin.email = gmail;
        }
        if (name) admin.name = name;
        // sync user record
        const u = state.users.find(u => u.email.toLowerCase() === (admin.email || "").toLowerCase());
        if (u && name) u.name = name;
        state.audit.push({ id: "aud_" + Date.now(), userId: check.user.id, email: check.user.email, action: "admin_edited", target: id, meta: `edited admin ${admin.name}`, at: new Date().toISOString() });
        save(state);
        return json(res, 200, { ok: true, admin });
      } catch (e) { return json(res, 500, { error: "Failed to edit admin" }); }
    });
    return;
  }

  // ---- DELETE /api/admins/:id ----
  if (method === "DELETE" && idMatch) {
    const check = requireAdmin(req, res);
    if (!check.ok) return json(res, check.status, { error: check.error });
    const id = idMatch[1];
    const state = load();
    const admin = state.admins.find(a => a.id === id);
    if (!admin) return json(res, 404, { error: "Admin not found" });
    if (SUPER_ADMINS.includes(admin.email.toLowerCase())) {
      return json(res, 403, { error: "Cannot delete a super admin owner" });
    }
    state.admins = state.admins.filter(a => a.id !== id);
    state.audit.push({ id: "aud_" + Date.now(), userId: check.user.id, email: check.user.email, action: "admin_deleted", target: admin.email, meta: `${check.user.name} deleted admin ${admin.name}`, at: new Date().toISOString() });
    save(state);
    return json(res, 200, { ok: true });
  }

  // ---- PATCH /api/admins/:id/block ----
  if (method === "PATCH" && blockMatch) {
    const check = requireAdmin(req, res);
    if (!check.ok) return json(res, check.status, { error: check.error });
    const id = blockMatch[1];
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const { blocked } = JSON.parse(body || "{}");
        const state = load();
        const admin = state.admins.find(a => a.id === id);
        if (!admin) return json(res, 404, { error: "Admin not found" });
        if (SUPER_ADMINS.includes(admin.email.toLowerCase())) {
          return json(res, 403, { error: "Cannot block a super admin owner" });
        }
        admin.status = blocked === true ? "blocked" : "active";
        // also block the user record
        const u = state.users.find(u => u.email.toLowerCase() === admin.email.toLowerCase());
        if (u) u.status = admin.status;
        state.audit.push({ id: "aud_" + Date.now(), userId: check.user.id, email: check.user.email, action: admin.status === "blocked" ? "admin_blocked" : "admin_unblocked", target: admin.email, meta: `${check.user.name} ${admin.status === "blocked" ? "blocked" : "unblocked"} ${admin.name}`, at: new Date().toISOString() });
        save(state);
        return json(res, 200, { ok: true, admin });
      } catch (e) { return json(res, 500, { error: "Failed to update block status" }); }
    });
    return;
  }

  json(res, 404, { error: "Not found" });
};
