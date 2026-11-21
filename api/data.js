/* ==========================================================================
   CONTROL CENTER — Data API (vouchers, cashflow, payroll, blogs, leaves,
   overtime, tasks, invoices, audit, employees, soaUploads)
   Endpoints (require session cookie cc_sid):
     GET    /api/data/:collection   -> list
     POST   /api/data/:collection   -> create
     PUT    /api/data/:collection/:id  -> update
     DELETE /api/data/:collection/:id  -> delete
   Collections: vouchers, cashflow, payroll, blogs, invoices, leaves,
   overtime, tasks, audit, employees, soaUploads
   ========================================================================== */

const { load, save } = require("./store");

const ALLOWED = new Set(["users","vouchers","cashflow","payroll","blogs","invoices","leaves","overtime","tasks","audit","employees","soaUploads","studentRequests"]);

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

function requireSession(req, res) {
  const state = load();
  const sid = getSessionId(req);
  const session = sid ? state.sessions.find(s => s.id === sid) : null;
  if (!session) return { ok: false, status: 401, error: "Not signed in" };
  const user = state.users.find(u => u.id === session.userId);
  if (!user || user.status === "blocked") return { ok: false, status: 403, error: "Account blocked" };
  return { ok: true, user, state };
}

module.exports = (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }

  const cleanUrl = (req.url || "").split("?")[0];
  const parts = cleanUrl.split("/").filter(Boolean); // ['api', 'data', 'collection', 'id']
  if (parts[0] !== "api" || parts[1] !== "data") return json(res, 404, { error: "Not found" });
  const collection = parts[2];
  const id = parts[3];
  if (!collection || !ALLOWED.has(collection)) return json(res, 404, { error: "Unknown collection" });

  const check = requireSession(req, res);
  if (!check.ok) return json(res, check.status, { error: check.error });
  const { user, state } = check;

  // ---- GET list ----
  if (req.method === "GET" && !id) {
    return json(res, 200, { ok: true, items: state[collection] });
  }

  // ---- POST create ----
  if (req.method === "POST" && !id) {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const item = JSON.parse(body || "{}");
        item.id = item.id || collection.slice(0,1) + Date.now();
        item.createdBy = item.createdBy || user.email;
        item.createdAt = item.createdAt || new Date().toISOString();
        state[collection].unshift(item);
        state.audit.push({ id: "aud_" + Date.now(), userId: user.id, email: user.email, action: collection + "_created", target: item.id, meta: `${user.name} created ${collection}`, at: new Date().toISOString() });
        save(state);
        return json(res, 200, { ok: true, item });
      } catch (e) { return json(res, 500, { error: "Create failed" }); }
    });
    return;
  }

  // ---- PUT update ----
  if (req.method === "PUT" && id) {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      try {
        const updates = JSON.parse(body || "{}");
        const idx = state[collection].findIndex(i => i.id === id);
        if (idx === -1) return json(res, 404, { error: "Not found" });
        state[collection][idx] = { ...state[collection][idx], ...updates, id };
        state.audit.push({ id: "aud_" + Date.now(), userId: user.id, email: user.email, action: collection + "_updated", target: id, meta: `${user.name} updated ${collection}`, at: new Date().toISOString() });
        save(state);
        return json(res, 200, { ok: true, item: state[collection][idx] });
      } catch (e) { return json(res, 500, { error: "Update failed" }); }
    });
    return;
  }

  // ---- DELETE ----
  if (req.method === "DELETE" && id) {
    const state2 = load();
    const idx = state2[collection].findIndex(i => i.id === id);
    if (idx === -1) return json(res, 404, { error: "Not found" });
    const removed = state2[collection].splice(idx, 1)[0];
    state2.audit.push({ id: "aud_" + Date.now(), userId: user.id, email: user.email, action: collection + "_deleted", target: id, meta: `${user.name} deleted ${collection}`, at: new Date().toISOString() });
    save(state2);
    return json(res, 200, { ok: true, removed });
  }

  json(res, 404, { error: "Not found" });
};
