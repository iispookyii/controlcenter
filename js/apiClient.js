/* ==========================================================================
   CONTROL CENTER — API Client
   Tries the Vercel serverless API; falls back to localStorage when offline
   ========================================================================== */

const API_BASE = ""; // same origin (Vercel routes /api/* to serverless functions)

const COLLECTIONS = ["vouchers","cashflow","payroll","blogs","invoices","leaves","overtime","tasks","audit"];

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  try {
    const res = await fetch(API_BASE + path, { ...opts, headers, credentials: "include" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Request failed");
    }
    return await res.json();
  } catch (e) {
    if (e.name === "TypeError" && e.message.includes("fetch")) {
      throw new Error("OFFLINE"); // network unreachable -> fallback
    }
    throw e;
  }
}

// LocalStorage fallback mirrors
const LS_PREFIX = "cc_";
function lsKey(k) { return LS_PREFIX + k; }
function lsLoad(k, def) {
  try { const r = localStorage.getItem(lsKey(k)); return r === null ? def : JSON.parse(r); }
  catch (e) { return def; }
}
function lsSave(k, v) { try { localStorage.setItem(lsKey(k), JSON.stringify(v)); } catch (e) {} }

let _cache = null;
const SUPER_ADMINS = ["actinst.admin@gmail.com", "dcchamie25@gmail.com"];

function lsState() {
  if (!_cache) {
    _cache = lsLoad("state", {
      users: [
        { id:"u0", email:"actinst.admin@gmail.com", name:"ACTI Admin", role:"admin", status:"active", createdAt: new Date().toISOString() },
        { id:"u1", email:"dcchamie25@gmail.com", name:"Chamie D.", role:"admin", status:"active", createdAt: new Date().toISOString() }
      ],
      admins: [
        { id:"a0", email:"actinst.admin@gmail.com", name:"ACTI Admin", role:"admin", status:"active", createdAt: new Date().toISOString() },
        { id:"a1", email:"dcchamie25@gmail.com", name:"Chamie D.", role:"admin", status:"active", createdAt: new Date().toISOString() }
      ],
      sessions: [], vouchers: [], cashflow: [], payroll: [], blogs: [], invoices: [],
      leaves: [], overtime: [], tasks: [], audit: [], notifications: [], employees: [], soaUploads: []
    });
  }
  return _cache;
}
function lsPersist() { lsSave("state", _cache); }

export class ApiClient {
  constructor() { this.useApi = true; }

  async _call(method, path, body) {
    try {
      const res = await apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
      this.useApi = true;
      return res;
    } catch (e) {
      if (path.startsWith("/api/auth/login")) throw e;
      this.useApi = false;
      return null; // fallback to local storage mirror
    }
  }

  /* ---------- Auth ---------- */
  async login(email) {
    const gmail = String(email || "").trim().toLowerCase();
    if (!gmail.endsWith("@gmail.com")) throw new Error("Only Gmail accounts are allowed.");
    if (!SUPER_ADMINS.includes(gmail)) throw new Error("Access denied. Only authorized super admins (" + SUPER_ADMINS.join(" or ") + ") can sign in.");
    const res = await this._call("POST", "/api/auth/login", { email: gmail });
    if (res && res.ok) {
      if (res.sessionId) { try { document.cookie = `cc_sid=${res.sessionId}; Path=/; SameSite=Lax`; } catch(_) {} }
      this.useApi = true;
      return { user: res.user };
    }
    // fallback: local-only login
    const state = lsState();
    let user = state.users.find(u => u.email.toLowerCase() === gmail);
    if (!user) {
      user = { id: "u" + Date.now(), email: gmail, name: gmail.split("@")[0], role: "admin", status: "active", createdAt: new Date().toISOString() };
      state.users.push(user);
      state.audit.push({ id: "aud_" + Date.now(), email: user.email, action: "user_created", target: user.email, meta: "Auto-registered", at: new Date().toISOString() });
    }
    if (user.status === "blocked") throw new Error("Your account is blocked.");
    state.sessions.push({ id: "s" + Date.now(), userId: user.id, email: user.email, loginAt: new Date().toISOString() });
    state.audit.push({ id: "aud_" + Date.now(), email: user.email, action: "login", target: user.email, meta: "Signed in (local)", at: new Date().toISOString() });
    lsPersist();
    return { user, local: true };
  }

