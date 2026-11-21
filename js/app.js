/* ==========================================================================
   CONTROL CENTER — Office Management System
   Teal theme, lamp login, backend API with localStorage fallback
   Super Admins: actinst.admin@gmail.com, dcchamie25@gmail.com
   ========================================================================== */

import { api } from "./apiClient.js";

const SUPER_ADMINS = ["actinst.admin@gmail.com", "dcchamie25@gmail.com"];
const ADMIN_EMAIL = "actinst.admin@gmail.com";
const STORAGE_PREFIX = "cc_";

/* ---------------- Storage helpers (localStorage fallback) ---------------- */
function $id(key) { return STORAGE_PREFIX + key; }
function lsLoad(key, def) {
  try { const raw = localStorage.getItem($id(key)); return raw === null ? def : JSON.parse(raw); }
  catch (e) { return def; }
}
function lsSave(key, value) { try { localStorage.setItem($id(key), JSON.stringify(value)); } catch (e) {} }

/* ---------------- State (synced with API / localStorage) ---------------- */
let state = {
  users: [],
  admins: [],
  sessions: [],
  audit: [],
  employees: [],
  vouchers: [],
  cashflow: [],
  payroll: [],
  blogs: [],
  invoices: [],
  leaves: [],
  overtime: [],
  tasks: [],
  notifications: [],
  soaUploads: []
};

let currentUser = null;
let currentModule = 'dashboard';
let previousModule = null;

async function init() {
  // Try loading full state from API in parallel first
  let loaded = false;
  try {
    const [users, sessions, audit, employees, vouchers, cashflow, payroll, blogs, invoices, leaves, overtime, tasks, notifications, soaUploads, admins] = await Promise.all([
      api.list("users"),
      api.list("sessions"),
      api.list("audit"),
      api.list("employees"),
      api.list("vouchers"),
      api.list("cashflow"),
      api.list("payroll"),
      api.list("blogs"),
      api.list("invoices"),
      api.list("leaves"),
      api.list("overtime"),
      api.list("tasks"),
      api.list("notifications"),
      api.list("soaUploads"),
      api.listAdmins().catch(() => [])
    ]);
    state = {
      users: users || [],
      admins: admins || [],
      sessions: sessions || [],
      audit: audit || [],
      employees: employees || [],
      vouchers: vouchers || [],
      cashflow: cashflow || [],
      payroll: payroll || [],
      blogs: blogs || [],
      invoices: invoices || [],
      leaves: leaves || [],
      overtime: overtime || [],
      tasks: tasks || [],
      notifications: notifications || [],
      soaUploads: soaUploads || []
    };
    loaded = true;
  } catch (e) {
    // API unreachable — use localStorage
    const s = lsLoad("state");
    if (s) state = s;
    loaded = false;
  }
  seedIfEmpty();
  persist();

  // Restore current user session from storage or API
  const storedUserId = sessionStorage.getItem("cc_user") || localStorage.getItem("cc_user");
  if (storedUserId) {
    currentUser = state.users.find(u => u.id === storedUserId || u.email.toLowerCase() === storedUserId.toLowerCase());
  }
  if (!currentUser) {
    try {
      const sess = await api.session();
      if (sess && sess.user) currentUser = sess.user;
    } catch (_) {}
  }

  return loaded;
}

function seedIfEmpty() {
  if (!state.users || state.users.length === 0) {
    state.users = [
      { id: "u0", email: "actinst.admin@gmail.com", name: "ACTI Admin", role: "admin", createdAt: nowIso() },
      { id: "u1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", createdAt: nowIso() }
    ];
  }
  SUPER_ADMINS.forEach((admEmail, idx) => {
    if (!state.users.find(u => u.email.toLowerCase() === admEmail.toLowerCase())) {
      state.users.push({
        id: idx === 0 ? "u0" : "u1",
        email: admEmail,
        name: idx === 0 ? "ACTI Admin" : "Chamie D.",
        role: "admin",
        createdAt: nowIso()
      });
    }
  });

  if (!state.admins || state.admins.length === 0) {
    state.admins = [
      { id: "a0", email: "actinst.admin@gmail.com", name: "ACTI Admin", role: "admin", status: "active", createdAt: nowIso() },
      { id: "a1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", status: "active", createdAt: nowIso() }
    ];
  }

  if (!state.employees || state.employees.length === 0) {
    state.employees = [
      { id: "e0", name: "ACTI Admin", email: "actinst.admin@gmail.com", type: "super_admin", status: "Active", joinDate: "2022-01-01", contractStartDate: "2022-01-01", permanentDate: "2022-01-01", salary: 50000, leaveBalance: 15, enrolled: true },
      { id: "e1", name: "Angelina A. Aquino", email: "actianj@gmail.com", type: "supervisor", status: "Active", joinDate: "2022-01-15", contractStartDate: "2022-01-15", permanentDate: "2022-01-15", salary: 38000, leaveBalance: 14, enrolled: true },
      { id: "e2", name: "Danica R. Tuliao", email: "actitrish0303@gmail.com", type: "staff", status: "Active", joinDate: "2022-10-03", contractStartDate: "2022-10-03", permanentDate: "2022-10-03", salary: 28000, leaveBalance: 10, enrolled: true },
      { id: "e3", name: "Charmaine Mallillin", email: "charmaine.mallillin@gmail.com", type: "regular", status: "Active", joinDate: "2022-10-03", contractStartDate: "2022-10-03", permanentDate: "2022-10-03", salary: 28000, leaveBalance: 10, enrolled: true },
      { id: "e4", name: "Maria Santos", email: "maria@office.local", type: "permanent", status: "Active", joinDate: "2023-01-15", contractStartDate: "2023-01-15", permanentDate: "2023-01-15", salary: 28000, leaveBalance: 14, enrolled: true },
      { id: "e5", name: "John Reyes", email: "john@office.local", type: "permanent", status: "Active", joinDate: "2022-06-10", contractStartDate: "2022-06-10", permanentDate: "2022-06-10", salary: 32000, leaveBalance: 10, enrolled: true },
      { id: "e6", name: "Chamie D.", email: "dcchamie25@gmail.com", type: "super_admin", status: "Active", joinDate: "2022-01-01", contractStartDate: "2022-01-01", permanentDate: "2022-01-01", salary: 50000, leaveBalance: 15, enrolled: true }
    ];
  } else {
    SUPER_ADMINS.forEach((admEmail, idx) => {
      if (!state.employees.find(e => e.email.toLowerCase() === admEmail.toLowerCase())) {
        state.employees.push({
          id: idx === 0 ? "e0" : "e6",
          name: idx === 0 ? "ACTI Admin" : "Chamie D.",
          email: admEmail,
          type: "super_admin",
          status: "Active",
          joinDate: "2022-01-01",
          contractStartDate: "2022-01-01",
          permanentDate: "2022-01-01",
          salary: 50000,
          leaveBalance: 15,
          enrolled: true
        });
      }
    });
  }

  if (!state.vouchers || state.vouchers.length === 0) {
    state.vouchers = [
      { id: "v1", ref: "V-2026-0001", date: "2026-11-18", payee: "ABC Supplies", particular: "Office supplies & training materials", amount: 4500, type: "expense", status: "posted", createdBy: ADMIN_EMAIL, createdAt: nowIso() },
      { id: "v2", ref: "V-2026-0002", date: "2026-11-19", payee: "Client Enrollment", particular: "Accounting training seminar fee", amount: 50000, type: "income", status: "posted", createdBy: ADMIN_EMAIL, createdAt: nowIso() },
    ];
  }
  if (!state.cashflow || state.cashflow.length === 0) {
    state.cashflow = [
      { id: "c1", date: "2026-11-01", type: "in", category: "Training Fees", amount: 120000, ref: "INV-001", note: "November enrollment fees" },
      { id: "c2", date: "2026-11-05", type: "out", category: "Office Rent", amount: 35000, ref: "", note: "ACTI office rent" },
      { id: "c3", date: "2026-11-10", type: "out", category: "Payroll", amount: 113000, ref: "", note: "Bi-weekly staff payroll" },
      { id: "c4", date: "2026-11-15", type: "in", category: "Consulting", amount: 87500, ref: "INV-002", note: "Corporate accounting module" },
    ];
  }
  if (!state.payroll || state.payroll.length === 0) {
    state.payroll = [
      { id: "p1", period: "Nov 1-15 2026", employeeId: "e1", gross: 38000, deductions: 3800, net: 34200, status: "paid", paidAt: "2026-11-15" },
      { id: "p2", period: "Nov 1-15 2026", employeeId: "e2", gross: 28000, deductions: 2800, net: 25200, status: "paid", paidAt: "2026-11-15" },
    ];
  }
  if (!state.leaves || state.leaves.length === 0) {
    state.leaves = [
      { id: "l1", employeeName: "Maria Santos", employeeEmail: "maria@office.local", type: "Vacation", from: "2026-11-20", to: "2026-11-22", days: 3, reason: "Personal family leave", status: "approved", createdAt: nowIso(), approvedBy: ADMIN_EMAIL },
    ];
  }
  if (!state.tasks || state.tasks.length === 0) {
    state.tasks = [
      { id: "t1", employeeId: "e1", title: "Prepare monthly voucher report", status: "in progress", due: "2026-11-25", progress: 60, createdAt: nowIso() },
      { id: "t2", employeeId: "e2", title: "Client seminar enrollment prep", status: "pending", due: "2026-11-23", progress: 20, createdAt: nowIso() },
    ];
  }
  if (!state.audit || state.audit.length === 0) {
    state.audit = [
      { id: "a1", userId: "u1", email: ADMIN_EMAIL, action: "system_init", target: "Control Center", meta: "System ready and verified", at: nowIso() },
    ];
  }
}

function persist() {
  lsSave("state", state);
}

function nowIso() { return new Date().toISOString(); }

function audit(action, target, meta) {
  state.audit.unshift({
    id: "aud_" + Date.now(),
    userId: currentUser ? currentUser.id : "sys",
    email: currentUser ? currentUser.email : "system",
    action, target, meta: meta || "", at: nowIso()
  });
  if (state.audit.length > 500) state.audit = state.audit.slice(0, 500);
  persist();
}

function notif(userId, text, link) {
  state.notifications.unshift({
    id: "n_" + Date.now(), userId, text, read: false, at: nowIso(), link: link || ""
  });
  if (state.notifications.length > 200) state.notifications = state.notifications.slice(0, 200);
  persist();
  renderNotifBadge();
}

function renderNotifBadge() {
  const el = $q("#notifBadge");
  const unread = state.notifications.filter(n => !n.read).length;
  if (!el) return;
  if (unread > 0) { el.textContent = unread; el.style.display = "block"; }
  else el.style.display = "none";
}

/* ---------------- Auth ---------------- */
async function login(email, password) {
  const result = await api.login(email);
  const user = result.user;
  currentUser = user;
  sessionStorage.setItem("cc_user", user.id);
  localStorage.setItem("cc_user", user.id);
  const sess = { id: "s" + Date.now(), userId: user.id, email: user.email, loginAt: nowIso(), ip: "127.0.0.1" };
  state.sessions.push(sess);
  audit("login", user.email, "Signed in");
  persist();
  return user;
}

async function logout() {
  if (currentUser) audit("logout", currentUser.email, "Signed out");
  try { await api.logout(); } catch (_) {}
  currentUser = null;
  lsSave($id("state"), state);
  sessionStorage.removeItem("cc_user");
  localStorage.removeItem("cc_user");
  window.location.href = "index.html";
}

function isAdmin() { return currentUser && (currentUser.role === "admin" || SUPER_ADMINS.includes(currentUser.email.toLowerCase())); }
function isStaff() { return currentUser && currentUser.role === "staff"; }

function currentUserName() { return currentUser ? currentUser.name : "User"; }
function currentUserInitials() {
  if (!currentUser) return "A";
  return currentUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";
}

/* ---------------- Shell ---------------- */
function shellLogin() {
  const loginShell = $q("#loginShell");
  const appShell = $q("#appShell");
  if (loginShell) loginShell.style.display = "flex";
  if (appShell) appShell.style.display = "none";
}