  async session() {
    const res = await this._call("GET", "/api/auth/session");
    if (res && res.ok) { this.useApi = true; return res; }
    // fallback
    const state = lsState();
    const sid = (document.cookie.match(/(?:^|; )cc_sid=([^;]+)/) || [])[1];
    const sess = sid ? state.sessions.find(s => s.id === sid) : null;
    if (!sess) throw new Error("Not signed in");
    const user = state.users.find(u => u.id === sess.userId);
    if (!user || user.status === "blocked") throw new Error("Account blocked");
    return { ok: true, user };
  }

  async logout() {
    await this._call("POST", "/api/auth/logout");
    const state = lsState();
    state.sessions = [];
    lsPersist();
    return { ok: true };
  }

  /* ---------- Collections ---------- */
  async list(collection) {
    const res = await this._call("GET", `/api/data/${collection}`);
    if (res && res.ok) { this.useApi = true; return res.items; }
    return lsState()[collection];
  }

  async create(collection, item) {
    const res = await this._call("POST", `/api/data/${collection}`, item);
    if (res && res.ok) { this.useApi = true; return res.item; }
    const state = lsState();
    item.id = item.id || collection.slice(0,1) + Date.now();
    item.createdAt = item.createdAt || new Date().toISOString();
    state[collection].unshift(item);
    state.audit.push({ id: "aud_" + Date.now(), email: (item.createdBy||"user"), action: collection+"_created", target: item.id, meta: "created "+collection, at: new Date().toISOString() });
    lsPersist();
    return item;
  }

  async update(collection, id, updates) {
    const res = await this._call("PUT", `/api/data/${collection}/${id}`, updates);
    if (res && res.ok) { this.useApi = true; return res.item; }
    const state = lsState();
    const idx = state[collection].findIndex(i => i.id === id);
    if (idx === -1) throw new Error("Not found");
    state[collection][idx] = { ...state[collection][idx], ...updates, id };
    lsPersist();
    return state[collection][idx];
  }

  async remove(collection, id) {
    const res = await this._call("DELETE", `/api/data/${collection}/${id}`);
    if (res && res.ok) { this.useApi = true; return res.removed; }
    const state = lsState();
    const idx = state[collection].findIndex(i => i.id === id);
    if (idx === -1) throw new Error("Not found");
    const removed = state[collection].splice(idx, 1)[0];
    lsPersist();
    return removed;
  }

  /* ---------- Admins ---------- */
  async listAdmins() {
    const res = await this._call("GET", "/api/admins");
    if (res && res.ok) { this.useApi = true; return res.admins; }
    return lsState().admins;
  }

  async addAdmin(email, name) {
    const res = await this._call("POST", "/api/admins", { email, name });
    if (res && res.ok) { this.useApi = true; return res.admin; }
    const state = lsState();
    const gmail = String(email||"").trim().toLowerCase();
    if (state.admins.find(a => a.email.toLowerCase() === gmail)) throw new Error("Admin already exists");
    const admin = { id: "a"+Date.now(), email: gmail, name: name||gmail.split("@")[0], role: "admin", status: "active", createdAt: new Date().toISOString() };
    state.admins.push(admin);
    if (!state.users.find(u => u.email.toLowerCase() === gmail)) state.users.push({ id: "u"+Date.now(), email: gmail, name: admin.name, role: "admin", status: "active", createdAt: admin.createdAt });
    lsPersist();
    return admin;
  }

  async editAdmin(id, updates) {
    const res = await this._call("PUT", `/api/admins/${id}`, updates);
    if (res && res.ok) { this.useApi = true; return res.admin; }
    const state = lsState();
    const admin = state.admins.find(a => a.id === id);
    if (!admin) throw new Error("Admin not found");
    if (updates.email) admin.email = updates.email.trim().toLowerCase();
    if (updates.name) admin.name = updates.name;
    lsPersist();
    return admin;
  }

  async deleteAdmin(id) {
    const res = await this._call("DELETE", `/api/admins/${id}`);
    if (res && res.ok) { this.useApi = true; return true; }
    const state = lsState();
    state.admins = state.admins.filter(a => a.id !== id);
    lsPersist();
    return true;
  }

  async blockAdmin(id, blocked) {
    const res = await this._call("PATCH", `/api/admins/${id}/block`, { blocked });
    if (res && res.ok) { this.useApi = true; return res.admin; }
    const state = lsState();
    const admin = state.admins.find(a => a.id === id);
    if (!admin) throw new Error("Admin not found");
    admin.status = blocked ? "blocked" : "active";
    const u = state.users.find(u => u.email.toLowerCase() === admin.email.toLowerCase());
    if (u) u.status = admin.status;
    lsPersist();
    return admin;
  }
}

export const api = new ApiClient();