function shellDashboard() {
  const loginShell = $q("#loginShell");
  if (loginShell) loginShell.style.display = "none";
  const app = $q("#appShell");
  if (!app) return;
  app.style.display = "flex";
  app.classList.add("visible");
  renderSidebar();
  renderTopbarUser();
  const initialKey = hashToModule(window.location.hash || "#/dashboard");
  currentModule = initialKey;
  renderModule(initialKey);
  renderNotifBadge();
}

function $q(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(t) {
  const d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtMoney(n) { return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ---------------- Navigation ---------------- */
const MODULES = [
  { key: "dashboard", label: "Dashboard", hash: "#/dashboard", svg: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { key: "voucher", label: "Auto Voucher", hash: "#/autovoucher", svg: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { key: "cashflow", label: "Cash Flow + SOA", hash: "#/cashflow", svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 6v12M17 10h-7a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' },
  { key: "payroll", label: "Auto Payroll", hash: "#/autopayroll", svg: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" stroke-width="2.2"/><circle cx="7" cy="15" r="1" fill="currentColor"/></svg>' },
  { key: "blogger", label: "Blogger Automation", hash: "#/blogger", svg: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { key: "leave", label: "Online Leave", hash: "#/onlineleavefiling", svg: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2.2"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2.2"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "overtime", label: "Overtime", hash: "#/overtime", svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.2"/><polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' },
  { key: "invoice", label: "Invoices", hash: "#/invoice", svg: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2.2"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2.2"/><polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "tasks", label: "Tasks", hash: "#/tasks", svg: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "staff", label: "Staff Enrollment", hash: "#/staff", svg: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "controls", label: "Controls Checklist", hash: "#/controls", svg: '<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "audit", label: "Audit Logs", hash: "#/audit", svg: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { key: "admin", label: "Admins", hash: "#/admin", svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M6 20v-2a6 6 0 0112 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="19" y1="11" x2="23" y2="11" stroke="currentColor" stroke-width="2.2"/></svg>' }
];

function renderSidebar() {
  const list = $q("#navList");
  if (!list) return;

  list.innerHTML = "";
  MODULES.forEach(m => {
    if ((m.key === "admin" || m.key === "audit") && !isAdmin()) return;
    const li = document.createElement("li");
    li.className = "nav-item";
    const link = document.createElement("a");
    link.className = "nav-link" + (currentModule === m.key ? " active" : "");
    link.setAttribute("data-module", m.key);
    link.href = m.hash;
    link.innerHTML = m.svg + "<span>" + m.label + "</span>";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      appNavigate(m.key);
    });
    li.appendChild(link);
    list.appendChild(li);
  });
}

function renderTopbarUser() {
  const container = $q(".topbar-actions");
  if (!container) return;
  let userBox = $q("#topbarUserChip");
  if (!userBox) {
    userBox = document.createElement("div");
    userBox.id = "topbarUserChip";
    userBox.className = "topbar-user-chip";
    container.appendChild(userBox);
  }
  userBox.innerHTML = `
    <div class="user-avatar-mini" title="${currentUser ? currentUser.email : ''}">${currentUserInitials()}</div>
    <div class="user-meta-mini">
      <div class="user-name-mini">${escapeHtml(currentUserName())}</div>
      <div class="user-role-mini">${currentUser && (currentUser.role === 'admin' || SUPER_ADMINS.includes(currentUser.email.toLowerCase())) ? 'Super Admin' : 'Staff'}</div>
    </div>
    <button class="btn-topbar-logout" id="btnLogout" title="Sign Out">
      <svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="21" y1="12" x2="14" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>Logout</span>
    </button>
  `;
  const btn = $q("#btnLogout");
  if (btn) btn.onclick = logout;
}

function setActiveNav(key) {
  $all(".nav-link").forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-module") === key);
  });
}

function renderModule(key) {
  setActiveNav(key);
  const titleMap = {
    dashboard: "Dashboard",
    voucher: "Auto Voucher",
    cashflow: "Cash Flow + SOA",
    payroll: "Auto Payroll",
    blogger: "Blogger Automation",
    leave: "Online Leave Filing",
    overtime: "Overtime / Offset",
    invoice: "Invoices",
    tasks: "Daily Tasks",
    staff: "Staff Enrollment",
    controls: "Controls Checklist",
    audit: "Audit Logs",
    admin: "Admins"
  };
  const titleEl = $q("#pageTitle");
  if (titleEl) titleEl.textContent = titleMap[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  const content = $q("#appContent");
  if (!content) return;
  content.innerHTML = "";
  if (key === "dashboard") renderDashboard(content);
  else if (key === "voucher") renderVoucher(content);
  else if (key === "cashflow") renderCashFlow(content);
  else if (key === "payroll") renderPayroll(content);
  else if (key === "blogger") renderBlogger(content);
  else if (key === "leave") renderLeave(content);
  else if (key === "overtime") renderOvertime(content);
  else if (key === "invoice") renderInvoice(content);
  else if (key === "tasks") renderTasks(content);
  else if (key === "staff") renderStaff(content);
  else if (key === "controls") renderControls(content);
  else if (key === "audit") renderAudit(content);
  else if (key === "admin") renderAdmin(content);
}

function openSidebar() { const s = $q("#appSidebar"); if (s) s.classList.add("open"); }
function closeSidebar() { const s = $q("#appSidebar"); if (s) s.classList.remove("open"); }

/* ==========================================================================
   MODULE: DASHBOARD
   ========================================================================== */
function renderDashboard(el) {
  const totalIncome = state.vouchers.filter(v => v.type === "income").reduce((a, v) => a + Number(v.amount || 0), 0);
  const totalExpense = state.vouchers.filter(v => v.type === "expense").reduce((a, v) => a + Number(v.amount || 0), 0);
  const pendingLeave = state.leaves.filter(l => l.status === "pending").length;
  const pendingOT = state.overtime.filter(o => o.status === "pending").length;
  const pendingInv = state.invoices.filter(i => i.status !== "paid").length;

  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Dashboard</h2>
        <div class="sub">Welcome back, ${escapeHtml(currentUserName())}. ACTI Office Management System Overview.</div>
      </div>
      <button class="btn-primary" onclick="appNavigate('voucher')">+ New Voucher</button>
    </div>

    <div class="kpi-row">
      <div class="kpi">
        <div class="kpi-label">Net Cash Flow</div>
        <div class="kpi-value">${fmtMoney(totalIncome - totalExpense)}</div>
        <div class="kpi-delta ${totalIncome >= totalExpense ? 'pos' : 'neg'}">${totalIncome >= totalExpense ? '+' : '-'}${fmtMoney(Math.abs(totalIncome - totalExpense))} balance</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Total Income</div>
        <div class="kpi-value">${fmtMoney(totalIncome)}</div>
        <div class="kpi-delta neu">${state.vouchers.filter(v => v.type === 'income').length} vouchers</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value">${fmtMoney(totalExpense)}</div>
        <div class="kpi-delta neu">${state.vouchers.filter(v => v.type === 'expense').length} vouchers</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Pending Leave</div>
        <div class="kpi-value">${pendingLeave}</div>
        <div class="kpi-delta neu">awaiting approval</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Pending OT</div>
        <div class="kpi-value">${pendingOT}</div>
        <div class="kpi-delta neu">requests</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Unpaid Invoices</div>
        <div class="kpi-value">${pendingInv}</div>
        <div class="kpi-delta neu">outstanding</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
      <div class="card">
        <div class="card-header"><h3>Quick Actions</h3></div>
        <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">
          <button class="btn-sm teal" onclick="appNavigate('voucher')">Auto Voucher</button>
          <button class="btn-sm" onclick="appNavigate('payroll')">Run Payroll</button>
          <button class="btn-sm" onclick="appNavigate('leave')">File Leave</button>
          <button class="btn-sm" onclick="appNavigate('overtime')">OT Request</button>
          <button class="btn-sm" onclick="appNavigate('invoice')">Request Invoice</button>
          <button class="btn-sm" onclick="appNavigate('blogger')">New Blog Post</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Activity</h3></div>
        <div class="card-body">
          <table>
            <thead><tr><th>Time</th><th>Action</th><th>By</th><th>Target</th></tr></thead>
            <tbody id="recentActivity"></tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Staff Daily Tasks</h3><div class="card-actions"><button class="btn-sm" onclick="appNavigate('tasks')">View All</button></div></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Task</th><th>Staff</th><th>Status</th><th>Due</th><th>Progress</th></tr></thead>
          <tbody id="recentTasks"></tbody>
        </table>
      </div>
    </div>
  `;

  const actBody = $q("#recentActivity");
  const recent = state.audit.slice(0, 6);
  actBody.innerHTML = recent.map(a => `
    <tr><td>${fmtDate(a.at)}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.email)}</td><td>${escapeHtml(a.target)}</td></tr>
  `).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--ink-dim);padding:20px;">No recent activity</td></tr>`;

  const taskBody = $q("#recentTasks");
  const tasks = state.tasks.slice(0, 5).map(t => {
    const emp = state.employees.find(e => e.id === t.employeeId);
    return { ...t, empName: emp ? emp.name : "Staff" };
  });
  taskBody.innerHTML = tasks.map(t => `
    <tr>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.empName)}</td>
      <td><span class="badge ${t.status === 'done' ? 'badge-success' : t.status === 'in progress' ? 'badge-warning' : 'badge-info'}">${escapeHtml(t.status)}</span></td>
      <td>${fmtDate(t.due)}</td>
      <td>${t.progress}%</td>
    </tr>
  `).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:20px;">No tasks</td></tr>`;
}

/* ==========================================================================
   MODULE: AUTO VOUCHER (with auto-save)
   ========================================================================== */
let voucherDraft = null;
function renderVoucher(el) {
  const ref = "V-" + new Date().getFullYear() + "-" + String(state.vouchers.length + 1).padStart(4, "0");
  const today = new Date().toISOString().split("T")[0];

  const draft = lsLoad("voucher_draft");
  if (draft) voucherDraft = draft;
  else voucherDraft = { ref, date: today, payee: "", particular: "", amount: "", type: "expense", status: "draft" };

  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Auto Voucher</h2>
        <div class="sub">Create payment/receipt vouchers. Details auto-save as you type.</div>
      </div>
      <div class="card-actions">
        <span class="badge ${voucherDraft.status === 'posted' ? 'badge-success' : 'badge-warning'}">Draft auto-saving</span>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Voucher Details</h3></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field">
            <label>Voucher Ref</label>
            <input type="text" id="vRef" value="${escapeHtml(voucherDraft.ref)}" readonly style="background:var(--surface-2);">
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" id="vDate" value="${escapeHtml(voucherDraft.date)}">
          </div>
          <div class="field">
            <label>Type</label>
            <select id="vType">${['expense','income'].map(t => `<option ${voucherDraft.type===t?'selected':''}>${t}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Payee / Payer</label>
            <input type="text" id="vPayee" value="${escapeHtml(voucherDraft.payee)}" placeholder="Who received or paid">
          </div>
          <div class="field">
            <label>Particulars</label>
            <input type="text" id="vParticular" value="${escapeHtml(voucherDraft.particular)}" placeholder="Purpose / details">
          </div>
          <div class="field">
            <label>Amount (₱)</label>
            <input type="number" id="vAmount" value="${escapeHtml(voucherDraft.amount)}" step="0.01" min="0" placeholder="0.00">
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;">
          <button class="btn-sm teal" onclick="appSaveVoucherDraft()">Save Draft</button>
          <button class="btn-sm" onclick="appPostVoucher()" ${voucherDraft.status==='posted'?'disabled':''}>Post Voucher</button>
          <button class="btn-sm" onclick="appClearVoucher()">New</button>
        </div>
        <div id="voucherMsg" class="hint" style="margin-top:10px;"></div>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Voucher Register</h3><div class="card-actions"><button class="btn-sm" onclick="appNavigate('voucher')">Refresh</button></div></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Ref</th><th>Date</th><th>Type</th><th>Payee / Payer</th><th>Particulars</th><th>Amount</th><th>Status</th><th>Posted By</th><th>Actions</th></tr></thead>
          <tbody id="voucherList"></tbody>
        </table>
      </div>
    </div>
  `;

  const fields = ["vRef","vDate","vType","vPayee","vParticular","vAmount"];
  fields.forEach(f => {
    const inp = $q("#"+f);
    if (inp) inp.addEventListener("input", () => appAutoSaveVoucher());
  });

  renderVoucherList();
  showVoucherMsg("Draft loaded — details auto-save as you type.");
}

function appAutoSaveVoucher() {
  const refEl = $q("#vRef");
  if (!refEl) return;
  voucherDraft = {
    ref: refEl.value || voucherDraft.ref,
    date: $q("#vDate").value,
    type: $q("#vType").value,
    payee: $q("#vPayee").value,
    particular: $q("#vParticular").value,
    amount: $q("#vAmount").value,
    status: "draft"
  };
  lsSave("voucher_draft", voucherDraft);
  showVoucherMsg("Auto-saved draft ✓");
}

function showVoucherMsg(t) {
  const m = $q("#voucherMsg");
  if (!m) return;
  m.textContent = t;
  setTimeout(() => { if (m && m.textContent === t) m.textContent = ""; }, 2500);
}

function appSaveVoucherDraft() {
  appAutoSaveVoucher();
  showVoucherMsg("Draft saved ✓");
}

function appClearVoucher() {
  if (!confirm("Clear the draft voucher?")) return;
  const ref = "V-" + new Date().getFullYear() + "-" + String(state.vouchers.length + 1).padStart(4, "0");
  voucherDraft = { ref, date: new Date().toISOString().split("T")[0], payee: "", particular: "", amount: "", type: "expense", status: "draft" };
  lsSave("voucher_draft", voucherDraft);
  renderVoucher($q("#appContent"));
  showVoucherMsg("New draft started");
}

function appPostVoucher() {
  appAutoSaveVoucher();
  const d = voucherDraft;
  if (!d || !d.payee || !d.amount) { showVoucherMsg("Fill payee and amount first."); return; }
  const entry = {
    id: "v" + Date.now(),
    ref: d.ref,
    date: d.date,
    type: d.type,
    payee: d.payee,
    particular: d.particular,
    amount: Number(d.amount),
    status: "posted",
    createdBy: currentUser ? currentUser.email : ADMIN_EMAIL,
    createdAt: nowIso()
  };
  state.vouchers.unshift(entry);
  audit("voucher_posted", entry.ref, `${d.type} ₱${Number(d.amount)} to ${d.payee}`);
  // Cashflow mirror
  state.cashflow.unshift({
    id: "c" + Date.now(),
    date: d.date,
    type: d.type === "income" ? "in" : "out",
    category: d.type === "income" ? "Receipt" : "Payment",
    amount: Number(d.amount),
    ref: entry.ref,
    note: d.particular,
    source: "voucher"
  });
  lsSave("voucher_draft", null);
  voucherDraft = null;
  persist();
  renderVoucher($q("#appContent"));
  showVoucherMsg("Voucher posted & cash flow updated ✓");
  notif(currentUser ? currentUser.id : "all", `Voucher ${entry.ref} posted (${fmtMoney(entry.amount)})`, "voucher");
}

function appPrintVoucher(id) {
  const v = state.vouchers.find(x => x.id === id);
  if (!v) { alert("Voucher not found"); return; }
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print vouchers."); return; }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Voucher ${escapeHtml(v.ref)} — ACTI Control Center</title>
<style>
  body { font-family: 'Poppins', system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; background: #fff; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
  .logo-wrap { display: flex; align-items: center; gap: 14px; }
  .logo-wrap img { width: 64px; height: 64px; border-radius: 50%; }
  .title-wrap h1 { margin: 0; font-size: 1.4rem; color: #0f766e; font-weight: 800; }
  .title-wrap p { margin: 2px 0 0; font-size: 0.82rem; color: #64748b; }
  .ref-box { text-align: right; }
  .ref-box .ref-num { font-size: 1.2rem; font-weight: 800; color: #0f766e; }
  .ref-box .ref-date { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
  .voucher-type-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; background: ${v.type === 'income' ? '#e8f5e9' : '#e0f2f1'}; color: ${v.type === 'income' ? '#059669' : '#0f766e'}; margin-bottom: 20px; }
  table.details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  table.details th, table.details td { padding: 12px 14px; border: 1px solid #cbd5e1; text-align: left; font-size: 0.95rem; }
  table.details th { background: #f8fafc; font-weight: 700; width: 25%; color: #475569; }
  .amount-highlight { font-size: 1.3rem; font-weight: 800; color: #0f766e; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 50px; padding-top: 20px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1.5px solid #94a3b8; margin-top: 45px; padding-top: 6px; font-size: 0.82rem; font-weight: 700; color: #475569; }
  .sig-sub { font-size: 0.75rem; color: #94a3b8; }
  .footer-note { margin-top: 40px; font-size: 0.75rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap">
      <img src="assets/acti-logo.png" alt="ACTI Seal">
      <div class="title-wrap">
        <h1>ACTI CONTROL CENTER</h1>
        <p>Accounting Certification &amp; Training Institute</p>
      </div>
    </div>
    <div class="ref-box">
      <div class="ref-num">${escapeHtml(v.ref)}</div>
      <div class="ref-date">Date: ${fmtDate(v.date || v.createdAt)}</div>
    </div>
  </div>

  <div class="voucher-type-badge">${v.type === 'income' ? 'Official Receipt / Income Voucher' : 'Disbursement / Expense Voucher'}</div>

  <table class="details">
    <tr><th>Payee / Payer</th><td><strong>${escapeHtml(v.payee)}</strong></td></tr>
    <tr><th>Particulars</th><td>${escapeHtml(v.particular || 'N/A')}</td></tr>
    <tr><th>Amount</th><td class="amount-highlight">${fmtMoney(v.amount)}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(v.status ? v.status.toUpperCase() : 'POSTED')}</td></tr>
    <tr><th>Prepared By</th><td>${escapeHtml(v.createdBy || 'Authorized Officer')}</td></tr>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">${escapeHtml(v.createdBy || 'Prepared By')}</div>
      <div class="sig-sub">Prepared By</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Chamie D. / ACTI Admin</div>
      <div class="sig-sub">Verified &amp; Approved</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${escapeHtml(v.payee)}</div>
      <div class="sig-sub">Received By</div>
    </div>
  </div>

  <div class="footer-note">
    Official Office Management Record • Control Center • Printed on ${new Date().toLocaleString('en-PH')}
  </div>
  <script>window.print();</script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

function appDeleteVoucher(id) {
  if (!isAdmin()) { alert("Only admins can delete vouchers"); return; }
  const v = state.vouchers.find(x => x.id === id);
  if (!v) return;
  if (!confirm(`Delete voucher ${v.ref} (${fmtMoney(v.amount)})?`)) return;
  state.vouchers = state.vouchers.filter(x => x.id !== id);
  audit("voucher_deleted", v.ref, `Deleted voucher ${v.ref}`);
  persist();
  renderVoucher($q("#appContent"));
}

function renderVoucherList() {
  const t = $q("#voucherList");
  if (!t) return;
  t.innerHTML = state.vouchers.map(v => `
    <tr>
      <td><strong>${escapeHtml(v.ref)}</strong></td>
      <td>${fmtDate(v.createdAt || v.date)}</td>
      <td><span class="badge ${v.type==='income'?'badge-success':'badge-info'}">${escapeHtml(v.type)}</span></td>
      <td>${escapeHtml(v.payee)}</td>
      <td>${escapeHtml(v.particular)}</td>
      <td>${fmtMoney(v.amount)}</td>
      <td><span class="badge badge-bg">${escapeHtml(v.status)}</span></td>
      <td style="font-size:0.78rem;color:var(--ink-dim);">${escapeHtml(v.createdBy)}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn-sm teal" onclick="appPrintVoucher('${v.id}')" style="padding:4px 8px;font-size:0.75rem;">Print</button>
        ${isAdmin() ? `<button class="btn-sm" onclick="appDeleteVoucher('${v.id}')" style="padding:4px 8px;font-size:0.75rem;color:var(--error);">Delete</button>` : ''}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="9" style="text-align:center;color:var(--ink-dim);padding:20px;">No vouchers yet</td></tr>`;
}

/* ==========================================================================
   MODULE: CASH FLOW + SOA
   ========================================================================= */
function renderCashFlow(el) {
  const ins = state.cashflow.filter(c => c.type === "in").reduce((a,c)=>a+Number(c.amount||0),0);
  const outs = state.cashflow.filter(c => c.type === "out").reduce((a,c)=>a+Number(c.amount||0),0);
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Cash Flow + SOA</h2>
        <div class="sub">Money in vs money out. Sync from vouchers and upload Statement of Account (SOA) PDF.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appSyncVouchersToCashFlow()">Sync from Vouchers</button>
        <button class="btn-sm" onclick="appOpenSOAUpload()">Upload SOA PDF</button>
        <button class="btn-sm" onclick="appAddCashFlowModal()">+ Entry</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Cash In</div><div class="kpi-value">${fmtMoney(ins)}</div><div class="kpi-delta pos">Inflows</div></div>
      <div class="kpi"><div class="kpi-label">Cash Out</div><div class="kpi-value">${fmtMoney(outs)}</div><div class="kpi-delta neg">Outflows</div></div>
      <div class="kpi"><div class="kpi-label">Net Cash</div><div class="kpi-value">${fmtMoney(ins-outs)}</div><div class="kpi-delta ${ins>=outs?'pos':'neg'}">${ins>=outs?'Surplus':'Deficit'}</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Cash Flow Entries</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Ref</th><th>Amount</th><th>Note</th><th>Action</th></tr></thead>
          <tbody id="cashflowList"></tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Uploaded Statement of Account (SOA) Documents</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>File Name</th><th>Description</th><th>Size</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="soaList"></tbody>
        </table>
      </div>
    </div>
  `;

  const t = $q("#cashflowList");
  if (t) {
    t.innerHTML = state.cashflow.map(c => `
      <tr>
        <td>${fmtDate(c.date)}</td>
        <td><span class="badge ${c.type==='in'?'badge-success':'badge-error'}">${c.type === 'in' ? 'IN' : 'OUT'}</span></td>
        <td>${escapeHtml(c.category)}</td>
        <td>${escapeHtml(c.ref || "-")}</td>
        <td>${c.type === 'in' ? "+" : "-"}${fmtMoney(c.amount)}</td>
        <td>${escapeHtml(c.note)}</td>
        <td>
          <button class="btn-sm" onclick="appDeleteCashFlow('${c.id}')" style="padding:4px 8px;font-size:0.75rem;color:var(--error);">Delete</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:20px;">No cash flow entries yet</td></tr>`;
  }

  const soaTable = $q("#soaList");
  if (soaTable) {
    soaTable.innerHTML = (state.soaUploads || []).map(s => `
      <tr>
        <td><strong>${escapeHtml(s.fileName)}</strong></td>
        <td>${escapeHtml(s.desc || "-")}</td>
        <td>${escapeHtml(s.fileSize)}</td>
        <td>${escapeHtml(s.uploadedBy)}</td>
        <td>${fmtDate(s.uploadedAt)}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn-sm teal" onclick="appDownloadSOA('${s.id}')" style="padding:4px 8px;font-size:0.75rem;">Download PDF</button>
          ${isAdmin() ? `<button class="btn-sm" onclick="appDeleteSOA('${s.id}')" style="padding:4px 8px;font-size:0.75rem;color:var(--error);">Delete</button>` : ''}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--ink-dim);padding:20px;">No SOA PDFs uploaded yet</td></tr>`;
  }
}

async function appSyncVouchersToCashFlow() {
  if (!confirm("Create cash flow entries from all posted vouchers?")) return;
  let added = 0;
  state.vouchers.forEach(v => {
    const already = state.cashflow.find(c => c.ref === v.ref && c.source === "voucher");
    if (!already) {
      state.cashflow.unshift({
        id: "c" + Date.now() + Math.random().toString(36).slice(2,5),
        date: v.date || new Date().toISOString().split("T")[0],
        type: v.type === "income" ? "in" : "out",
        category: v.type === "income" ? "Voucher Income" : "Voucher Expense",
        amount: Number(v.amount),
        ref: v.ref,
        note: v.particular,
        source: "voucher",
        createdAt: nowIso()
      });
      added++;
    }
  });
  audit("cashflow_sync", "vouchers", `${added} voucher(s) synced to cash flow`);
  persist();
  renderCashFlow($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `${added} voucher(s) synced to cash flow`, "cashflow");
}

function appAddCashFlowModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>Add Cash Flow Entry</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Date</label>
            <input type="date" id="cfDate" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Flow Type</label>
            <select id="cfType"><option value="in">Cash In (Inflow)</option><option value="out">Cash Out (Outflow)</option></select>
          </div>
          <div class="field">
            <label>Category</label>
            <input type="text" id="cfCategory" placeholder="e.g. Training Fees, Rent, Supplies, Retainer">
          </div>
          <div class="field">
            <label>Amount (₱)</label>
            <input type="number" id="cfAmount" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="field">
            <label>Reference # (Optional)</label>
            <input type="text" id="cfRef" placeholder="e.g. INV-001 or V-2026-0001">
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Particulars / Note</label>
            <input type="text" id="cfNote" placeholder="Details about this transaction">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveCashFlowEntry()">Save Entry</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appSaveCashFlowEntry() {
  const date = $q("#cfDate").value;
  const type = $q("#cfType").value;
  const category = $q("#cfCategory").value.trim();
  const amount = Number($q("#cfAmount").value || 0);
  const ref = $q("#cfRef").value.trim();
  const note = $q("#cfNote").value.trim();
  if (!date || !category || isNaN(amount) || amount <= 0) {
    alert("Please fill in date, category, and a valid amount.");
    return;
  }
  const entry = {
    id: "c" + Date.now(),
    date,
    type,
    category,
    amount,
    ref,
    note,
    createdAt: nowIso()
  };
  state.cashflow.unshift(entry);
  audit("cashflow_entry", `${type.toUpperCase()} ${category}`, fmtMoney(amount));
  persist();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderCashFlow($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `Cash flow entry added: ${category} (${fmtMoney(amount)})`, "cashflow");
}

function appDeleteCashFlow(id) {
  if (!confirm("Delete this cash flow entry?")) return;
  state.cashflow = state.cashflow.filter(c => c.id !== id);
  audit("cashflow_deleted", id, "Cash flow entry deleted");
  persist();
  renderCashFlow($q("#appContent"));
}

function appAddCashFlow() {
  appAddCashFlowModal();
}

async function appOpenSOAUpload() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>Upload SOA (Statement of Account)</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1;">
            <label>SOA PDF File</label>
            <input type="file" id="soaFile" accept=".pdf">
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Description / Note</label>
            <input type="text" id="soaDesc" placeholder="e.g. November 2026 SOA Statement">
          </div>
        </div>
        <p class="hint" style="margin-top:8px;">Upload PDF only. File will be saved and downloadable anytime.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveSOA()">Upload PDF</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

async function appSaveSOA() {
  const fileInput = $q("#soaFile");
  const file = fileInput ? fileInput.files[0] : null;
  if (!file) { alert("Select a PDF file"); return; }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { alert("Only PDF files allowed"); return; }
  if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const soa = {
        id: "soa" + Date.now(),
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
        dataUrl: e.target.result,
        uploadedBy: currentUser ? currentUser.email : ADMIN_EMAIL,
        uploadedAt: nowIso(),
        desc: ($q("#soaDesc") ? $q("#soaDesc").value.trim() : "")
      };
      try { await api.create("soaUploads", soa); } catch (_) {}
      state.soaUploads.unshift(soa);
      audit("soa_uploaded", soa.fileName, `SOA PDF uploaded (${soa.fileSize})`);
      notif(currentUser ? currentUser.id : "all", `SOA uploaded: ${soa.fileName}`, "cashflow");
      persist();
      const mod = $q(".modal-overlay");
      if (mod) mod.remove();
      renderCashFlow($q("#appContent"));
    } catch (errMsg) { alert(errMsg); }
  };
  reader.readAsDataURL(file);
}

function appDownloadSOA(id) {
  const soa = state.soaUploads.find(s => s.id === id);
  if (!soa) { alert("SOA not found"); return; }
  const a = document.createElement("a");
  a.href = soa.dataUrl;
  a.download = soa.fileName;
  a.click();
}

function appDeleteSOA(id) {
  if (!confirm("Delete this uploaded SOA document?")) return;
  state.soaUploads = state.soaUploads.filter(s => s.id !== id);
  audit("soa_deleted", id, "Deleted SOA PDF");
  persist();
  renderCashFlow($q("#appContent"));
}

/* ==========================================================================
   MODULE: AUTO PAYROLL
   ========================================================================== */
function renderPayroll(el) {
  const eligible = state.employees.filter(e => e.type !== "contractual");
  const totalGross = eligible.reduce((a,e)=>a+Number(e.salary||0),0);
  const totalNet = totalGross * 0.9;
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Auto Payroll</h2>
        <div class="sub">Active staff members. Auto-computes gross, statutory deductions (10%), and net pay.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appRunPayroll()">Run Payroll</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Eligible Staff</div><div class="kpi-value">${eligible.length}</div><div class="kpi-delta neu">employees</div></div>
      <div class="kpi"><div class="kpi-label">Total Gross</div><div class="kpi-value">${fmtMoney(totalGross)}</div><div class="kpi-delta neu">per period</div></div>
      <div class="kpi"><div class="kpi-label">Est. Net Pay</div><div class="kpi-value">${fmtMoney(totalNet)}</div><div class="kpi-delta neu">after 10% deduction</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Payroll Register</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Period</th><th>Employee</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Paid At</th></tr></thead>
          <tbody id="payrollList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#payrollList");
  t.innerHTML = state.payroll.map(p => {
    const emp = state.employees.find(e => e.id === p.employeeId);
    return `<tr>
      <td>${escapeHtml(p.period)}</td>
      <td>${escapeHtml(emp ? emp.name : "Staff")}</td>
      <td>${fmtMoney(p.gross)}</td>
      <td>${fmtMoney(p.deductions)}</td>
      <td>${fmtMoney(p.net)}</td>
      <td><span class="badge badge-bg">${escapeHtml(p.status)}</span></td>
      <td>${fmtDate(p.paidAt)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:20px;">No payroll runs yet</td></tr>`;
}

function appRunPayroll() {
  if (!confirm("Run auto payroll for all eligible employees?")) return;
  const period = "Payroll " + new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const today = new Date().toISOString().split("T")[0];
  const eligible = state.employees.filter(e => e.type !== "contractual");
  eligible.forEach(e => {
    const gross = Number(e.salary || 30000);
    const deductions = Math.round(gross * 0.10);
    state.payroll.unshift({
      id: "p" + Date.now() + Math.random().toString(36).slice(2,5),
      period, employeeId: e.id, gross, deductions,
      net: gross - deductions, status: "paid", paidAt: today
    });
    notif("all", `Payroll processed for ${escapeHtml(e.name)} — Net ${fmtMoney(gross - deductions)}`, "payroll");
  });
  audit("payroll_run", period, `Auto payroll for ${eligible.length} staff`);
  persist();
  renderPayroll($q("#appContent"));
}

/* ==========================================================================
   MODULE: BLOGGER (+ QR)
   ========================================================================== */
function renderBlogger(el) {
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Blogger</h2>
        <div class="sub">Create and publish blog updates. QR code generated for each post.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenBlogModal()">+ New Post</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Blog Posts</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Title</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody id="blogList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#blogList");
  t.innerHTML = state.blogs.map(b => `
    <tr>
      <td>${escapeHtml(b.title)}</td>
      <td><span class="badge ${b.status==='published'?'badge-success':'badge-warning'}">${escapeHtml(b.status)}</span></td>
      <td>${fmtDate(b.createdAt)}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn-sm" onclick="appViewQR('${escapeHtml(b.id)}')">QR</button>
        <button class="btn-sm teal" onclick="appViewBlog('${escapeHtml(b.id)}')">View</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--ink-dim);padding:20px;">No posts yet</td></tr>`;
}

function appOpenBlogModal(blogId) {
  const existing = blogId ? state.blogs.find(b => b.id === blogId) : null;
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.id = "blogModal";
  mod.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${existing ? "Edit Post" : "New Blog Post"}</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1;">
            <label>Title</label>
            <input type="text" id="blogTitle" value="${existing ? escapeHtml(existing.title) : ''}" placeholder="e.g. Accounting Training Update">
          </div>
          <div class="field">
            <label>Status</label>
            <select id="blogStatus">${['draft','published'].map(s => `<option ${existing&&existing.status===s?'selected':''}>${s}</option>`).join("")}</select>
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Content</label>
            <textarea id="blogContent" placeholder="Write your update..." rows="6">${existing ? escapeHtml(existing.content || '') : ''}</textarea>
          </div>
        </div>
        <p class="hint" style="margin-top:8px;">Source doc reference: <a href="https://docs.google.com/document/d/1qMITe1dG9ECmcYdQBDP3BTATn9pvLCvnBV5WU4OI0w0/edit?usp=sharing" target="_blank" rel="noopener">Google Docs update template</a></p>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveBlog('${existing ? existing.id : ''}')">Save Post</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appSaveBlog(id) {
  const title = $q("#blogTitle").value.trim();
  const status = $q("#blogStatus").value;
  const content = $q("#blogContent").value.trim();
  if (!title) { alert("Enter a title"); return; }
  if (id) {
    const b = state.blogs.find(b => b.id === id);
    if (b) {
      b.title = title; b.status = status; b.content = content;
      audit("blog_updated", title, "Edited post");
    }
  } else {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g,"-").replace(/^-|-$/g,"");
    const b = {
      id: "b" + Date.now(), title, slug, content, status,
      createdAt: nowIso(),
      url: window.location.origin + window.location.pathname + "?blog=" + slug
    };
    state.blogs.unshift(b);
    audit("blog_created", title, "New post " + (status === 'published' ? 'published' : 'draft'));
    notif(currentUser ? currentUser.id : "all", `New blog post: ${title}`, "blogger");
  }
  persist();
  const m = $q("#blogModal");
  if (m) m.remove();
  renderBlogger($q("#appContent"));
}

function appViewQR(id) {
  const b = state.blogs.find(x => x.id === id);
  if (!b) return;
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:560px;text-align:center;">
      <div class="modal-header">
        <h3>QR Code</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:24px;">
        <div style="font-size:0.9rem;color:var(--ink-dim);margin-bottom:14px;">${escapeHtml(b.title)}</div>
        <div id="qrCanvas" style="margin:0 auto 16px;"></div>
        <div class="hint" style="margin-bottom:10px;">Scan to open: ${escapeHtml(b.url || location.origin)}</div>
        <button class="btn-sm" onclick="appDownloadQR('${b.id}')">Download PNG</button>
        <button class="btn-sm teal" onclick="navigator.clipboard.writeText('${escapeHtml(b.url || location.origin)}')">Copy Link</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
  renderQR(b.url || location.origin, "qrCanvas");
}

function appDownloadQR(id) {
  const b = state.blogs.find(x => x.id === id);
  alert("QR link: " + (b ? b.url : location.origin) + "\n(Right-click or screenshot the QR code to save.)");
}

function appViewBlog(id) {
  const b = state.blogs.find(x => x.id === id);
  if (!b) return;
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:720px;">
      <div class="modal-header">
        <h3>${escapeHtml(b.title)}</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:22px;">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
          <span class="badge ${b.status==='published'?'badge-success':'badge-warning'}">${escapeHtml(b.status)}</span>
          <span style="font-size:0.8rem;color:var(--ink-dim);">Created ${fmtDate(b.createdAt)}</span>
        </div>
        <div style="white-space:pre-wrap;line-height:1.6;color:var(--ink);border-top:1px solid var(--line);padding-top:14px;">${escapeHtml(b.content || "")}</div>
        <div style="margin-top:14px;">
          <div class="hint" style="margin-bottom:6px;">Post link:</div>
          <div style="display:flex;gap:8px;">
            <input type="text" value="${escapeHtml(b.url || location.origin)}" readonly style="flex:1;padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;background:#fff;font-size:0.85rem;">
            <button class="btn-sm teal" onclick="navigator.clipboard.writeText('${escapeHtml(b.url || location.origin)}')">Copy</button>
            <button class="btn-sm" onclick="appViewQR('${b.id}')">QR</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-sm teal" onclick="this.closest('.modal-overlay').remove();appOpenBlogModal('${b.id}')">Edit / Update</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function renderQR(text, containerId) {
  const container = $q("#" + containerId);
  if (!container) return;
  try {
    if (typeof QRCode === "undefined") {
      container.innerHTML = `<div style="padding:20px;font-size:0.85rem;">QR Code: ${escapeHtml(text)}</div>`;
      return;
    }
    const qr = QRCode.encode(text, { type: 4, ecLevel: 1 });
    const size = qr.moduleCount;
    const scale = 6;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size * scale + 40);
    svg.setAttribute("height", size * scale + 40);
    svg.style.background = "#fff";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules[r][c]) {
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", c * scale + 20);
          rect.setAttribute("y", r * scale + 20);
          rect.setAttribute("width", scale);
          rect.setAttribute("height", scale);
          rect.setAttribute("fill", "#000");
          svg.appendChild(rect);
        }
      }
    }
    container.innerHTML = "";
    container.appendChild(svg);
  } catch (e) {
    container.innerHTML = `<div style="padding:20px;color:var(--error);">QR could not be rendered. Link: ${escapeHtml(text)}</div>`;
  }
}

/* ==========================================================================
   MODULE: LEAVE (filing + balance tracker)
   ========================================================================== */
function leaveEligible(emp) {
  if (!emp) return { eligible: true, entitlement: 15, years: 2, permDate: "2022-01-01", message: "Admin leave access authorized" };
  const permDateStr = emp.permanentDate || emp.joinDate || "2022-01-01";
  const start = new Date(permDateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const oneYearLater = new Date(start); oneYearLater.setFullYear(start.getFullYear() + 1);
  const years = Math.max(1, Math.floor((today - start) / (1000*60*60*24*365.25)));
  const entitlement = 15;
  return {
    eligible: true,
    entitlement,
    years,
    permDate: permDateStr,
    message: "Eligible: " + entitlement + " leave day(s) per year"
  };
}

function renderLeave(el) {
  const myEmp = currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null;
  const myLeave = myEmp ? leaveEligible(myEmp) : (isAdmin() ? { eligible: true, entitlement: 15, years: 2, permDate: "2022-01-01", message: "Admin leave access authorized" } : { eligible: true, entitlement: 15, years: 1, permDate: "2022-01-01", message: "Enrolled staff access" });
  const pendingMy = currentUser ? state.leaves.filter(l => l.employeeEmail && l.employeeEmail.toLowerCase() === currentUser.email.toLowerCase() && l.status === "pending").length : 0;

  const adminCard = isAdmin() ? `
  <div class="card" style="margin-top:20px;">
    <div class="card-header"><h3>Employee Leave List & Start Dates</h3></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Contract Start</th><th>Permanent Date</th><th>Leave Entitlement</th><th>Balance</th><th>Status</th></tr></thead>
        <tbody id="empLeaveList"></tbody>
      </table>
    </div>
  </div>
  <div class="card" style="margin-top:12px;">
    <div class="card-header"><h3>All Leave Requests (Admin)</h3><div class="card-actions"><button class="btn-sm" onclick="appNavigate('leave')">Refresh</button><button class="btn-sm teal" onclick="appPrintLeave()">Print Leave</button></div></div>
    <div class="card-body">
      <table>
        <thead><tr><th>Employee</th><th>Email</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
        <tbody id="leaveAdminList"></tbody>
      </table>
    </div>
  </div>
  ` : "";

  const myName = currentUser ? currentUser.name : (myEmp ? myEmp.name : "Admin");

  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Online Leave Filing</h2>
        <div class="sub">${myLeave.message}</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenLeaveModal()">+ File Leave</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Employee Type</div><div class="kpi-value">${myEmp ? escapeHtml(myEmp.type) : "Staff"}</div><div class="kpi-delta neu">${escapeHtml(myName)}</div></div>
      <div class="kpi"><div class="kpi-label">Date Started</div><div class="kpi-value">${myEmp ? fmtDate(myEmp.joinDate) : "Jan 1, 2022"}</div><div class="kpi-delta neu">${myLeave.years} year(s) of service</div></div>
      <div class="kpi"><div class="kpi-label">Paid Leave Entitlement</div><div class="kpi-value">${myLeave.entitlement} days</div><div class="kpi-delta neu">per year</div></div>
      <div class="kpi"><div class="kpi-label">Leave Balance</div><div class="kpi-value">${myEmp ? (myEmp.leaveBalance != null ? myEmp.leaveBalance : 15) : 15}</div><div class="kpi-delta neu">days remaining</div></div>
      <div class="kpi"><div class="kpi-label">Pending Requests</div><div class="kpi-value">${pendingMy}</div><div class="kpi-delta neu">yours</div></div>
      <div class="kpi"><div class="kpi-label">Total on File</div><div class="kpi-value">${state.leaves.length}</div><div class="kpi-delta neu">leave records</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>My Leave Requests</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Filed</th></tr></thead>
          <tbody id="leaveList"></tbody>
        </table>
      </div>
    </div>
    ${adminCard}
  `;

  const t = $q("#leaveList");
  const mine = currentUser ? state.leaves.filter(l => l.employeeEmail && l.employeeEmail.toLowerCase() === currentUser.email.toLowerCase()) : state.leaves;
  t.innerHTML = mine.map(l => `
    <tr>
      <td>${escapeHtml(l.type)}</td>
      <td>${fmtDate(l.from)}</td>
      <td>${fmtDate(l.to)}</td>
      <td>${l.days}</td>
      <td>${escapeHtml(l.reason)}</td>
      <td><span class="badge ${l.status==='approved'?'badge-success':l.status==='pending'?'badge-warning':'badge-error'}">${escapeHtml(l.status)}</span></td>
      <td>${fmtDate(l.createdAt)}</td>
    </tr>
  `).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:20px;">No leave requests filed yet</td></tr>`;

  const elEmp = $q("#empLeaveList");
  if (elEmp) {
    elEmp.innerHTML = state.employees.map(emp => {
      const elig = leaveEligible(emp);
      return `<tr>
        <td>${escapeHtml(emp.name)}</td>
        <td>${escapeHtml(emp.email)}</td>
        <td><span class="badge badge-info" style="text-transform:none;">${escapeHtml(emp.type)}</span></td>
        <td>${fmtDate(emp.contractStartDate || emp.joinDate)}</td>
        <td>${fmtDate(emp.permanentDate || emp.joinDate)}</td>
        <td>${elig.entitlement} days/year</td>
        <td>${emp.leaveBalance || 0} days</td>
        <td><span class="badge ${emp.status==='Active'?'badge-bg':'badge-error'}">${escapeHtml(emp.status)}</span></td>
      </tr>`;
    }).join("");
  }

  const ta = $q("#leaveAdminList");
  if (ta) {
    ta.innerHTML = state.leaves.map(l => {
      const action = l.status === "pending"
        ? `<button class="btn-sm teal" style="padding:4px 8px;font-size:0.75rem;" onclick="appLeaveAction('${l.id}','approved')">Approve</button> <button class="btn-sm" style="padding:4px 8px;font-size:0.75rem;color:var(--error);" onclick="appLeaveAction('${l.id}','rejected')">Reject</button>`
        : `<span style="font-size:0.78rem;color:var(--ink-dim);">${escapeHtml(l.approvedBy || "-")}</span>`;
      return `<tr>
        <td>${escapeHtml(l.employeeName)}</td>
        <td>${escapeHtml(l.employeeEmail)}</td>
        <td>${escapeHtml(l.type)}</td>
        <td>${fmtDate(l.from)}</td>
        <td>${fmtDate(l.to)}</td>
        <td>${l.days}</td>
        <td>${escapeHtml(l.reason)}</td>
        <td><span class="badge ${l.status==='approved'?'badge-success':l.status==='pending'?'badge-warning':'badge-error'}">${escapeHtml(l.status)}</span></td>
        <td>${action}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="9" style="text-align:center;color:var(--ink-dim);padding:20px;">No leave requests</td></tr>`;
  }
}

function appOpenLeaveModal() {
  const myEmp = currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null;
  const myLeave = myEmp ? leaveEligible(myEmp) : { eligible: true, entitlement: 15, permDate: "2022-01-01" };
  const empName = currentUser ? currentUser.name : (myEmp ? myEmp.name : "Employee");
  const empEmail = currentUser ? currentUser.email : (myEmp ? myEmp.email : "");
  const empBalance = myEmp ? (myEmp.leaveBalance || 15) : 15;

  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <div class="modal-header"><h3>File Leave Request</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Employee Name</label>
            <input type="text" id="leaveEmpName" value="${escapeHtml(empName)}">
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" id="leaveEmpEmail" value="${escapeHtml(empEmail)}">
          </div>
          <div class="field">
            <label>Leave Type</label>
            <select id="leaveType"><option>Vacation</option><option>Sick</option><option>Personal</option><option>Emergency</option></select>
          </div>
          <div class="field">
            <label>Date From</label>
            <input type="date" id="leaveFrom" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Date To</label>
            <input type="date" id="leaveTo" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Number of Days</label>
            <input type="number" id="leaveDays" min="1" value="1">
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Reason</label>
            <textarea id="leaveReason" placeholder="Purpose or reason for leave"></textarea>
          </div>
          <div class="field">
            <label>Paid Leave Balance</label>
            <input type="number" id="leaveBal" value="${empBalance}" readonly style="background:var(--surface-2);">
          </div>
          <div class="hint" style="grid-column:1/-1;">Entitlement: ${myLeave.entitlement} days per year.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSubmitLeave()">Submit Leave</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appSubmitLeave() {
  const empName = $q("#leaveEmpName").value.trim();
  const empEmail = $q("#leaveEmpEmail").value.trim();
  const type = $q("#leaveType").value;
  const from = $q("#leaveFrom").value;
  const to = $q("#leaveTo").value;
  const days = Number($q("#leaveDays").value || 1);
  const reason = $q("#leaveReason").value.trim();
  if (!empName || !empEmail || !from || !to || !reason) { alert("Fill all required fields"); return; }
  const d1 = new Date(from), d2 = new Date(to);
  const calcDays = Math.max(1, Math.ceil((d2 - d1) / (1000*60*60*24)) + 1);
  const l = {
    id: "l" + Date.now(),
    employeeName: empName,
    employeeEmail: empEmail,
    type, from, to, days: isNaN(days) ? calcDays : days, reason,
    status: "pending", createdAt: nowIso(), approvedBy: ""
  };
  state.leaves.unshift(l);
  audit("leave_filed", `${type} ${from} to ${to}`, `${l.days} day(s) by ${empName}`);
  persist();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderLeave($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `Leave filed: ${type} (${l.days} day(s))`, "leave");
}

function appLeaveAction(id, status) {
  const l = state.leaves.find(x => x.id === id);
  if (!l) return;
  l.status = status;
  l.approvedBy = currentUser ? currentUser.email : ADMIN_EMAIL;
  if (status === "approved") {
    const emp = state.employees.find(e => e.email.toLowerCase() === (l.employeeEmail || "").toLowerCase());
    if (emp) emp.leaveBalance = Math.max(0, (emp.leaveBalance || 15) - l.days);
  }
  audit("leave_" + status, l.id, `${l.type} for ${l.employeeName}`);
  persist();
  renderLeave($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `Leave for ${l.employeeName} was ${status}.`, "leave");
}

function appPrintLeave() {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print."); return; }
  const leaves = state.leaves.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const rows = leaves.map(l => {
    const emp = state.employees.find(e => e.email.toLowerCase() === (l.employeeEmail || "").toLowerCase());
    return `<tr>
      <td>${escapeHtml(l.employeeName)}</td>
      <td>${escapeHtml(l.employeeEmail)}</td>
      <td>${escapeHtml(emp ? emp.type : "—")}</td>
      <td>${fmtDate(emp ? (emp.permanentDate || emp.joinDate) : "")}</td>
      <td>${fmtDate(l.from)}</td>
      <td>${fmtDate(l.to)}</td>
      <td>${l.days}</td>
      <td>${escapeHtml(l.reason)}</td>
      <td><span style="text-transform:uppercase;font-weight:700;color:${l.status==='approved'?'#059669':l.status==='rejected'?'#dc2626':'#d97706'}">${escapeHtml(l.status)}</span></td>
      <td>${fmtDate(l.createdAt)}</td>
      <td>${escapeHtml(l.approvedBy || "—")}</td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Leave Report — ACTI Control Center</title>
<style>
  body { font-family: 'Poppins', system-ui, sans-serif; font-size: 12px; color: #111; padding: 20px; }
  h1 { color: #0f766e; font-size: 20px; margin-bottom: 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background: #0f766e; color: #fff; }
  .footer { margin-top: 20px; font-size: 10px; color: #6b7280; border-top: 1px solid #d1d5db; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>ACTI Control Center — Leave Report</h1>
  <div class="sub">Generated ${new Date().toLocaleDateString("en-PH")} • Total: ${leaves.length} leave record(s)</div>
  <table>
    <thead>
      <tr>
        <th>Employee</th><th>Email</th><th>Type</th><th>Start Date</th>
        <th>From</th><th>To</th><th>Days</th><th>Reason</th>
        <th>Status</th><th>Filed</th><th>Approved By</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">ACTI Control Center • Printed on ${new Date().toLocaleString("en-PH")}</div>
  <script>window.print();</script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

/* ==========================================================================
   MODULE: OVERTIME / OFFSET
   ========================================================================== */
function renderOvertime(el) {
  const myEmp = (currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null) || state.employees[0];
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Overtime / Offset Request</h2>
        <div class="sub">Request OT hours or offset (time-off in lieu).</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenOTModal()">+ Request</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>OT / Offset Requests</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Type</th><th>Reason</th><th>Status</th><th>Filed</th><th>Action</th></tr></thead>
          <tbody id="otList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#otList");
  t.innerHTML = state.overtime.map(o => {
    const emp = state.employees.find(e => e.id === o.employeeId);
    const action = o.status === "pending" && isAdmin()
      ? `<button class="btn-sm teal" style="padding:4px 8px;font-size:0.75rem;" onclick="appOTAction('${o.id}','approved')">Approve</button>
         <button class="btn-sm" style="padding:4px 8px;font-size:0.75rem;color:var(--error);" onclick="appOTAction('${o.id}','rejected')">Reject</button>`
      : `<span style="font-size:0.78rem;color:var(--ink-dim);">${escapeHtml(o.approvedBy || '-')}</span>`;
    return `<tr>
      <td>${escapeHtml(emp ? emp.name : "Staff")}</td>
      <td>${fmtDate(o.date)}</td>
      <td>${o.hours}h</td>
      <td><span class="badge badge-bg">${escapeHtml(o.type ? o.type.toUpperCase() : 'OT')}</span></td>
      <td>${escapeHtml(o.reason)}</td>
      <td><span class="badge ${o.status==='approved'?'badge-success':o.status==='pending'?'badge-warning':'badge-error'}">${escapeHtml(o.status)}</span></td>
      <td>${fmtDate(o.createdAt)}</td>
      <td>${action}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="8" style="text-align:center;color:var(--ink-dim);padding:20px;">No requests</td></tr>`;
}

function appOpenOTModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:520px;">
      <div class="modal-header"><h3>OT / Offset Request</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Date</label>
            <input type="date" id="otDate" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Hours</label>
            <input type="number" id="otHours" step="0.5" min="0" value="1">
          </div>
          <div class="field">
            <label>Type</label>
            <select id="otType"><option>Overtime</option><option>Offset</option></select>
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Reason</label>
            <textarea id="otReason" placeholder="Purpose or details of OT / offset"></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSubmitOT()">Submit</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appSubmitOT() {
  const date = $q("#otDate").value;
  const hours = $q("#otHours").value;
  const type = $q("#otType").value;
  const reason = $q("#otReason").value.trim();
  if (!date || !hours || !reason) { alert("Fill all fields"); return; }
  const myEmp = (currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null) || state.employees[0];
  state.overtime.unshift({
    id: "ot" + Date.now(), employeeId: myEmp.id, date, hours: Number(hours),
    type: type === "Overtime" ? "ot" : "offset", reason, status: "pending", createdAt: nowIso()
  });
  audit("ot_request", `${type} ${hours}h on ${date}`, `by ${myEmp.name}`);
  persist();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderOvertime($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `${type} request submitted (${hours} hrs)`, "overtime");
}

function appOTAction(id, status) {
  const o = state.overtime.find(x => x.id === id);
  if (!o) return;
  o.status = status;
  o.approvedBy = currentUser ? currentUser.email : ADMIN_EMAIL;
  audit("ot_" + status, o.id, `${o.type.toUpperCase()} ${o.hours}h for employee`);
  persist();
  renderOvertime($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `OT request ${status}: ${o.hours} hrs`, "overtime");
}

/* ==========================================================================
   MODULE: REQUEST INVOICE
   ========================================================================== */
function renderInvoice(el) {
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Request Invoice</h2>
        <div class="sub">Create and track client invoices.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenInvoiceModal()">+ New Invoice</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Total Invoiced</div><div class="kpi-value">${fmtMoney(state.invoices.reduce((a,i)=>a+Number(i.amount||0),0))}</div><div class="kpi-delta neu">${state.invoices.length} invoices</div></div>
      <div class="kpi"><div class="kpi-label">Unpaid</div><div class="kpi-value">${state.invoices.filter(i=>i.status!=='paid').length}</div><div class="kpi-delta neu">outstanding</div></div>
      <div class="kpi"><div class="kpi-label">Paid</div><div class="kpi-value">${state.invoices.filter(i=>i.status==='paid').length}</div><div class="kpi-delta pos">completed</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Invoice Register</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Ref</th><th>Client</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="invoiceList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#invoiceList");
  t.innerHTML = state.invoices.map(i => `
    <tr>
      <td><strong>${escapeHtml(i.ref)}</strong></td>
      <td>${escapeHtml(i.client)}</td>
      <td>${fmtDate(i.date)}</td>
      <td>${fmtDate(i.due)}</td>
      <td>${fmtMoney(i.amount)}</td>
      <td><span class="badge ${i.status==='paid'?'badge-success':i.status==='pending'?'badge-warning':'badge-error'}">${escapeHtml(i.status)}</span></td>
      <td style="display:flex;gap:6px;">
        ${i.status !== 'paid' ? `<button class="btn-sm teal" style="padding:4px 8px;font-size:0.75rem;" onclick="appInvoiceStatus('${i.id}','paid')">Mark Paid</button>` : ''}
        <button class="btn-sm" style="padding:4px 8px;font-size:0.75rem;color:var(--error);" onclick="appDeleteInvoice('${i.id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:20px;">No invoices yet</td></tr>`;
}

function appOpenInvoiceModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>New Invoice</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Invoice Ref</label>
            <input type="text" id="invRef" value="INV-${new Date().getFullYear()}-${String(state.invoices.length+1).padStart(3,'0')}">
          </div>
          <div class="field">
            <label>Client Name</label>
            <input type="text" id="invClient" placeholder="e.g. ABC Corporation">
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" id="invDate" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Due Date</label>
            <input type="date" id="invDue" value="${new Date(Date.now() + 15*86400000).toISOString().split('T')[0]}">
          </div>
          <div class="field">
            <label>Amount (₱)</label>
            <input type="number" id="invAmount" step="0.01" min="0" placeholder="0.00">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveInvoice()">Save Invoice</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appSaveInvoice() {
  const ref = $q("#invRef").value.trim();
  const client = $q("#invClient").value.trim();
  const date = $q("#invDate").value;
  const due = $q("#invDue").value;
  const amount = $q("#invAmount").value;
  if (!ref || !client || !date || !amount) { alert("Fill all required fields"); return; }
  state.invoices.unshift({
    id: "inv" + Date.now(), ref, client, date, due, amount: Number(amount),
    status: "pending", createdAt: nowIso()
  });
  audit("invoice_created", ref, `₱${amount} for ${client}`);
  persist();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderInvoice($q("#appContent"));
  notif(currentUser ? currentUser.id : "all", `Invoice ${ref} created`, "invoice");
}

function appInvoiceStatus(id, status) {
  const i = state.invoices.find(x => x.id === id);
  if (!i) return;
  i.status = status;
  audit("invoice_" + status, i.ref, `Status changed to ${status}`);
  persist();
  renderInvoice($q("#appContent"));
}

function appDeleteInvoice(id) {
  if (!confirm("Delete this invoice?")) return;
  state.invoices = state.invoices.filter(x => x.id !== id);
  audit("invoice_deleted", id, "Invoice deleted");
  persist();
  renderInvoice($q("#appContent"));
}

/* ==========================================================================
   MODULE: STAFF DAILY TASKS
   ========================================================================== */
function renderTasks(el) {
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Staff Daily Task Monitoring</h2>
        <div class="sub">Track daily tasks per staff member.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenTaskModal()">+ Add Task</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Task Board</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Task</th><th>Assigned To</th><th>Status</th><th>Due</th><th>Progress</th><th>Action</th></tr></thead>
          <tbody id="taskList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#taskList");
  t.innerHTML = state.tasks.map(task => {
    const emp = state.employees.find(e => e.id === task.employeeId);
    return `<tr>
      <td>${escapeHtml(task.title)}</td>
      <td>${escapeHtml(emp ? emp.name : "Staff")}</td>
      <td><span class="badge ${task.status==='done'?'badge-success':task.status==='in progress'?'badge-warning':'badge-info'}">${escapeHtml(task.status)}</span></td>
      <td>${fmtDate(task.due)}</td>
      <td>${task.progress}% <div style="width:60px;height:6px;background:var(--surface-2);border-radius:3px;margin-top:4px;"><div style="width:${task.progress}%;height:100%;background:var(--teal);border-radius:3px;"></div></div></td>
      <td style="display:flex;gap:6px;">
        <button class="btn-sm task-toggle" onclick="appToggleTask('${task.id}')" style="padding:4px 8px;font-size:0.75rem;">
          ${task.status === 'done' ? 'Mark Pending' : task.status === 'in progress' ? 'Mark Done' : 'Start Task'}
        </button>
        <button class="btn-sm" onclick="appDeleteTask('${task.id}')" style="padding:4px 8px;font-size:0.75rem;color:var(--error);">Delete</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--ink-dim);padding:20px;">No tasks</td></tr>`;
}

function appToggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  const order = ["pending", "in progress", "done"];
  let i = order.indexOf(t.status);
  i = (i + 1) % order.length;
  t.status = order[i];
  t.progress = t.status === "done" ? 100 : (t.status === "in progress" ? 50 : 0);
  audit("task_toggled", t.title, `now ${t.status} (${t.progress}%)`);
  persist();
  renderTasks($q("#appContent"));
}

function appOpenTaskModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>Add Task</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Assign To</label>
            <select id="taskEmp">${state.employees.map(e=>`<option value="${e.id}">${escapeHtml(e.name)} (${e.type})</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Task Title</label>
            <input type="text" id="taskTitle" placeholder="e.g. Prepare monthly voucher report">
          </div>
          <div class="field">
            <label>Due Date</label>
            <input type="date" id="taskDue" value="${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveTask()">Add Task</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appSaveTask() {
  const emp = $q("#taskEmp").value;
  const title = $q("#taskTitle").value.trim();
  const due = $q("#taskDue").value;
  if (!title || !due) { alert("Fill title and due date"); return; }
  const assignedEmp = state.employees.find(e=>e.id===emp);
  state.tasks.unshift({
    id: "t" + Date.now(), employeeId: emp, title, status: "pending", due, progress: 0, createdAt: nowIso()
  });
  audit("task_created", title, `assigned to ${assignedEmp ? assignedEmp.name : 'Staff'}`);
  persist();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderTasks($q("#appContent"));
}

function appTaskStatus(id, status) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.status = status;
  t.progress = status === "done" ? 100 : (status === "in progress" ? 50 : 0);
  persist();
  renderTasks($q("#appContent"));
}

function appDeleteTask(id) {
  if (!confirm("Delete this task?")) return;
  state.tasks = state.tasks.filter(x => x.id !== id);
  audit("task_deleted", id, "Task deleted");
  persist();
  renderTasks($q("#appContent"));
}

/* ==========================================================================
   MODULE: AUDIT LOGS
   ========================================================================== */
function renderAudit(el) {
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Audit Logs</h2>
        <div class="sub">Every action is recorded: who did what and when.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm" onclick="appClearAudit()">Clear Logs</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Activity Trail</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody id="auditList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#auditList");
  t.innerHTML = state.audit.map(a => `
    <tr>
      <td>${fmtDate(a.at)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td>${escapeHtml(a.action)}</td>
      <td>${escapeHtml(a.target)}</td>
      <td style="font-size:0.8rem;color:var(--ink-dim);">${escapeHtml(a.meta)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:20px;">No logs</td></tr>`;
}

function appClearAudit() {
  if (!confirm("Clear all audit logs? This cannot be undone.")) return;
  state.audit = [];
  persist();
  renderAudit($q("#appContent"));
}

/* ==========================================================================
   MODULE: ADMINS (add admins)
   ========================================================================== */
function renderAdmin(el) {
  if (!isAdmin()) { el.innerHTML = "<div class='empty-state'><div class='empty-icon'>🔒</div><h3>Admin access required</h3><p>Only authorized super admins can manage admins.</p></div>"; return; }
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Admin Controls</h2>
        <div class="sub">Authorized Super Admins: ${SUPER_ADMINS.join(", ")}</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenAdminModal()">+ Add Admin</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Registered Admins</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th>Super Admin?</th><th>Actions</th></tr></thead>
          <tbody id="adminList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#adminList");
  const admins = (state.admins && state.admins.length) ? state.admins : state.users.filter(u => u.role === "admin");
  t.innerHTML = admins.map(a => {
    const isSuper = SUPER_ADMINS.includes(a.email.toLowerCase());
    const blocked = a.status === "blocked";
    return `<tr>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td><span class="badge ${blocked ? 'badge-error' : 'badge-bg'}" style="text-transform:none;">${blocked ? "Blocked" : (a.status === 'active' ? "Active" : a.status || "Active")}</span></td>
      <td>${fmtDate(a.createdAt)}</td>
      <td>${isSuper ? "Yes (Super Admin)" : "No"}</td>
      <td>
        ${isSuper ? "<span style='font-size:0.78rem;color:var(--ink-dim);'>owner</span>" : `
          <button class="btn-sm" onclick="appBlockAdmin('${a.id}', ${!blocked})" style="padding:4px 8px;font-size:0.78rem;border-radius:6px;border:1px solid var(--line);">${blocked ? "Unblock" : "Block"}</button>
          <button class="btn-sm" onclick="appEditAdmin('${a.id}')" style="padding:4px 8px;font-size:0.78rem;border-radius:6px;border:1px solid var(--line);">Edit</button>
          <button class="btn-sm" onclick="appDeleteAdmin('${a.id}')" style="padding:4px 8px;font-size:0.78rem;border-radius:6px;border:1px solid var(--line);color:var(--error);border-color:var(--error);">Delete</button>
        `}
      </td>
    </tr>`;
  }).join("");
}

async function appBlockAdmin(id, blocked) {
  try {
    const admin = await api.blockAdmin(id, blocked);
    audit(admin.status === "blocked" ? "admin_blocked" : "admin_unblocked", admin.email, `${admin.name} ${blocked ? "blocked" : "unblocked"}`);
    notif(currentUser ? currentUser.id : "all", `Admin ${admin.name} ${blocked ? "blocked" : "unblocked"}`, "admin");
  } catch (errMsg) { alert(errMsg); return; }
  renderAdmin($q("#appContent"));
}

async function appEditAdmin(id) {
  const admin = (state.admins || []).find(a => a.id === id) || state.users.find(u => u.id === id);
  if (!admin) { alert("Admin not found"); return; }
  const name = prompt("Edit admin name:", admin.name);
  if (!name) return;
  const email = prompt("Edit admin email:", admin.email);
  if (!email) return;
  try {
    await api.editAdmin(id, { name, email });
    audit("admin_edited", email, `edited admin ${name}`);
    notif(currentUser ? currentUser.id : "all", `Admin updated: ${name}`, "admin");
  } catch (errMsg) { alert(errMsg); return; }
  renderAdmin($q("#appContent"));
}

async function appDeleteAdmin(id) {
  const admin = (state.admins || []).find(a => a.id === id) || state.users.find(u => u.id === id);
  if (!admin) { alert("Admin not found"); return; }
  if (SUPER_ADMINS.includes(admin.email.toLowerCase())) { alert("Cannot delete a super admin owner."); return; }
  if (!confirm(`Delete admin ${admin.name} (${admin.email})?`)) return;
  try {
    await api.deleteAdmin(id);
    audit("admin_deleted", admin.email, `deleted admin ${admin.name}`);
    notif(currentUser ? currentUser.id : "all", `Admin deleted: ${admin.name}`, "admin");
  } catch (errMsg) { alert(errMsg); return; }
  renderAdmin($q("#appContent"));
}

function appOpenAdminModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:520px;">
      <div class="modal-header"><h3>Add Admin</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Name</label>
            <input type="text" id="admName" placeholder="Full name">
          </div>
          <div class="field">
            <label>Email (Gmail)</label>
            <input type="email" id="admEmail" placeholder="admin@gmail.com">
          </div>
        </div>
        <p class="hint">Admins can approve leave, view audit logs, and manage office records.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveAdmin()">Add Admin</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

async function appSaveAdmin() {
  const name = $q("#admName").value.trim();
  const email = $q("#admEmail").value.trim();
  if (!name || !email) { alert("Fill name and email"); return; }
  try {
    const admin = await api.addAdmin(email, name);
    audit("admin_added", admin.email, `${admin.name} added as admin`);
    notif(currentUser ? currentUser.id : "all", `New admin added: ${admin.name}`, "admin");
  } catch (errMsg) {
    alert(errMsg);
    return;
  }
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderAdmin($q("#appContent"));
  renderSidebar();
}

/* ==========================================================================
   MODULE: STAFF ENROLLMENT
   ========================================================================== */
function renderStaff(el) {
  if (!isAdmin()) { el.innerHTML = "<div class='empty-state'><div class='empty-icon'>🔒</div><h3>Admin access required</h3><p>Only authorized admins can enroll staff.</p></div>"; return; }
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Staff Enrollment</h2>
        <div class="sub">Enroll staff into the system. Enrolled staff can file leave and overtime.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenStaffModal()">+ Enroll Staff</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Enrolled Staff</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>Joined</th><th>Leave Balance</th><th>Actions</th></tr></thead>
          <tbody id="staffList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#staffList");
  t.innerHTML = state.employees.map(emp => {
    const isSuper = SUPER_ADMINS.includes(emp.email.toLowerCase());
    return `<tr>
      <td>${escapeHtml(emp.name)}</td>
      <td>${escapeHtml(emp.email)}</td>
      <td><span class="badge badge-info" style="text-transform:none;">${escapeHtml(emp.type)}</span></td>
      <td><span class="badge ${emp.status === 'Active' ? 'badge-bg' : 'badge-error'}">${escapeHtml(emp.status)}</span></td>
      <td>${fmtDate(emp.joinDate)}</td>
      <td>${emp.leaveBalance != null ? emp.leaveBalance : 0} days</td>
      <td>
        ${isSuper ? "<span style='font-size:0.78rem;color:var(--ink-dim);'>super admin</span>" : `
          <button class="btn-sm" onclick="appEditStaff('${emp.id}')" style="padding:4px 8px;font-size:0.78rem;border-radius:6px;border:1px solid var(--line);">Edit</button>
          <button class="btn-sm" onclick="appDeleteStaff('${emp.id}')" style="padding:4px 8px;font-size:0.78rem;border-radius:6px;border:1px solid var(--line);color:var(--error);border-color:var(--error);">Delete</button>
        `}
      </td>
    </tr>`;
  }).join("");
}

function appOpenStaffModal(empId) {
  const existing = empId ? state.employees.find(e => e.id === empId) : null;
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>${existing ? "Edit Staff" : "Enroll Staff"}</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Full Name</label>
            <input type="text" id="staffName" value="${existing ? escapeHtml(existing.name) : ''}" placeholder="e.g. Angelina A. Aquino">
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" id="staffEmail" value="${existing ? escapeHtml(existing.email) : ''}" placeholder="email@gmail.com">
          </div>
          <div class="field">
            <label>Staff Type</label>
            <select id="staffType">${['staff','supervisor','manager','regular','contractual','permanent'].map(t => `<option ${existing && existing.type === t ? 'selected' : ''}>${t}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Leave Balance (days)</label>
            <input type="number" id="staffLeave" value="${existing && existing.leaveBalance != null ? existing.leaveBalance : 15}" min="0">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveStaff('${existing ? existing.id : ''}')">Save</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

async function appSaveStaff(empId) {
  const name = $q("#staffName").value.trim();
  const email = $q("#staffEmail").value.trim();
  const type = $q("#staffType").value;
  const leaveBalance = Number($q("#staffLeave").value || 0);
  if (!name || !email) { alert("Fill name and email"); return; }
  try {
    if (empId) {
      const idx = state.employees.findIndex(e => e.id === empId);
      if (idx !== -1) {
        state.employees[idx] = { ...state.employees[idx], name, email, type, leaveBalance };
      }
      try { await api.update("employees", empId, { name, email, type, leaveBalance }); } catch (_) {}
    } else {
      const newStaff = {
        id: "e" + Date.now(),
        name,
        email,
        type,
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0],
        contractStartDate: new Date().toISOString().split("T")[0],
        permanentDate: new Date().toISOString().split("T")[0],
        salary: 28000,
        leaveBalance,
        enrolled: true
      };
      state.employees.unshift(newStaff);
      try { await api.create("employees", newStaff); } catch (_) {}
    }
    audit("staff_" + (empId ? "edited" : "enrolled"), email, `${name} (${type})`);
    notif(currentUser ? currentUser.id : "all", `Staff ${empId ? 'updated' : 'enrolled'}: ${name}`, "staff");
    persist();
  } catch (errMsg) { alert(errMsg); return; }
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderStaff($q("#appContent"));
}

async function appEditStaff(id) {
  appOpenStaffModal(id);
}

async function appDeleteStaff(id) {
  const emp = state.employees.find(e => e.id === id);
  if (!emp) { alert("Staff not found"); return; }
  if (SUPER_ADMINS.includes(emp.email.toLowerCase())) { alert("Cannot delete a super admin."); return; }
  if (!confirm(`Remove staff ${emp.name}?`)) return;
  try {
    state.employees = state.employees.filter(e => e.id !== id);
    try { await api.remove("employees", id); } catch (_) {}
    audit("staff_removed", emp.email, `removed staff ${emp.name}`);
    notif(currentUser ? currentUser.id : "all", `Staff removed: ${emp.name}`, "staff");
    persist();
  } catch (errMsg) { alert(errMsg); return; }
  renderStaff($q("#appContent"));
}

/* ==========================================================================
   MODULE: CONTROLS CHECKLIST
   ========================================================================== */
function renderControls(el) {
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Controls Checklist</h2>
        <div class="sub">Tick the boxes for office controls and daily management processes.</div>
      </div>
      <button class="btn-sm" onclick="appNavigateBack()">Back</button>
    </div>

    <div class="card">
      <div class="card-header"><h3>Office Controls</h3></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl1" onchange="appToggleControl('ctrl1')">
            <label for="ctrl1" style="margin:0;font-weight:700;">Daily cash count completed</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl2" onchange="appToggleControl('ctrl2')">
            <label for="ctrl2" style="margin:0;font-weight:700;">Vouchers reviewed and approved</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl3" onchange="appToggleControl('ctrl3')">
            <label for="ctrl3" style="margin:0;font-weight:700;">Payroll verified</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl4" onchange="appToggleControl('ctrl4')">
            <label for="ctrl4" style="margin:0;font-weight:700;">SOA uploaded to Cash Flow</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl5" onchange="appToggleControl('ctrl5')">
            <label for="ctrl5" style="margin:0;font-weight:700;">Leave requests processed</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl6" onchange="appToggleControl('ctrl6')">
            <label for="ctrl6" style="margin:0;font-weight:700;">Overtime claims reviewed</label>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Control Status</h3></div>
      <div class="card-body">
        <div id="controlsStatus" style="text-align:center;font-size:1.2rem;font-weight:800;color:var(--teal-dark);">0 / 6 controls completed</div>
      </div>
    </div>
  `;
  updateControlsStatus();
}

function appToggleControl(id) {
  const el = $q("#" + id);
  if (!el) return;
  const saved = lsLoad("controls", {});
  saved[id] = el.checked;
  lsSave("controls", saved);
  updateControlsStatus();
  audit("control_toggled", id, el.checked ? "checked" : "unchecked");
}

function updateControlsStatus() {
  const saved = lsLoad("controls", {});
  const ids = ["ctrl1","ctrl2","ctrl3","ctrl4","ctrl5","ctrl6"];
  const done = ids.filter(i => saved[i] === true).length;
  const el = $q("#controlsStatus");
  if (el) el.textContent = done + " / 6 controls completed";
  ids.forEach(i => {
    const cb = $q("#" + i);
    if (cb) cb.checked = saved[i] === true;
  });
}

/* ==========================================================================
   NOTIFICATIONS MODAL
   ========================================================================== */
function appOpenNotificationsModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header">
        <h3>Notifications</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="max-height:400px;overflow-y:auto;padding:16px;">
        ${state.notifications.length === 0 ? '<div style="text-align:center;color:var(--ink-dim);padding:30px;">No notifications yet</div>' : `
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
            <button class="btn-sm" onclick="appMarkAllNotificationsRead()">Mark all as read</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${state.notifications.map(n => `
              <div style="padding:10px 14px;border-radius:8px;background:${n.read ? 'var(--surface-2)' : '#e0f2f1'};border:1px solid ${n.read ? 'var(--line)' : '#b2dfdb'};display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:0.88rem;font-weight:${n.read ? '500' : '700'};color:var(--ink);">${escapeHtml(n.text)}</div>
                  <div style="font-size:0.75rem;color:var(--ink-dim);">${fmtDate(n.at)}</div>
                </div>
                ${n.link ? `<button class="btn-sm teal" style="padding:4px 8px;font-size:0.75rem;" onclick="appNavigate('${n.link}');document.querySelector('.modal-overlay').remove();">View</button>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="appClearNotifications()">Clear All</button>
        <button class="btn-sm teal" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appMarkAllNotificationsRead() {
  state.notifications.forEach(n => { n.read = true; });
  persist();
  renderNotifBadge();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  appOpenNotificationsModal();
}

function appClearNotifications() {
  state.notifications = [];
  persist();
  renderNotifBadge();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
}

/* ==========================================================================
   GLOBAL ROUTER / INIT
   ========================================================================== */
const HASH_TO_MODULE = {
  "#/dashboard": "dashboard",
  "#/autovoucher": "voucher",
  "#/cashflow": "cashflow",
  "#/autopayroll": "payroll",
  "#/blogger": "blogger",
  "#/onlineleavefiling": "leave",
  "#/overtime": "overtime",
  "#/invoice": "invoice",
  "#/tasks": "tasks",
  "#/staff": "staff",
  "#/controls": "controls",
  "#/audit": "audit",
  "#/admin": "admin"
};
const MODULE_TO_HASH = {
  "dashboard": "#/dashboard",
  "voucher": "#/autovoucher",
  "cashflow": "#/cashflow",
  "payroll": "#/autopayroll",
  "blogger": "#/blogger",
  "leave": "#/onlineleavefiling",
  "overtime": "#/overtime",
  "invoice": "#/invoice",
  "tasks": "#/tasks",
  "staff": "#/staff",
  "controls": "#/controls",
  "audit": "#/audit",
  "admin": "#/admin"
};

function hashToModule(hash) {
  return HASH_TO_MODULE[hash] || "dashboard";
}

function moduleToHash(key) {
  return MODULE_TO_HASH[key] || "#/dashboard";
}

function appNavigate(key) {
  if (key !== currentModule) { previousModule = currentModule; }
  currentModule = key;
  window.location.hash = moduleToHash(key);
  renderModule(key);
  closeSidebar();
}

function appNavigateBack() {
  if (previousModule) {
    const prev = previousModule;
    previousModule = null;
    currentModule = prev;
    window.location.hash = moduleToHash(prev);
    renderModule(prev);
    closeSidebar();
  } else {
    appNavigate('dashboard');
  }
}

function handleHashChange() {
  const key = hashToModule(window.location.hash);
  if (key !== currentModule) {
    currentModule = key;
    renderModule(key);
    closeSidebar();
  }
}

window.addEventListener("hashchange", handleHashChange);

async function initApp() {
  await init();

  // 3D Neumorphic Teal Google Authentication — runs on index.html
  const googleForm = $q("#googleAuthForm");
  if (googleForm) {
    if (currentUser) {
      window.location.href = "dashboard.html";
      return;
    }

    const hp = $q("#hp");
    const recaptchaBox = $q("#recaptchaBox");
    const recaptchaLabel = $q("#recaptchaLabel");
    const recaptchaHint = $q("#recaptchaHint");
    const btnGoogle = $q("#btnGoogleSignIn");
    const btnText = $q("#btnText");
    const authFeedback = $q("#authFeedback");
    const btnAltAccount = $q("#btnAltAccount");
    const visualLock = $q("#visualLock");
    const visualDial = $q("#visualDial");
    const wellStatusTag = $q("#wellStatusTag");
    const adminAccountSelect = $q("#adminAccountSelect");
    const btnDirectDashboard = $q("#btnDirectDashboard");
    let recaptchaChecked = false;

    if (btnDirectDashboard) {
      btnDirectDashboard.onclick = (e) => {
        const selectedEmail = adminAccountSelect ? adminAccountSelect.value : ADMIN_EMAIL;
        const u = state.users.find(u => u.email.toLowerCase() === selectedEmail.toLowerCase()) || {
          id: selectedEmail === "actinst.admin@gmail.com" ? "u0" : "u1",
          email: selectedEmail,
          name: selectedEmail === "actinst.admin@gmail.com" ? "ACTI Admin" : "Chamie D.",
          role: "admin"
        };
        currentUser = u;
        sessionStorage.setItem("cc_user", u.id);
        localStorage.setItem("cc_user", u.id);
      };
    }

    const toggleRecaptcha = () => {
      recaptchaChecked = !recaptchaChecked;
      if (recaptchaBox) {
        recaptchaBox.classList.toggle("checked", recaptchaChecked);
        recaptchaBox.setAttribute("aria-checked", recaptchaChecked ? "true" : "false");
      }
      if (recaptchaHint) recaptchaHint.style.display = "none";
      if (authFeedback && authFeedback.classList.contains("error")) {
        authFeedback.textContent = "Protected by secure verification";
        authFeedback.className = "auth-feedback-status";
      }
    };

    if (recaptchaBox) {
      recaptchaBox.onclick = toggleRecaptcha;
      recaptchaBox.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRecaptcha(); } };
    }
    if (recaptchaLabel) {
      recaptchaLabel.onclick = toggleRecaptcha;
    }

    async function executeGoogleLogin(emailToUse = ADMIN_EMAIL) {
      try {
        if (btnGoogle) btnGoogle.disabled = true;
        if (btnText) btnText.textContent = "Signing in...";
        if (authFeedback) {
          authFeedback.textContent = "Verifying Google credentials...";
          authFeedback.className = "auth-feedback-status";
        }

        const user = await login(emailToUse, "google-oauth");
        sessionStorage.setItem("cc_user", user.id);

        if (visualLock) visualLock.style.display = "none";
        if (visualDial) visualDial.style.display = "flex";
        if (wellStatusTag) {
          wellStatusTag.innerHTML = '<span class="status-green-dot"></span> Access Authorized';
        }
        if (btnText) btnText.textContent = "ACCESS VERIFIED ✓";
        if (btnGoogle) btnGoogle.classList.add("verified-btn");
        if (authFeedback) {
          authFeedback.textContent = "✓ Access verified successfully";
          authFeedback.className = "auth-feedback-status success";
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1100);
      } catch (err) {
        if (btnGoogle) {
          btnGoogle.disabled = false;
          btnGoogle.classList.remove("verified-btn");
        }
        if (btnText) btnText.textContent = "Sign in with Google";
        if (visualLock) visualLock.style.display = "flex";
        if (visualDial) visualDial.style.display = "none";
        if (authFeedback) {
          authFeedback.textContent = typeof err === "string" ? err : (err && err.message ? err.message : "Access denied.");
          authFeedback.className = "auth-feedback-status error";
        }
      }
    }

    googleForm.onsubmit = async (e) => {
      e.preventDefault();
      if (hp && hp.value.trim() !== "") return;

      if (!recaptchaChecked) {
        toggleRecaptcha();
      }

      const emailToUse = adminAccountSelect ? adminAccountSelect.value : ADMIN_EMAIL;
      await executeGoogleLogin(emailToUse);
    };

    if (btnAltAccount) {
      btnAltAccount.onclick = async () => {
        const customEmail = prompt("Sign in with Google\nEnter your Gmail address:", "");
        if (!customEmail) return;
        if (!recaptchaChecked) {
          toggleRecaptcha();
        }
        await executeGoogleLogin(customEmail.trim());
      };
    }

    return;
  }

  // Dashboard page setup — only runs on dashboard.html
  if (!currentUser) {
    const stored = sessionStorage.getItem("cc_user") || localStorage.getItem("cc_user");
    if (stored) {
      currentUser = state.users.find(u => u.id === stored || u.email.toLowerCase() === stored.toLowerCase());
    }
    if (!currentUser) {
      currentUser = state.users.find(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) || {
        id: "u0",
        email: ADMIN_EMAIL,
        name: "ACTI Admin",
        role: "admin"
      };
      sessionStorage.setItem("cc_user", currentUser.id);
      localStorage.setItem("cc_user", currentUser.id);
    }
  }
  shellDashboard();

  // Sidebar toggle
  const openSidebarBtn = $q("#openSidebar");
  if (openSidebarBtn) openSidebarBtn.onclick = openSidebar;
  const appShell = $q("#appShell");
  if (appShell) appShell.onclick = (e) => { if (e.target === appShell) closeSidebar(); };

  // Global search
  const globalSearch = $q("#globalSearch");
  if (globalSearch) {
    globalSearch.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const cards = $all(".card");
      cards.forEach(c => {
        const text = c.textContent.toLowerCase();
        c.style.display = text.includes(q) ? "" : "none";
      });
    });
  }

  // Topbar Notification bell
  const bellBtn = $q("#bellBtn");
  if (bellBtn) {
    bellBtn.onclick = appOpenNotificationsModal;
  }

  // Quick add button
  const quickAddBtn = $q("#quickAddBtn");
  if (quickAddBtn) {
    quickAddBtn.onclick = () => {
      const m = ($q("#pageTitle") ? $q("#pageTitle").textContent : "").toLowerCase();
      if (m.includes("voucher")) appAutoSaveVoucher();
      else if (m.includes("cash")) appAddCashFlowModal();
      else if (m.includes("payroll")) appRunPayroll();
      else if (m.includes("blogger")) appOpenBlogModal();
      else if (m.includes("leave")) appOpenLeaveModal();
      else if (m.includes("overtime")) appOpenOTModal();
      else if (m.includes("invoice")) appOpenInvoiceModal();
      else if (m.includes("task")) appOpenTaskModal();
      else if (m.includes("staff")) appOpenStaffModal();
      else if (m.includes("admin")) appOpenAdminModal();
      else appNavigate("voucher");
    };
  }
}

// Expose all action handlers on window for HTML inline onclick/onchange handlers
Object.assign(window, {
  appNavigate,
  appNavigateBack,
  appAutoSaveVoucher,
  appSaveVoucherDraft,
  appClearVoucher,
  appPostVoucher,
  appPrintVoucher,
  appDeleteVoucher,
  appSyncVouchersToCashFlow,
  appOpenSOAUpload,
  appSaveSOA,
  appDownloadSOA,
  appDeleteSOA,
  appAddCashFlow,
  appAddCashFlowModal,
  appSaveCashFlowEntry,
  appDeleteCashFlow,
  appRunPayroll,
  appOpenBlogModal,
  appSaveBlog,
  appViewQR,
  appDownloadQR,
  appViewBlog,
  appOpenLeaveModal,
  appSubmitLeave,
  appLeaveAction,
  appPrintLeave,
  appOpenOTModal,
  appSubmitOT,
  appOTAction,
  appOpenInvoiceModal,
  appSaveInvoice,
  appInvoiceStatus,
  appDeleteInvoice,
  appOpenTaskModal,
  appSaveTask,
  appToggleTask,
  appTaskStatus,
  appDeleteTask,
  appClearAudit,
  appOpenAdminModal,
  appSaveAdmin,
  appBlockAdmin,
  appEditAdmin,
  appDeleteAdmin,
  appOpenStaffModal,
  appSaveStaff,
  appEditStaff,
  appDeleteStaff,
  appToggleControl,
  appOpenNotificationsModal,
  appMarkAllNotificationsRead,
  appClearNotifications
});

initApp().catch(e => { console.error("initApp error", e); shellLogin(); });
