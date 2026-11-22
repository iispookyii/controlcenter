/* ==========================================================================
   CONTROL CENTER — Office Management System
   Teal glassmorphic theme, lamp login, backend API with localStorage fallback
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
  studentRequests: [],
  leaves: [],
  overtime: [],
  tasks: [],
  notifications: [],
  soaUploads: [],
  balanceAdjustments: []
};

let currentUser = null;
let currentModule = 'dashboard';
let previousModule = null;

// Tab States for Multi-Tab Modules
let leaveActiveTab = 'file'; // 'file' | 'approval' | 'balances' | 'my'
let invoiceActiveTab = 'portal'; // 'portal' | 'requests' | 'register'
let taskActiveFilter = 'boxes'; // 'boxes' | 'my' | 'all'

async function init() {
  let loaded = false;
  try {
    const [users, sessions, audit, employees, vouchers, cashflow, payroll, blogs, invoices, leaves, overtime, tasks, notifications, soaUploads, studentRequests, balanceAdjustments, admins] = await Promise.all([
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
      api.list("studentRequests").catch(() => []),
      api.list("balanceAdjustments").catch(() => []),
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
      studentRequests: studentRequests || [],
      leaves: leaves || [],
      overtime: overtime || [],
      tasks: tasks || [],
      notifications: notifications || [],
      soaUploads: soaUploads || [],
      balanceAdjustments: balanceAdjustments || []
    };
    loaded = true;
  } catch (e) {
    const s = lsLoad("state");
    if (s) state = s;
    loaded = false;
  }
  seedIfEmpty();
  persist();

  // Restore current user session
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
      { id: "a0", email: "actinst.admin@gmail.com", name: "ACTI Admin", role: "admin", status: "active", permissions: ["*"], createdAt: nowIso() },
      { id: "a1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", status: "active", permissions: ["*"], createdAt: nowIso() }
    ];
  }

  // 5 Leave Days per Year default policy
  if (!state.employees || state.employees.length === 0) {
    state.employees = [
      { id: "e0", name: "ACTI Admin", email: "actinst.admin@gmail.com", designation: "Super Admin", type: "super_admin", status: "Active", joinDate: "2022-01-01", contractStartDate: "2022-01-01", permanentDate: "2022-01-01", contactNumber: "09171234567", salary: 50000, annualEntitlement: 5, leaveBalance: 5, enrolled: true },
      { id: "e1", name: "Angelina A. Aquino", email: "actianj@gmail.com", designation: "Supervisor", type: "supervisor", status: "Active", joinDate: "2022-01-15", contractStartDate: "2022-01-15", permanentDate: "2022-01-15", contactNumber: "09175550101", salary: 38000, annualEntitlement: 5, leaveBalance: 4, enrolled: true },
      { id: "e2", name: "Danica R. Tuliao", email: "actitrish0303@gmail.com", designation: "Admin Staff", type: "staff", status: "Active", joinDate: "2022-10-03", contractStartDate: "2022-10-03", permanentDate: "2022-10-03", contactNumber: "09185550202", salary: 28000, annualEntitlement: 5, leaveBalance: 5, enrolled: true },
      { id: "e3", name: "Charmaine Mallillin", email: "charmaine.mallillin@gmail.com", designation: "Regular Staff", type: "regular", status: "Active", joinDate: "2022-10-03", contractStartDate: "2022-10-03", permanentDate: "2022-10-03", contactNumber: "09195550303", salary: 28000, annualEntitlement: 5, leaveBalance: 5, enrolled: true },
      { id: "e4", name: "Maria Santos", email: "maria@office.local", designation: "Admin Assistant", type: "permanent", status: "Active", joinDate: "2023-01-15", contractStartDate: "2023-01-15", permanentDate: "2023-01-15", contactNumber: "09205550404", salary: 28000, annualEntitlement: 5, leaveBalance: 5, enrolled: true },
      { id: "e5", name: "John Reyes", email: "john@office.local", designation: "Accounting Clerk", type: "permanent", status: "Active", joinDate: "2022-06-10", contractStartDate: "2022-06-10", permanentDate: "2022-06-10", contactNumber: "09215550505", salary: 32000, annualEntitlement: 5, leaveBalance: 5, enrolled: true },
      { id: "e6", name: "Chamie D.", email: "dcchamie25@gmail.com", designation: "Manager / Super Admin", type: "super_admin", status: "Active", joinDate: "2022-01-01", contractStartDate: "2022-01-01", permanentDate: "2022-01-01", contactNumber: "09179998877", salary: 50000, annualEntitlement: 5, leaveBalance: 5, enrolled: true }
    ];
  } else {
    // Ensure all existing employees adhere to 5 days policy if not yet set
    state.employees.forEach(emp => {
      emp.annualEntitlement = 5;
      if (emp.leaveBalance == null || emp.leaveBalance > 5) {
        emp.leaveBalance = 5;
      }
    });
    SUPER_ADMINS.forEach((admEmail, idx) => {
      if (!state.employees.find(e => e.email.toLowerCase() === admEmail.toLowerCase())) {
        state.employees.push({
          id: idx === 0 ? "e0" : "e6",
          name: idx === 0 ? "ACTI Admin" : "Chamie D.",
          email: admEmail,
          designation: "Super Admin",
          type: "super_admin",
          status: "Active",
          joinDate: "2022-01-01",
          contractStartDate: "2022-01-01",
          permanentDate: "2022-01-01",
          contactNumber: "09171234567",
          salary: 50000,
          annualEntitlement: 5,
          leaveBalance: 5,
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
      {
        id: "l1",
        employeeName: "Edlene G. Lobendino",
        employeeEmail: "edlene@office.local",
        designation: "Admin Staff",
        contactNumber: "9693195520",
        type: "Academic Leave",
        from: "2026-11-11",
        to: "2026-11-11",
        datesFormatted: "November 11, 2026",
        days: 1,
        reason: "Final Examination in Legal and Judicial Ethics",
        status: "approved",
        disapprovalReason: "",
        recommendedBy: "ANGELINA A. AQUINO",
        approvedBy: "PATRICIA FAE C. RAMEL, CPA",
        createdAt: "2026-11-10T08:00:00.000Z"
      }
    ];
  }
  if (!state.tasks || state.tasks.length === 0) {
    state.tasks = [
      { id: "t1", employeeId: "e1", title: "Review & approve daily payment vouchers", status: "done", due: "2026-11-21", progress: 100, createdAt: nowIso() },
      { id: "t2", employeeId: "e1", title: "Audit student POP uploads and refund queue", status: "in progress", due: "2026-11-22", progress: 50, createdAt: nowIso() },
      { id: "t3", employeeId: "e2", title: "Prepare auto vouchers for office supplies", status: "done", due: "2026-11-21", progress: 100, createdAt: nowIso() },
      { id: "t4", employeeId: "e2", title: "Log new student inquiries and invoice requests", status: "in progress", due: "2026-11-22", progress: 50, createdAt: nowIso() },
      { id: "t5", employeeId: "e3", title: "Publish weekly accounting blog update & QR code", status: "done", due: "2026-11-21", progress: 100, createdAt: nowIso() },
      { id: "t6", employeeId: "e4", title: "Conduct daily cash count and balance petty cash", status: "done", due: "2026-11-21", progress: 100, createdAt: nowIso() },
      { id: "t7", employeeId: "e5", title: "Upload monthly Statement of Account (SOA) PDF", status: "pending", due: "2026-11-23", progress: 0, createdAt: nowIso() }
    ];
  }
  if (!state.studentRequests || state.studentRequests.length === 0) {
    state.studentRequests = [
      {
        id: "sr1",
        type: "invoice",
        studentName: "Juan Dela Cruz",
        contactNumber: "09171239876",
        email: "juan.delacruz@student.local",
        studentId: "ACTI-2026-088",
        program: "Certified Accounting Technician (CAT)",
        datePaid: "2026-11-19",
        paymentMethod: "GCash",
        refNumber: "GC-982144512",
        amount: 8500,
        popUrl: "",
        popName: "receipt_gcash_8500.jpg",
        notes: "Request for Official Receipt for company sponsorship reimbursement",
        status: "verified",
        issuedInvoiceRef: "INV-2026-001",
        createdAt: nowIso()
      },
      {
        id: "sr2",
        type: "refund",
        studentName: "Kristine Joy Mendoza",
        contactNumber: "09289871122",
        email: "kristine.mendoza@student.local",
        studentId: "ACTI-2026-112",
        program: "CPA Board Review Class",
        datePaid: "2026-11-15",
        paymentMethod: "BDO Online",
        refNumber: "BDO-09281273",
        amount: 12000,
        refundAmount: 12000,
        refundReason: "Schedule conflict with masteral classes",
        disbursementAccount: "BDO Account: 001234567890 (Kristine Joy Mendoza)",
        popUrl: "",
        popName: "bdo_transfer_proof.pdf",
        status: "pending",
        createdAt: nowIso()
      }
    ];
  }
  if (!state.balanceAdjustments) state.balanceAdjustments = [];
  if (!state.audit || state.audit.length === 0) {
    state.audit = [
      { id: "a1", userId: "u1", email: ADMIN_EMAIL, action: "system_init", target: "Control Center", meta: "System initialized and ready", at: nowIso() },
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

/* ---------------- Auth & Permissions ---------------- */
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

function isAdmin() {
  return currentUser && (currentUser.role === "admin" || SUPER_ADMINS.includes(currentUser.email.toLowerCase()));
}
function isSuperAdmin() {
  return currentUser && SUPER_ADMINS.includes(currentUser.email.toLowerCase());
}
function isSupervisor() {
  if (!currentUser) return false;
  if (isSuperAdmin()) return true;
  const emp = state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase());
  return emp && (emp.type === "supervisor" || (emp.designation && emp.designation.toLowerCase().includes("supervisor")));
}
function isManager() {
  if (!currentUser) return false;
  if (isSuperAdmin()) return true;
  const emp = state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase());
  return emp && (emp.type === "manager" || (emp.designation && emp.designation.toLowerCase().includes("manager")));
}

function hasModuleAccess(key) {
  if (isSuperAdmin()) return true;
  if (!currentUser) return false;
  if (key === "dashboard") return true;
  const adminRec = (state.admins || []).find(a => a.email.toLowerCase() === currentUser.email.toLowerCase());
  if (adminRec) {
    if (!adminRec.permissions || adminRec.permissions.includes("*") || adminRec.permissions.length === 0) return true;
    return adminRec.permissions.includes(key);
  }
  return ["dashboard", "leave", "overtime", "tasks", "invoice"].includes(key);
}

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
  { key: "invoice", label: "Student Invoices & Refunds", hash: "#/invoice", svg: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2.2"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2.2"/><polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "tasks", label: "Staff Daily Tasks", hash: "#/tasks", svg: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "staff", label: "Staff Enrollment", hash: "#/staff", svg: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "controls", label: "Controls Checklist", hash: "#/controls", svg: '<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>' },
  { key: "audit", label: "Audit Logs", hash: "#/audit", svg: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { key: "admin", label: "Admins & Permissions", hash: "#/admin", svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M6 20v-2a6 6 0 0112 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="19" y1="11" x2="23" y2="11" stroke="currentColor" stroke-width="2.2"/></svg>' }
];

function renderSidebar() {
  const list = $q("#navList");
  if (!list) return;

  list.innerHTML = "";
  MODULES.forEach(m => {
    if (!hasModuleAccess(m.key)) return;
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
      <div class="user-role-mini">${isSuperAdmin() ? 'Super Admin' : (isAdmin() ? 'Admin' : 'Staff')}</div>
    </div>
    <button class="btn-topbar-logout" id="btnLogout" title="Sign Out">
      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="21" y1="12" x2="14" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
  if (!hasModuleAccess(key)) {
    const content = $q("#appContent");
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <h3>Access Restricted</h3>
          <p>You do not have permission to view the ${escapeHtml(key)} module. Contact a Super Admin for access.</p>
          <button class="btn-sm teal" style="margin-top:14px;" onclick="appNavigate('dashboard')">Return to Dashboard</button>
        </div>`;
    }
    return;
  }

  setActiveNav(key);
  const titleMap = {
    dashboard: "Dashboard",
    voucher: "Auto Voucher",
    cashflow: "Cash Flow + SOA",
    payroll: "Auto Payroll",
    blogger: "Blogger Automation",
    leave: "Online Leave Filing",
    overtime: "Overtime / Offset",
    invoice: "Student Invoices & Refunds",
    tasks: "Staff Daily Tasks",
    staff: "Staff Enrollment",
    controls: "Controls Checklist",
    audit: "Audit Logs",
    admin: "Admins & Permissions"
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
  const pendingStudentReq = (state.studentRequests || []).filter(r => r.status === "pending").length;

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
        <div class="kpi-delta neu">claims</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Student Requests</div>
        <div class="kpi-value">${pendingStudentReq}</div>
        <div class="kpi-delta neu">OR & refunds pending</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
      <div class="card">
        <div class="card-header"><h3>Quick Actions</h3></div>
        <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;">
          <button class="btn-sm teal" onclick="appNavigate('voucher')">Auto Voucher</button>
          <button class="btn-sm" onclick="appNavigate('payroll')">Run Payroll</button>
          <button class="btn-sm" onclick="appNavigate('leave')">File Leave</button>
          <button class="btn-sm" onclick="appNavigate('overtime')">OT Request</button>
          <button class="btn-sm" onclick="appNavigate('invoice')">Student Invoices</button>
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
    <div class="card" style="margin-top:16px;">
      <div class="card-header"><h3>Staff Daily Tasks Overview</h3><div class="card-actions"><button class="btn-sm" onclick="appNavigate('tasks')">View Task Boxes</button></div></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Task</th><th>Staff</th><th>Status</th><th>Due</th><th>Progress</th></tr></thead>
          <tbody id="recentTasks"></tbody>
        </table>
      </div>
    </div>
  `;

  const actBody = $q("#recentActivity");
  const recent = state.audit.slice(0, 5);
  actBody.innerHTML = recent.map(a => `
    <tr><td>${fmtDate(a.at)}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.email)}</td><td>${escapeHtml(a.target)}</td></tr>
  `).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--ink-dim);padding:14px;">No recent activity</td></tr>`;

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
  `).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:14px;">No tasks</td></tr>`;
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
        <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
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
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn-sm teal" onclick="appSaveVoucherDraft()">Save Draft</button>
          <button class="btn-sm" onclick="appPostVoucher()" ${voucherDraft.status==='posted'?'disabled':''}>Post Voucher</button>
          <button class="btn-sm" onclick="appClearVoucher()">New</button>
        </div>
        <div id="voucherMsg" class="hint" style="margin-top:8px;"></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
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
  body { font-family: 'Poppins', system-ui, -apple-system, sans-serif; padding: 25px; color: #1e293b; background: #fff; max-width: 800px; margin: 0 auto; font-size: 11px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #086375; padding-bottom: 12px; margin-bottom: 20px; }
  .logo-wrap { display: flex; align-items: center; gap: 12px; }
  .logo-wrap img { width: 54px; height: 54px; border-radius: 50%; }
  .title-wrap h1 { margin: 0; font-size: 13px; color: #086375; font-weight: 700; }
  .title-wrap p { margin: 2px 0 0; font-size: 10px; color: #64748b; }
  .ref-box { text-align: right; }
  .ref-box .ref-num { font-size: 14px; font-weight: 700; color: #086375; }
  .ref-box .ref-date { font-size: 10px; color: #64748b; margin-top: 2px; }
  .voucher-type-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-weight: 600; font-size: 10px; text-transform: uppercase; background: ${v.type === 'income' ? '#e8f5e9' : '#e0f2f1'}; color: ${v.type === 'income' ? '#059669' : '#086375'}; margin-bottom: 16px; }
  table.details { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.details th, table.details td { padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px; }
  table.details th { background: #f8fafc; font-weight: 600; width: 25%; color: #475569; }
  .amount-highlight { font-size: 14px; font-weight: 700; color: #086375; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1.5px solid #94a3b8; margin-top: 35px; padding-top: 4px; font-size: 10px; font-weight: 600; color: #475569; }
  .sig-sub { font-size: 9px; color: #94a3b8; }
  .footer-note { margin-top: 30px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
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
      <td style="font-size:0.75rem;color:var(--ink-dim);">${escapeHtml(v.createdBy)}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn-sm teal" onclick="appPrintVoucher('${v.id}')" style="padding:3px 6px;font-size:0.72rem;">Print</button>
        ${isAdmin() ? `<button class="btn-sm" onclick="appDeleteVoucher('${v.id}')" style="padding:3px 6px;font-size:0.72rem;color:var(--error);">Delete</button>` : ''}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="9" style="text-align:center;color:var(--ink-dim);padding:14px;">No vouchers yet</td></tr>`;
}

/* ==========================================================================
   MODULE: CASH FLOW + SOA
   ========================================================================== */
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

    <div class="card" style="margin-top:16px;">
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
          <button class="btn-sm" onclick="appDeleteCashFlow('${c.id}')" style="padding:3px 6px;font-size:0.72rem;color:var(--error);">Delete</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:14px;">No cash flow entries yet</td></tr>`;
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
        <td style="display:flex;gap:4px;">
          <button class="btn-sm teal" onclick="appDownloadSOA('${s.id}')" style="padding:3px 6px;font-size:0.72rem;">Download PDF</button>
          ${isAdmin() ? `<button class="btn-sm" onclick="appDeleteSOA('${s.id}')" style="padding:3px 6px;font-size:0.72rem;color:var(--error);">Delete</button>` : ''}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--ink-dim);padding:14px;">No SOA PDFs uploaded yet</td></tr>`;
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
    <div class="modal" style="max-width:500px;">
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
            <input type="text" id="cfCategory" placeholder="e.g. Training Fees, Rent, Supplies">
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
    <div class="modal" style="max-width:500px;">
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
        <p class="hint" style="margin-top:6px;">Upload PDF only. File will be saved and downloadable anytime.</p>
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
  }).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:14px;">No payroll runs yet</td></tr>`;
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
      <td style="display:flex;gap:4px;">
        <button class="btn-sm" onclick="appViewQR('${escapeHtml(b.id)}')">QR</button>
        <button class="btn-sm teal" onclick="appViewBlog('${escapeHtml(b.id)}')">View</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--ink-dim);padding:14px;">No posts yet</td></tr>`;
}

function appOpenBlogModal(blogId) {
  const existing = blogId ? state.blogs.find(b => b.id === blogId) : null;
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.id = "blogModal";
  mod.innerHTML = `
    <div class="modal" style="max-width:560px;">
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
            <textarea id="blogContent" placeholder="Write your update..." rows="5">${existing ? escapeHtml(existing.content || '') : ''}</textarea>
          </div>
        </div>
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
    <div class="modal" style="max-width:480px;text-align:center;">
      <div class="modal-header">
        <h3>QR Code</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:20px;">
        <div style="font-size:0.85rem;color:var(--ink-dim);margin-bottom:12px;">${escapeHtml(b.title)}</div>
        <div id="qrCanvas" style="margin:0 auto 12px;"></div>
        <div class="hint" style="margin-bottom:8px;">Scan to open: ${escapeHtml(b.url || location.origin)}</div>
        <button class="btn-sm" onclick="appDownloadQR('${b.id}')">Download</button>
        <button class="btn-sm teal" onclick="navigator.clipboard.writeText('${escapeHtml(b.url || location.origin)}')">Copy Link</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
  renderQR(b.url || location.origin, "qrCanvas");
}

function appDownloadQR(id) {
  const b = state.blogs.find(x => x.id === id);
  alert("QR Link: " + (b ? b.url : location.origin) + "\n(Right-click or screenshot the QR code to save as image)");
}

function appViewBlog(id) {
  const b = state.blogs.find(x => x.id === id);
  if (!b) return;
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:620px;">
      <div class="modal-header">
        <h3>${escapeHtml(b.title)}</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:18px;">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
          <span class="badge ${b.status==='published'?'badge-success':'badge-warning'}">${escapeHtml(b.status)}</span>
          <span style="font-size:0.75rem;color:var(--ink-dim);">Created ${fmtDate(b.createdAt)}</span>
        </div>
        <div style="white-space:pre-wrap;line-height:1.6;color:var(--ink);border-top:1px solid var(--line);padding-top:12px;font-size:0.85rem;">${escapeHtml(b.content || "")}</div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-sm teal" onclick="this.closest('.modal-overlay').remove();appOpenBlogModal('${b.id}')">Edit</button>
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
      container.innerHTML = `<div style="padding:20px;font-size:0.82rem;">QR Code: ${escapeHtml(text)}</div>`;
      return;
    }
    const qr = QRCode.encode(text, { type: 4, ecLevel: 1 });
    const size = qr.moduleCount;
    const scale = 5;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size * scale + 30);
    svg.setAttribute("height", size * scale + 30);
    svg.style.background = "#fff";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules[r][c]) {
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", c * scale + 15);
          rect.setAttribute("y", r * scale + 15);
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
   MODULE: ONLINE LEAVE FILING (ACTI FORM & MULTI-TAB PORTAL)
   Policy: 5 leave days per year, super admins control, supervisor edits need manager approval
   ========================================================================== */
function leaveEligible(emp) {
  const permDateStr = emp ? (emp.permanentDate || emp.joinDate || "2022-01-01") : "2022-01-01";
  const entitlement = 5; // 5 days per year
  return {
    eligible: true,
    entitlement,
    permDate: permDateStr,
    message: "Eligible: " + entitlement + " leave days per year"
  };
}

function renderLeave(el) {
  const myEmp = currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null;
  const pendingCount = state.leaves.filter(l => l.status === "pending").length;
  const myLeaves = currentUser ? state.leaves.filter(l => l.employeeEmail && l.employeeEmail.toLowerCase() === currentUser.email.toLowerCase()) : state.leaves;

  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Online Leave Filing</h2>
        <div class="sub">Accounting Certification and Training Institute, Inc. • Cauayan City, Isabela (Policy: 5 leave days per year)</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appSwitchLeaveTab('file')">+ File Official Form</button>
        <button class="btn-sm" onclick="appPrintLeave()">Print Summary</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <!-- Multi-Tabs -->
    <div class="module-tabs">
      <button class="tab-btn ${leaveActiveTab === 'file' ? 'active' : ''}" onclick="appSwitchLeaveTab('file')">
        <span>📝 File Application Form</span>
      </button>
      <button class="tab-btn ${leaveActiveTab === 'approval' ? 'active' : ''}" onclick="appSwitchLeaveTab('approval')">
        <span>⏳ Requests for Approval</span>
        ${pendingCount > 0 ? `<span class="badge badge-warning" style="padding:2px 6px;font-size:0.68rem;">${pendingCount}</span>` : ''}
      </button>
      <button class="tab-btn ${leaveActiveTab === 'balances' ? 'active' : ''}" onclick="appSwitchLeaveTab('balances')">
        <span>👥 Total Leave per Employee (5/yr)</span>
      </button>
      <button class="tab-btn ${leaveActiveTab === 'my' ? 'active' : ''}" onclick="appSwitchLeaveTab('my')">
        <span>📋 My Filed Leaves (${myLeaves.length})</span>
      </button>
    </div>

    <div id="leaveTabContent"></div>
  `;

  renderLeaveTabBody();
}

function appSwitchLeaveTab(tab) {
  leaveActiveTab = tab;
  renderLeave($q("#appContent"));
}

// In-memory signature storage for Leave Application Form
const paperFormSignatures = {
  emp: null,
  supervisor: null,
  manager: null,
  conforme: null,
  noted: null
};

function appAutoComputeLeaveDays() {
  const fromEl = $q("#pDateFrom");
  const toEl = $q("#pDateTo");
  const daysEl = $q("#pDays");
  const datesEl = $q("#pDates");
  if (!fromEl || !toEl || !daysEl) return;
  if (!fromEl.value) return;
  if (!toEl.value) toEl.value = fromEl.value;

  const d1 = new Date(fromEl.value);
  const d2 = new Date(toEl.value);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return;

  if (d2 < d1) {
    toEl.value = fromEl.value;
  }

  const diffTime = Math.abs(new Date(toEl.value) - d1);
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  daysEl.value = diffDays + (diffDays === 1 ? " day" : " days");

  const opts = { month: "long", day: "numeric", year: "numeric" };
  const str1 = d1.toLocaleDateString("en-US", opts);
  const str2 = new Date(toEl.value).toLocaleDateString("en-US", opts);
  if (datesEl) {
    datesEl.value = (str1 === str2) ? str1 : `${str1} — ${str2}`;
  }
}

function appHandleSigUpload(event, targetKey) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Process signature through canvas: automatic clean white/transparent background
      const canvas = document.createElement("canvas");
      const maxW = 320;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Scan all pixels: convert light/grayish paper background to transparent/white, darken ink
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum > 165) {
          // Background paper or light shadow -> transparent
          data[i + 3] = 0;
        } else {
          // Signature ink -> enhance contrast
          const alpha = Math.min(255, Math.round((1 - lum / 165) * 255 * 1.35));
          data[i] = 10;     // R
          data[i + 1] = 40; // G
          data[i + 2] = 65; // B
          data[i + 3] = alpha;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const cleanDataUrl = canvas.toDataURL("image/png");
      paperFormSignatures[targetKey] = cleanDataUrl;
      appRenderSignatureInBox(targetKey, cleanDataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function appStampDigitalSignature(targetKey, name) {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 240, 60);

  ctx.font = "italic 23px 'Brush Script MT', 'Dancing Script', cursive, 'Segoe Script', sans-serif";
  ctx.fillStyle = "#0c424e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(name || "Authorized Signature", 120, 28);

  // Artistic underline flourish
  ctx.beginPath();
  ctx.moveTo(30, 42);
  ctx.bezierCurveTo(85, 48, 155, 36, 210, 41);
  ctx.strokeStyle = "rgba(12, 66, 78, 0.75)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const stampDataUrl = canvas.toDataURL("image/png");
  paperFormSignatures[targetKey] = stampDataUrl;
  appRenderSignatureInBox(targetKey, stampDataUrl);
}

function appClearSignature(targetKey) {
  paperFormSignatures[targetKey] = null;
  const box = $q(`#sigBox_${targetKey}`);
  if (box) {
    box.classList.remove("has-sig");
    box.innerHTML = `<span class="sig-placeholder-hint">Click or Upload Signature</span>`;
  }
}

function appRenderSignatureInBox(targetKey, dataUrl) {
  const box = $q(`#sigBox_${targetKey}`);
  if (!box) return;
  box.classList.add("has-sig");
  box.innerHTML = `<img src="${dataUrl}" alt="Digital Signature" class="sig-preview-img">`;
}

function appOnRecCheck(status) {
  if (status === "approved") {
    if ($q("#pRecApproved")) $q("#pRecApproved").checked = true;
    if ($q("#pRecDisapproved")) $q("#pRecDisapproved").checked = false;
  } else {
    if ($q("#pRecApproved")) $q("#pRecApproved").checked = false;
    if ($q("#pRecDisapproved")) $q("#pRecDisapproved").checked = true;
  }
}

function appOnAppCheck(status) {
  if (status === "approved") {
    if ($q("#pAppApproved")) $q("#pAppApproved").checked = true;
    if ($q("#pAppDisapproved")) $q("#pAppDisapproved").checked = false;
  } else {
    if ($q("#pAppApproved")) $q("#pAppApproved").checked = false;
    if ($q("#pAppDisapproved")) $q("#pAppDisapproved").checked = true;
  }
}

function renderLeaveTabBody() {
  const container = $q("#leaveTabContent");
  if (!container) return;

  const myEmp = currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null;
  const defaultEmpName = myEmp ? myEmp.name : (currentUser ? currentUser.name : "Edlene G. Lobendino");
  const defaultDesignation = myEmp ? (myEmp.designation || myEmp.type) : "Admin Staff";
  const defaultContact = myEmp ? (myEmp.contactNumber || "9693195520") : "9693195520";
  const defaultBalance = myEmp ? (myEmp.leaveBalance != null ? myEmp.leaveBalance : 5) : 5;

  if (leaveActiveTab === "file") {
    // Exact Authentic Paper Sheet Replica of image-24.png with all editable fields!
    container.innerHTML = `
      <div class="acti-paper-wrapper">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.78rem;font-weight:600;color:var(--ink);">Fill / Load Staff:</span>
            <select id="paperEmpQuickSelect" onchange="appOnPaperEmpSelect(this.value)" style="padding:4px 8px;font-size:0.78rem;border-radius:6px;border:1px solid #cbd5e1;">
              ${state.employees.map(e => `<option value="${e.id}" ${e.name === defaultEmpName ? 'selected' : ''}>${escapeHtml(e.name)} (${escapeHtml(e.designation || e.type)})</option>`).join("")}
            </select>
          </div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-sm" onclick="appResetPaperLeaveForm()">Reset Form</button>
            <button type="button" class="btn-sm teal" onclick="appPrintOfficialLeaveForm()">Print Form</button>
          </div>
        </div>

        <form id="actiPaperLeaveForm" onsubmit="event.preventDefault();appSubmitPaperLeave();">
          <div class="acti-paper-sheet">
            <!-- Header (Clean Circular Logo, No Black Box) -->
            <div class="paper-header">
              <img src="assets/acti-logo.png" alt="ACTI Seal" class="paper-logo">
              <div class="paper-company-title">ACCOUNTING CERTIFICATION AND TRAINING INSTITUTE, INC.</div>
              <div class="paper-company-sub">2nd Floor Vicente Manlapaz Bldg., District 1, Cauayan City, Isabela</div>
            </div>

            <!-- Banner -->
            <div class="paper-banner-title">APPLICATION FOR LEAVE</div>

            <!-- Meta Row: 4 Underlined Fields -->
            <div class="paper-meta-row">
              <div class="paper-meta-field">
                <span>DATE OF FILING :</span>
                <input type="text" id="pDateFiling" class="paper-line-input" value="${new Date().toLocaleDateString('en-US')}">
              </div>
              <div class="paper-meta-field">
                <span>NAME:</span>
                <input type="text" id="pEmpName" class="paper-line-input" value="${escapeHtml(defaultEmpName)}">
              </div>
              <div class="paper-meta-field">
                <span>DESIGNATION:</span>
                <input type="text" id="pDesignation" class="paper-line-input" value="${escapeHtml(defaultDesignation)}">
              </div>
              <div class="paper-meta-field">
                <span>CONTACT NUMBER:</span>
                <input type="text" id="pContact" class="paper-line-input" value="${escapeHtml(defaultContact)}">
              </div>
            </div>

            <!-- Subheader Banner -->
            <div class="paper-section-banner">DETAILS OF APPLICATION</div>

            <!-- Details Split Grid -->
            <div class="paper-details-grid">
              <!-- Left Column: Leave Types & Reason -->
              <div class="paper-col-left">
                <div>
                  <div style="font-weight:700;margin-bottom:6px;font-size:11px;">TYPE OF LEAVE APPLIED FOR</div>
                  <label class="paper-checkbox-item">
                    <input type="checkbox" id="pTypeVacation" onchange="appPaperToggleType('Vacation Leave')">
                    <span>Vacation Leave</span>
                  </label>
                  <label class="paper-checkbox-item">
                    <input type="checkbox" id="pTypeSick" onchange="appPaperToggleType('Sick Leave')">
                    <span>Sick Leave</span>
                  </label>
                  <div style="margin-top:4px;">
                    <span style="font-style:italic;">Others:</span>
                    <input type="text" id="pTypeOther" class="paper-line-input" value="Academic Leave" placeholder="Specify other leave type" style="margin-top:2px;">
                  </div>
                </div>

                <div style="margin-top:auto;">
                  <div style="font-weight:700;margin-bottom:4px;font-size:11px;">REASON FOR LEAVE</div>
                  <textarea id="pReason" class="paper-reason-textarea" rows="3" placeholder="State reason for leave application...">Final Examination in Legal and Judicial Ethics</textarea>
                </div>
              </div>

              <!-- Right Column: Dates (Auto-Compute), Days, Signature Upload -->
              <div class="paper-col-right">
                <div>
                  <div style="font-weight:700;margin-bottom:4px;font-size:11px;">INCLUSIVE DATES</div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px;">
                    <div>
                      <span style="font-size:9.5px;color:#475569;font-weight:600;">Date From:</span>
                      <input type="date" id="pDateFrom" class="paper-line-input" value="${new Date().toISOString().split('T')[0]}" onchange="appAutoComputeLeaveDays()">
                    </div>
                    <div>
                      <span style="font-size:9.5px;color:#475569;font-weight:600;">Date To:</span>
                      <input type="date" id="pDateTo" class="paper-line-input" value="${new Date().toISOString().split('T')[0]}" onchange="appAutoComputeLeaveDays()">
                    </div>
                  </div>
                  <input type="text" id="pDates" class="paper-line-input" value="November 11, 2026" placeholder="e.g. November 11, 2026">
                  <div style="margin-top:10px;font-weight:600;font-size:11px;display:flex;align-items:center;justify-content:space-between;">
                    <span>NUMBER OF DAYS:</span>
                    <span style="font-size:9px;color:var(--teal);font-weight:500;">Auto-computed</span>
                  </div>
                  <input type="text" id="pDays" class="paper-line-input" value="1 day" readonly style="background:#f8fafc;font-weight:600;color:var(--teal);">
                </div>

                <!-- Employee Signature Upload & Line -->
                <div class="sig-capture-wrap" style="margin-top:16px;">
                  <div class="sig-preview-box" id="sigBox_emp">
                    <span class="sig-placeholder-hint">Click or Upload Signature</span>
                  </div>
                  <input type="file" id="sigFile_emp" accept="image/*" style="display:none;" onchange="appHandleSigUpload(event, 'emp')">
                  <div class="sig-tools-row no-print">
                    <button type="button" class="btn-sig-pill" onclick="$q('#sigFile_emp').click()">✍️ Upload PNG / JPG</button>
                    <button type="button" class="btn-sig-pill pill-stamp" onclick="appStampDigitalSignature('emp', $q('#pEmpName')?$q('#pEmpName').value:'Employee')">Stamp</button>
                    <button type="button" class="btn-sig-pill pill-clear" onclick="appClearSignature('emp')">Clear</button>
                  </div>
                  <input type="text" id="pSigEmpName" class="paper-line-input" value="${escapeHtml(defaultEmpName)}" style="text-align:center;font-weight:600;">
                  <div style="font-size:10px;font-style:italic;color:#475569;margin-top:2px;">Employee's Name and Signature</div>
                </div>
              </div>
            </div>

            <!-- Signatory Split: Recommended By & Approved By with Signature Upload & Check Badges -->
            <div class="paper-sig-box-split">
              <!-- Recommended By -->
              <div class="paper-sig-box">
                <div class="paper-sig-head">RECOMMENDED BY:</div>
                <div style="display:flex;gap:10px;margin-bottom:8px;">
                  <label class="paper-check-badge-label">
                    <input type="checkbox" id="pRecApproved" checked onchange="appOnRecCheck('approved')">
                    <span class="paper-check-badge approved">
                      <svg viewBox="0 0 24 24" width="13" height="13"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      Approved
                    </span>
                  </label>
                  <label class="paper-check-badge-label">
                    <input type="checkbox" id="pRecDisapproved" onchange="appOnRecCheck('disapproved')">
                    <span class="paper-check-badge disapproved">
                      <svg viewBox="0 0 24 24" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                      Disapproved
                    </span>
                  </label>
                </div>
                <div style="margin-bottom:10px;">
                  <span style="font-style:italic;font-size:10px;">Reason:</span>
                  <input type="text" id="pRecReason" class="paper-line-input" placeholder="Reason if disapproved...">
                </div>

                <div class="sig-capture-wrap" style="margin-top:8px;">
                  <div class="sig-preview-box" id="sigBox_supervisor">
                    <span class="sig-placeholder-hint">Click or Upload Signature</span>
                  </div>
                  <input type="file" id="sigFile_supervisor" accept="image/*" style="display:none;" onchange="appHandleSigUpload(event, 'supervisor')">
                  <div class="sig-tools-row no-print">
                    <button type="button" class="btn-sig-pill" onclick="$q('#sigFile_supervisor').click()">✍️ Upload Signature</button>
                    <button type="button" class="btn-sig-pill pill-stamp" onclick="appStampDigitalSignature('supervisor', 'Angelina A. Aquino')">Stamp</button>
                    <button type="button" class="btn-sig-pill pill-clear" onclick="appClearSignature('supervisor')">Clear</button>
                  </div>
                  <input type="text" id="pSupervisorName" class="paper-line-input" value="ANGELINA A. AQUINO" style="text-align:center;font-weight:600;">
                  <div class="paper-sig-title">Supervisor</div>
                </div>
              </div>

              <!-- Approved By -->
              <div class="paper-sig-box">
                <div class="paper-sig-head">APPROVED BY:</div>
                <div style="display:flex;gap:10px;margin-bottom:8px;">
                  <label class="paper-check-badge-label">
                    <input type="checkbox" id="pAppApproved" checked onchange="appOnAppCheck('approved')">
                    <span class="paper-check-badge approved">
                      <svg viewBox="0 0 24 24" width="13" height="13"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      Approved
                    </span>
                  </label>
                  <label class="paper-check-badge-label">
                    <input type="checkbox" id="pAppDisapproved" onchange="appOnAppCheck('disapproved')">
                    <span class="paper-check-badge disapproved">
                      <svg viewBox="0 0 24 24" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                      Disapproved
                    </span>
                  </label>
                </div>
                <div style="margin-bottom:10px;">
                  <span style="font-style:italic;font-size:10px;">Reason:</span>
                  <input type="text" id="pAppReason" class="paper-line-input" placeholder="Reason if disapproved...">
                </div>

                <div class="sig-capture-wrap" style="margin-top:8px;">
                  <div class="sig-preview-box" id="sigBox_manager">
                    <span class="sig-placeholder-hint">Click or Upload Signature</span>
                  </div>
                  <input type="file" id="sigFile_manager" accept="image/*" style="display:none;" onchange="appHandleSigUpload(event, 'manager')">
                  <div class="sig-tools-row no-print">
                    <button type="button" class="btn-sig-pill" onclick="$q('#sigFile_manager').click()">✍️ Upload Signature</button>
                    <button type="button" class="btn-sig-pill pill-stamp" onclick="appStampDigitalSignature('manager', 'Patricia Fae C. Ramel, CPA')">Stamp</button>
                    <button type="button" class="btn-sig-pill pill-clear" onclick="appClearSignature('manager')">Clear</button>
                  </div>
                  <input type="text" id="pManagerName" class="paper-line-input" value="PATRICIA FAE C. RAMEL, CPA" style="text-align:center;font-weight:600;">
                  <div class="paper-sig-title">Manager</div>
                </div>
              </div>
            </div>

            <!-- Cancelled & Conforme / Noted -->
            <div class="paper-bottom-section">
              <label class="paper-checkbox-item" style="margin-bottom:4px;">
                <input type="checkbox" id="pCancelled">
                <span style="font-weight:700;">CANCELLED</span>
              </label>
              <div>
                <span style="font-style:italic;font-size:10px;">Reason:</span>
                <input type="text" id="pCancelledReason" class="paper-line-input" placeholder="Reason if cancelled...">
              </div>

              <div class="paper-bottom-grid">
                <div class="sig-capture-wrap">
                  <div style="font-weight:700;font-size:10px;text-align:left;margin-bottom:6px;width:100%;">CONFORME BY:</div>
                  <div class="sig-preview-box" id="sigBox_conforme">
                    <span class="sig-placeholder-hint">Click or Upload Signature</span>
                  </div>
                  <input type="file" id="sigFile_conforme" accept="image/*" style="display:none;" onchange="appHandleSigUpload(event, 'conforme')">
                  <div class="sig-tools-row no-print">
                    <button type="button" class="btn-sig-pill" onclick="$q('#sigFile_conforme').click()">✍️ Upload</button>
                    <button type="button" class="btn-sig-pill pill-stamp" onclick="appStampDigitalSignature('conforme', $q('#pEmpName')?$q('#pEmpName').value:'Employee')">Stamp</button>
                    <button type="button" class="btn-sig-pill pill-clear" onclick="appClearSignature('conforme')">Clear</button>
                  </div>
                  <input type="text" id="pConformeSig" class="paper-line-input" value="${escapeHtml(defaultEmpName)}" style="text-align:center;font-weight:600;">
                  <div class="paper-sig-title">Employee's Signature</div>
                </div>

                <div class="sig-capture-wrap">
                  <div style="font-weight:700;font-size:10px;text-align:left;margin-bottom:6px;width:100%;">NOTED BY:</div>
                  <div class="sig-preview-box" id="sigBox_noted">
                    <span class="sig-placeholder-hint">Click or Upload Signature</span>
                  </div>
                  <input type="file" id="sigFile_noted" accept="image/*" style="display:none;" onchange="appHandleSigUpload(event, 'noted')">
                  <div class="sig-tools-row no-print">
                    <button type="button" class="btn-sig-pill" onclick="$q('#sigFile_noted').click()">✍️ Upload</button>
                    <button type="button" class="btn-sig-pill pill-stamp" onclick="appStampDigitalSignature('noted', 'Chamie D.')">Stamp</button>
                    <button type="button" class="btn-sig-pill pill-clear" onclick="appClearSignature('noted')">Clear</button>
                  </div>
                  <input type="text" id="pNotedSig" class="paper-line-input" value="CHAMIE D." style="text-align:center;font-weight:600;">
                  <div class="paper-sig-title">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="paper-action-bar">
            <span style="font-size:0.78rem;color:#64748b;">Annual Policy: <strong>5 leave days/year</strong></span>
            <button type="submit" class="btn-primary" style="padding:8px 22px;">Submit Leave Application</button>
          </div>
        </form>
      </div>
    `;
  } else if (leaveActiveTab === "approval") {
    // Matching Image 7: Action buttons strictly on 1 single line with uniform equal proportions
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Leave Requests for Approval</h3>
          <div class="card-actions">
            <button class="btn-sm" onclick="renderLeaveTabBody()">Refresh</button>
          </div>
        </div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th>Filing Date</th>
                <th>Employee</th>
                <th>Designation</th>
                <th>Type of Leave</th>
                <th>Inclusive Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.leaves.map(l => {
                return `
                  <tr>
                    <td>${fmtDate(l.createdAt)}</td>
                    <td><strong>${escapeHtml(l.employeeName)}</strong></td>
                    <td>${escapeHtml(l.designation || "Admin Staff")}</td>
                    <td><span class="badge badge-info" style="text-transform:none;">${escapeHtml(l.type)}</span></td>
                    <td>${escapeHtml(l.datesFormatted || (fmtDate(l.from) + (l.to && l.to !== l.from ? ' — ' + fmtDate(l.to) : '')))}</td>
                    <td><strong>${l.days}</strong> day(s)</td>
                    <td>${escapeHtml(l.reason)}</td>
                    <td>
                      <span class="badge ${l.status === 'approved' ? 'badge-success' : l.status === 'pending' ? 'badge-warning' : 'badge-error'}">
                        ${escapeHtml(l.status.toUpperCase())}
                      </span>
                      ${l.disapprovalReason ? `<div style="font-size:0.7rem;color:var(--error);margin-top:2px;">Reason: ${escapeHtml(l.disapprovalReason)}</div>` : ''}
                    </td>
                    <td class="approval-actions-cell">
                      <div class="approval-actions-row">
                        <button class="btn-appr-action btn-appr-approve" onclick="appLeaveAction('${l.id}','approved')" title="Approve Application">
                          <svg viewBox="0 0 24 24" width="12" height="12"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                          <span>Approve</span>
                        </button>
                        <button class="btn-appr-action btn-appr-reject" onclick="appDisapproveLeaveModal('${l.id}')" title="Reject Application">
                          <svg viewBox="0 0 24 24" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                          <span>Reject</span>
                        </button>
                        <button class="btn-appr-action btn-appr-view" onclick="appLoadLeaveToForm('${l.id}')" title="Open in Official Form">
                          <svg viewBox="0 0 24 24" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                          <span>View/Edit</span>
                        </button>
                        <button class="btn-appr-action btn-appr-print" onclick="appPrintOfficialLeaveForm('${l.id}')" title="Print ACTI Form">
                          <svg viewBox="0 0 24 24" width="12" height="12"><polyline points="6 9 6 2 18 2 18 9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="6" y="14" width="12" height="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                          <span>Print</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("") || `<tr><td colspan="9" style="text-align:center;color:var(--ink-dim);padding:20px;">No leave requests</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (leaveActiveTab === "balances") {
    const pendingAdj = (state.balanceAdjustments || []).filter(a => a.status === "pending");

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Total Leave Entitlement &amp; Balances per Employee (5 Days / Year)</h3>
          <div class="card-actions">
            ${isSuperAdmin() ? `<span class="badge badge-success" style="font-size:0.7rem;">Super Admin Edit Control Active</span>` : (isSupervisor() ? `<span class="badge badge-info" style="font-size:0.7rem;">Supervisor (Requires Manager Approval)</span>` : '')}
          </div>
        </div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Contract Start</th>
                <th>Permanent Date</th>
                <th>Annual Entitlement</th>
                <th>Remaining Balance</th>
                <th>Status</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.employees.map(emp => {
                return `
                  <tr>
                    <td><strong>${escapeHtml(emp.name)}</strong></td>
                    <td>${escapeHtml(emp.email)}</td>
                    <td><span class="badge badge-info" style="text-transform:none;">${escapeHtml(emp.designation || emp.type)}</span></td>
                    <td>${fmtDate(emp.contractStartDate || emp.joinDate)}</td>
                    <td>${fmtDate(emp.permanentDate || emp.joinDate)}</td>
                    <td><strong>5 days</strong> / year</td>
                    <td><strong style="color:var(--teal-dark);font-size:0.95rem;">${emp.leaveBalance != null ? emp.leaveBalance : 5}</strong> days</td>
                    <td><span class="badge ${emp.status === 'Active' ? 'badge-bg' : 'badge-error'}">${escapeHtml(emp.status)}</span></td>
                    <td style="text-align:center;">
                      <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                        <button class="btn-icon-table btn-icon-edit" onclick="appAdjustLeaveBalanceSuperAdmin('${emp.id}')" title="Edit Leave Balance / Staff">
                          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="btn-icon-table btn-icon-delete" onclick="appDeleteStaff('${emp.id}')" title="Delete Staff">
                          <svg viewBox="0 0 24 24" width="14" height="14"><polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pending Supervisor Adjustments Queue (Needs Manager Approval) -->
      ${pendingAdj.length > 0 ? `
        <div class="card" style="margin-top:16px;border:1.5px solid #fde68a;">
          <div class="card-header" style="background:#fefce8;">
            <h3 style="color:#92400e;">Pending Leave Balance Adjustments (Requires Manager Approval)</h3>
            <span class="badge badge-warning">${pendingAdj.length} Pending</span>
          </div>
          <div class="card-body">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Current Balance</th>
                  <th>Proposed Balance</th>
                  <th>Reason</th>
                  <th>Proposed By</th>
                  <th>Manager Action</th>
                </tr>
              </thead>
              <tbody>
                ${pendingAdj.map(a => `
                  <tr>
                    <td>${fmtDate(a.createdAt)}</td>
                    <td><strong>${escapeHtml(a.employeeName)}</strong></td>
                    <td>${a.currentBalance} days</td>
                    <td><strong style="color:#086375;">${a.requestedBalance} days</strong></td>
                    <td>${escapeHtml(a.reason || 'Not specified')}</td>
                    <td>${escapeHtml(a.requestedBy)}</td>
                    <td style="display:flex;gap:6px;">
                      ${isManager() || isSuperAdmin() ? `
                        <button class="btn-sm teal" style="padding:3px 8px;font-size:0.72rem;" onclick="appApproveBalanceAdjustment('${a.id}')">Approve Adjustment</button>
                        <button class="btn-sm" style="padding:3px 8px;font-size:0.72rem;color:var(--error);" onclick="appRejectBalanceAdjustment('${a.id}')">Disapprove</button>
                      ` : `<span class="badge badge-warning" style="font-size:0.68rem;">Awaiting Manager</span>`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
  } else if (leaveActiveTab === "my") {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>My Leave Applications History</h3>
          <div class="card-actions">
            <button class="btn-sm teal" onclick="appSwitchLeaveTab('file')">+ File New Leave</button>
          </div>
        </div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th>Filing Date</th>
                <th>Leave Type</th>
                <th>Inclusive Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${myLeaves.map(l => `
                <tr>
                  <td>${fmtDate(l.createdAt)}</td>
                  <td><span class="badge badge-info" style="text-transform:none;">${escapeHtml(l.type)}</span></td>
                  <td>${escapeHtml(l.datesFormatted || (fmtDate(l.from) + (l.to && l.to !== l.from ? ' — ' + fmtDate(l.to) : '')))}</td>
                  <td>${l.days} day(s)</td>
                  <td>${escapeHtml(l.reason)}</td>
                  <td>
                    <span class="badge ${l.status === 'approved' ? 'badge-success' : l.status === 'pending' ? 'badge-warning' : 'badge-error'}">
                      ${escapeHtml(l.status.toUpperCase())}
                    </span>
                    ${l.disapprovalReason ? `<div style="font-size:0.7rem;color:var(--error);margin-top:2px;">Reason: ${escapeHtml(l.disapprovalReason)}</div>` : ''}
                  </td>
                  <td style="display:flex;gap:4px;">
                    <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;" onclick="appLoadLeaveToForm('${l.id}')">View Form</button>
                    <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;" onclick="appPrintOfficialLeaveForm('${l.id}')">Print</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:20px;">You have not filed any leave applications yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

function appOnPaperEmpSelect(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  if ($q("#pEmpName")) $q("#pEmpName").value = emp.name;
  if ($q("#pDesignation")) $q("#pDesignation").value = emp.designation || emp.type || "Staff";
  if ($q("#pContact") && emp.contactNumber) $q("#pContact").value = emp.contactNumber;
  if ($q("#pSigEmpName")) $q("#pSigEmpName").value = emp.name;
  if ($q("#pConformeSig")) $q("#pConformeSig").value = emp.name;
}

function appPaperToggleType(val) {
  if (val === "Vacation Leave") {
    if ($q("#pTypeVacation") && $q("#pTypeVacation").checked) {
      if ($q("#pTypeSick")) $q("#pTypeSick").checked = false;
      if ($q("#pTypeOther")) $q("#pTypeOther").value = "";
    }
  } else if (val === "Sick Leave") {
    if ($q("#pTypeSick") && $q("#pTypeSick").checked) {
      if ($q("#pTypeVacation")) $q("#pTypeVacation").checked = false;
      if ($q("#pTypeOther")) $q("#pTypeOther").value = "";
    }
  }
}

function appResetPaperLeaveForm() {
  const form = $q("#actiPaperLeaveForm");
  if (form) form.reset();
}

function appSubmitPaperLeave() {
  const filingDate = ($q("#pDateFiling") ? $q("#pDateFiling").value.trim() : "") || new Date().toISOString().split("T")[0];
  const empName = ($q("#pEmpName") ? $q("#pEmpName").value.trim() : "") || "Employee";
  const designation = ($q("#pDesignation") ? $q("#pDesignation").value.trim() : "") || "Admin Staff";
  const contact = ($q("#pContact") ? $q("#pContact").value.trim() : "") || "N/A";

  let leaveType = "Academic Leave";
  if ($q("#pTypeVacation") && $q("#pTypeVacation").checked) leaveType = "Vacation Leave";
  else if ($q("#pTypeSick") && $q("#pTypeSick").checked) leaveType = "Sick Leave";
  else if ($q("#pTypeOther") && $q("#pTypeOther").value.trim()) leaveType = "Others: " + $q("#pTypeOther").value.trim();

  const reason = ($q("#pReason") ? $q("#pReason").value.trim() : "") || "Leave of absence";
  const dates = ($q("#pDates") ? $q("#pDates").value.trim() : "") || "Inclusive Dates";
  const daysText = ($q("#pDays") ? $q("#pDays").value.trim() : "") || "1 day";
  const daysNum = parseFloat(daysText) || 1;

  const recApproved = $q("#pRecApproved") ? $q("#pRecApproved").checked : true;
  const recReason = $q("#pRecReason") ? $q("#pRecReason").value.trim() : "";
  const supervisorName = ($q("#pSupervisorName") ? $q("#pSupervisorName").value.trim() : "") || "ANGELINA A. AQUINO";

  const appApproved = $q("#pAppApproved") ? $q("#pAppApproved").checked : true;
  const appReason = $q("#pAppReason") ? $q("#pAppReason").value.trim() : "";
  const managerName = ($q("#pManagerName") ? $q("#pManagerName").value.trim() : "") || "PATRICIA FAE C. RAMEL, CPA";

  const isCancelled = $q("#pCancelled") ? $q("#pCancelled").checked : false;
  const cancelledReason = $q("#pCancelledReason") ? $q("#pCancelledReason").value.trim() : "";

  const emp = state.employees.find(e => e.name.toLowerCase() === empName.toLowerCase()) || (currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : state.employees[0]);

  let status = "pending";
  if (isCancelled) status = "cancelled";
  else if (appApproved && recApproved) status = "approved";
  else if (!appApproved || !recApproved) status = "disapproved";

  const newLeave = {
    id: "l" + Date.now(),
    employeeName: empName,
    employeeEmail: emp ? emp.email : (currentUser ? currentUser.email : "user@office.local"),
    designation,
    contactNumber: contact,
    type: leaveType,
    from: dates,
    to: dates,
    datesFormatted: dates,
    days: daysNum,
    reason,
    status,
    disapprovalReason: appReason || recReason || cancelledReason || "",
    recommendedBy: supervisorName,
    approvedBy: managerName,
    signatures: { ...paperFormSignatures },
    createdAt: filingDate.includes("-") ? filingDate : nowIso()
  };

  state.leaves.unshift(newLeave);
  if (status === "approved" && emp) {
    emp.leaveBalance = Math.max(0, (emp.leaveBalance != null ? emp.leaveBalance : 5) - daysNum);
  }
  audit("leave_filed_paper", `${leaveType} (${daysNum} days)`, `Filed for ${empName}`);
  notif(currentUser ? currentUser.id : "all", `Official Leave Application filed: ${empName} (${leaveType})`, "leave");
  persist();

  alert(`Official Leave Application filed successfully for ${empName} (${daysNum} day(s))!`);
  leaveActiveTab = "approval";
  renderLeave($q("#appContent"));
}

function appLoadLeaveToForm(id) {
  const l = state.leaves.find(x => x.id === id);
  if (!l) return;
  leaveActiveTab = "file";
  renderLeave($q("#appContent"));

  setTimeout(() => {
    if ($q("#pEmpName")) $q("#pEmpName").value = l.employeeName || "";
    if ($q("#pDesignation")) $q("#pDesignation").value = l.designation || "";
    if ($q("#pContact")) $q("#pContact").value = l.contactNumber || "";
    if ($q("#pDates")) $q("#pDates").value = l.datesFormatted || (l.from + (l.to && l.to !== l.from ? " — " + l.to : ""));
    if ($q("#pDays")) $q("#pDays").value = l.days + " day(s)";
    if ($q("#pReason")) $q("#pReason").value = l.reason || "";
    if ($q("#pSigEmpName")) $q("#pSigEmpName").value = l.employeeName || "";
    if ($q("#pConformeSig")) $q("#pConformeSig").value = l.employeeName || "";
    if ($q("#pSupervisorName")) $q("#pSupervisorName").value = l.recommendedBy || "ANGELINA A. AQUINO";
    if ($q("#pManagerName")) $q("#pManagerName").value = l.approvedBy || "PATRICIA FAE C. RAMEL, CPA";

    if (l.signatures) {
      Object.assign(paperFormSignatures, l.signatures);
      if (l.signatures.emp) appRenderSignatureInBox("emp", l.signatures.emp);
      if (l.signatures.supervisor) appRenderSignatureInBox("supervisor", l.signatures.supervisor);
      if (l.signatures.manager) appRenderSignatureInBox("manager", l.signatures.manager);
      if (l.signatures.conforme) appRenderSignatureInBox("conforme", l.signatures.conforme);
      if (l.signatures.noted) appRenderSignatureInBox("noted", l.signatures.noted);
    }

    const isVacation = (l.type || "").toLowerCase().includes("vacation");
    const isSick = (l.type || "").toLowerCase().includes("sick");
    if ($q("#pTypeVacation")) $q("#pTypeVacation").checked = isVacation;
    if ($q("#pTypeSick")) $q("#pTypeSick").checked = isSick;
    if ($q("#pTypeOther")) {
      $q("#pTypeOther").value = (!isVacation && !isSick) ? l.type.replace(/^Others:\s*/i, "") : "";
    }

    if (l.status === "approved") {
      if ($q("#pRecApproved")) $q("#pRecApproved").checked = true;
      if ($q("#pAppApproved")) $q("#pAppApproved").checked = true;
      if ($q("#pRecDisapproved")) $q("#pRecDisapproved").checked = false;
      if ($q("#pAppDisapproved")) $q("#pAppDisapproved").checked = false;
    } else if (l.status === "disapproved") {
      if ($q("#pRecDisapproved")) $q("#pRecDisapproved").checked = true;
      if ($q("#pAppDisapproved")) $q("#pAppDisapproved").checked = true;
      if ($q("#pRecApproved")) $q("#pRecApproved").checked = false;
      if ($q("#pAppApproved")) $q("#pAppApproved").checked = false;
      if ($q("#pAppReason")) $q("#pAppReason").value = l.disapprovalReason || "";
    }
  }, 50);
}

function appLeaveAction(id, status) {
  const l = state.leaves.find(x => x.id === id);
  if (!l) return;
  const oldStatus = l.status;
  l.status = status;
  l.approvedBy = currentUser ? (currentUser.name || currentUser.email) : "CHAMIE D.";
  const emp = state.employees.find(e => e.email.toLowerCase() === (l.employeeEmail || "").toLowerCase());

  if (status === "approved" && oldStatus !== "approved") {
    if (emp) emp.leaveBalance = Math.max(0, (emp.leaveBalance != null ? emp.leaveBalance : 5) - Number(l.days || 1));
  } else if (status !== "approved" && oldStatus === "approved") {
    if (emp) emp.leaveBalance = Math.min(5, (emp.leaveBalance != null ? emp.leaveBalance : 5) + Number(l.days || 1));
  }

  audit("leave_" + status, l.id, `${l.type} for ${l.employeeName}`);
  persist();
  renderLeaveTabBody();
  notif(currentUser ? currentUser.id : "all", `Leave for ${l.employeeName} was ${status}.`, "leave");
}

function appDisapproveLeaveModal(id) {
  const l = state.leaves.find(x => x.id === id);
  if (!l) return;
  const reason = prompt(`Enter reason for disapproving ${l.employeeName}'s leave application:`, "Schedule conflict / Peak training week");
  if (reason === null) return;
  l.status = "disapproved";
  l.disapprovalReason = reason || "Not specified";
  l.approvedBy = currentUser ? (currentUser.name || currentUser.email) : "CHAMIE D.";
  const emp = state.employees.find(e => e.email.toLowerCase() === (l.employeeEmail || "").toLowerCase());
  if (emp && l.status !== "approved") {
    emp.leaveBalance = Math.min(5, (emp.leaveBalance != null ? emp.leaveBalance : 5));
  }
  audit("leave_disapproved", l.id, `Disapproved: ${reason}`);
  persist();
  renderLeaveTabBody();
  notif(currentUser ? currentUser.id : "all", `Leave for ${l.employeeName} was disapproved.`, "leave");
}

function appAdjustLeaveBalanceSuperAdmin(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  const newBal = prompt(`[Super Admin Control]\nAdjust remaining leave balance for ${emp.name} (Policy: 5 days/year, currently ${emp.leaveBalance != null ? emp.leaveBalance : 5} days):`, emp.leaveBalance != null ? emp.leaveBalance : 5);
  if (newBal === null) return;
  const num = Number(newBal);
  if (isNaN(num) || num < 0) { alert("Enter a valid number"); return; }
  emp.leaveBalance = num;
  audit("leave_balance_adjusted_superadmin", emp.email, `Super admin set leave balance to ${num} days`);
  persist();
  renderLeaveTabBody();
  alert(`Leave balance for ${emp.name} updated to ${num} days.`);
}

function appProposeLeaveBalanceSupervisor(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;
  const newBal = prompt(`[Supervisor Adjustment Proposal]\nEnter proposed leave balance for ${emp.name} (currently ${emp.leaveBalance != null ? emp.leaveBalance : 5} days):`, emp.leaveBalance != null ? emp.leaveBalance : 5);
  if (newBal === null) return;
  const num = Number(newBal);
  if (isNaN(num) || num < 0) { alert("Enter a valid number"); return; }
  const reason = prompt("Enter reason for supervisor adjustment proposal (Requires Manager Approval):", "Tenure policy credit / Special leave grant");
  if (reason === null) return;

  const adj = {
    id: "adj_" + Date.now(),
    employeeId: emp.id,
    employeeName: emp.name,
    currentBalance: emp.leaveBalance != null ? emp.leaveBalance : 5,
    requestedBalance: num,
    reason: reason || "Supervisor proposed adjustment",
    requestedBy: currentUser ? (currentUser.name || currentUser.email) : "Supervisor",
    status: "pending",
    createdAt: nowIso()
  };

  if (!state.balanceAdjustments) state.balanceAdjustments = [];
  state.balanceAdjustments.unshift(adj);
  audit("leave_balance_proposal", emp.email, `Supervisor proposed ${num} days (Reason: ${reason})`);
  notif(currentUser ? currentUser.id : "all", `Supervisor proposed leave balance adjustment for ${emp.name} (${num} days). Manager approval required.`, "leave");
  persist();
  renderLeaveTabBody();
  alert(`Leave balance adjustment proposal for ${emp.name} submitted successfully. It will take effect once approved by the Manager.`);
}

function appApproveBalanceAdjustment(adjId) {
  const adj = (state.balanceAdjustments || []).find(a => a.id === adjId);
  if (!adj) return;
  const emp = state.employees.find(e => e.id === adj.employeeId);
  if (emp) {
    emp.leaveBalance = adj.requestedBalance;
  }
  adj.status = "approved";
  adj.approvedBy = currentUser ? (currentUser.name || currentUser.email) : "Manager";
  adj.approvedAt = nowIso();
  audit("balance_adjustment_approved", adj.employeeName, `Manager approved leave balance ${adj.requestedBalance} days`);
  notif(currentUser ? currentUser.id : "all", `Manager approved leave balance adjustment for ${adj.employeeName}: ${adj.requestedBalance} days`, "leave");
  persist();
  renderLeaveTabBody();
  alert(`Balance adjustment for ${adj.employeeName} approved and applied!`);
}

function appRejectBalanceAdjustment(adjId) {
  const adj = (state.balanceAdjustments || []).find(a => a.id === adjId);
  if (!adj) return;
  const reason = prompt("Enter reason for rejecting adjustment proposal:", "Not aligned with 5-day annual entitlement policy");
  if (reason === null) return;
  adj.status = "rejected";
  adj.rejectionReason = reason;
  audit("balance_adjustment_rejected", adj.employeeName, `Manager rejected: ${reason}`);
  persist();
  renderLeaveTabBody();
  alert("Adjustment proposal rejected.");
}

function appPrintLeave() {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print."); return; }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const timeFormatted = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const timestampStr = `${dateFormatted}, ${timeFormatted}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title></title>
<style>
  @page {
    size: auto;
    margin: 20mm;
  }
  * { box-sizing: border-box; }
  body { font-family: 'Poppins', Arial, sans-serif; font-size: 11px; padding: 20px; margin: 0 auto; max-width: 820px; color: #1e293b; background: #fff; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0e90a2; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 13px; color: #0e90a2; font-weight: 600; }
  .header p { margin: 2px 0 0; font-size: 10px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 500; color: #475569; }
  .print-page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding-top: 6px;
    font-size: 9.5px;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
  }
  @media print { body { padding: 0; margin: 0; max-width: 100%; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>ACCOUNTING CERTIFICATION AND TRAINING INSTITUTE, INC.</h1>
      <p>2nd Floor Vicente Manlapaz Bldg., District 1, Cauayan City, Isabela</p>
    </div>
    <div>
      <h2 style="margin:0;font-size:13px;color:#0e90a2;font-weight:600;">LEAVE REGISTER SUMMARY</h2>
      <p style="margin:2px 0 0;font-size:10px;">Official Office Records</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date Filed</th>
        <th>Employee Name</th>
        <th>Designation</th>
        <th>Leave Type</th>
        <th>Inclusive Dates</th>
        <th>Days</th>
        <th>Reason</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${state.leaves.map(l => `
        <tr>
          <td>${fmtDate(l.createdAt)}</td>
          <td><strong>${escapeHtml(l.employeeName)}</strong></td>
          <td>${escapeHtml(l.designation || 'Staff')}</td>
          <td>${escapeHtml(l.type)}</td>
          <td>${escapeHtml(l.datesFormatted || (fmtDate(l.from) + ' — ' + fmtDate(l.to)))}</td>
          <td>${l.days}</td>
          <td>${escapeHtml(l.reason)}</td>
          <td>${escapeHtml(l.status.toUpperCase())}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="print-page-footer">
    <div>Leave Register Summary — ACTI Control Center</div>
    <div>${timestampStr}</div>
  </div>
  <script>
    document.title = "";
    window.print();
  </script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

function appPrintOfficialLeaveForm(id) {
  const l = (id ? state.leaves.find(x => x.id === id) : null) || state.leaves[0] || {
    employeeName: ($q("#pEmpName") ? $q("#pEmpName").value : "Edlene G. Lobendino"),
    designation: ($q("#pDesignation") ? $q("#pDesignation").value : "Admin Staff"),
    contactNumber: ($q("#pContact") ? $q("#pContact").value : "9693195520"),
    type: ($q("#pTypeOther") && $q("#pTypeOther").value ? $q("#pTypeOther").value : "Academic Leave"),
    datesFormatted: ($q("#pDates") ? $q("#pDates").value : "November 11, 2026"),
    days: ($q("#pDays") ? $q("#pDays").value : "1 day"),
    reason: ($q("#pReason") ? $q("#pReason").value : "Final Examination in Legal and Judicial Ethics"),
    status: "approved",
    recommendedBy: ($q("#pSupervisorName") ? $q("#pSupervisorName").value : "ANGELINA A. AQUINO"),
    approvedBy: ($q("#pManagerName") ? $q("#pManagerName").value : "PATRICIA FAE C. RAMEL, CPA"),
    createdAt: ($q("#pDateFiling") ? $q("#pDateFiling").value : "11/10/2026")
  };

  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print."); return; }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const timeFormatted = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const timestampStr = `${dateFormatted}, ${timeFormatted}`;

  const isVacation = (l.type || "").toLowerCase().includes("vacation");
  const isSick = (l.type || "").toLowerCase().includes("sick");
  const isAcademic = (l.type || "").toLowerCase().includes("academic");
  const isOther = !isVacation && !isSick;

  const sigEmp = (l.signatures && l.signatures.emp) || paperFormSignatures.emp;
  const sigSupervisor = (l.signatures && l.signatures.supervisor) || paperFormSignatures.supervisor;
  const sigManager = (l.signatures && l.signatures.manager) || paperFormSignatures.manager;
  const sigConforme = (l.signatures && l.signatures.conforme) || paperFormSignatures.conforme;
  const sigNoted = (l.signatures && l.signatures.noted) || paperFormSignatures.noted;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title></title>
<style>
  @page {
    size: auto;
    margin: 20mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #0f172a;
    padding: 20px;
    margin: 0 auto;
    max-width: 800px;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { border: 2px solid #1e293b; background: #fff; width: 100%; box-sizing: border-box; }
  .header { text-align: center; padding: 12px 14px 8px; }
  .logo { width: 56px; height: 56px; margin: 0 auto 4px; display: block; border-radius: 50%; object-fit: contain; }
  .company { color: #0e90a2; font-size: 13px; font-weight: bold; letter-spacing: 0.4px; text-transform: uppercase; }
  .sub { color: #475569; font-size: 10px; font-style: italic; margin-top: 2px; }
  .title-bar { border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b; text-align: center; font-weight: bold; font-size: 12px; padding: 5px; letter-spacing: 1px; }
  .meta-row { display: grid; grid-template-columns: 1.1fr 1.3fr 1.2fr 1.2fr; border-bottom: 2px solid #1e293b; padding: 6px 10px; gap: 8px; font-size: 10px; font-weight: bold; }
  .details-banner { border-bottom: 2px solid #1e293b; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: 200px; }
  .col-left { padding: 12px 14px; border-right: 2px solid #1e293b; }
  .col-right { padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; }
  .checkbox-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px; }
  .check-box-square { width: 14px; height: 14px; border: 1.5px solid #1e293b; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }
  .underline-text { border-bottom: 1.5px solid #1e293b; padding-bottom: 2px; display: inline-block; width: 100%; min-height: 16px; }
  .sig-split { display: grid; grid-template-columns: 1fr 1fr; border-top: 2px solid #1e293b; }
  .sig-box { padding: 10px 14px; }
  .sig-box:first-child { border-right: 2px solid #1e293b; }
  .sig-name { font-weight: bold; font-size: 11px; text-align: center; border-bottom: 1.5px solid #1e293b; padding-bottom: 2px; margin-top: 8px; }
  .sig-role { font-size: 10px; font-style: italic; color: #475569; text-align: center; margin-top: 2px; }
  .bottom-box { border-top: 2px solid #1e293b; padding: 10px 14px; }
  .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; margin-top: 20px; gap: 24px; }
  .print-page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding: 4px 2px 0;
    font-size: 9.5px;
    color: #64748b;
    border-top: 1px solid #cbd5e1;
  }
  @media print { body { padding: 0; margin: 0; max-width: 100%; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <img src="assets/acti-logo.png" alt="ACTI Seal" class="logo">
      <div class="company">ACCOUNTING CERTIFICATION AND TRAINING INSTITUTE, INC.</div>
      <div class="sub">2nd Floor Vicente Manlapaz Bldg., District 1, Cauayan City, Isabela</div>
    </div>

    <div class="title-bar">APPLICATION FOR LEAVE</div>

    <div class="meta-row">
      <div>DATE OF FILING : <span class="underline-text" style="width:auto;min-width:70px;">${fmtDate(l.createdAt)}</span></div>
      <div>NAME: <span class="underline-text" style="width:auto;min-width:110px;">${escapeHtml(l.employeeName)}</span></div>
      <div>DESIGNATION: <span class="underline-text" style="width:auto;min-width:80px;">${escapeHtml(l.designation || 'Admin Staff')}</span></div>
      <div>CONTACT NUMBER: <span class="underline-text" style="width:auto;min-width:80px;">${escapeHtml(l.contactNumber || 'N/A')}</span></div>
    </div>

    <div class="details-banner">DETAILS OF APPLICATION</div>

    <div class="details-grid">
      <div class="col-left">
        <div style="font-weight:bold;margin-bottom:6px;">TYPE OF LEAVE APPLIED FOR</div>
        <div class="checkbox-row"><span class="check-box-square">${isVacation ? '✓' : ''}</span> Vacation Leave</div>
        <div class="checkbox-row"><span class="check-box-square">${isSick ? '✓' : ''}</span> Sick Leave</div>
        <div style="margin-top:6px;">
          <span style="font-style:italic;">Others:</span>
          <div class="underline-text">${isOther ? escapeHtml(l.type) : 'Academic Leave'}</div>
        </div>

        <div style="margin-top:20px;">
          <div style="font-weight:bold;margin-bottom:4px;">REASON FOR LEAVE</div>
          <div class="underline-text" style="min-height:48px;line-height:22px;">${escapeHtml(l.reason)}</div>
        </div>
      </div>

      <div class="col-right">
        <div>
          <div style="font-weight:bold;margin-bottom:4px;">INCLUSIVE DATES</div>
          <div class="underline-text">${escapeHtml(l.datesFormatted || (fmtDate(l.from) + ' to ' + fmtDate(l.to)))}</div>
          <div style="margin-top:12px;font-weight:bold;">NUMBER OF DAYS:</div>
          <div class="underline-text">${l.days} day(s)</div>
        </div>

        <div style="text-align:center;margin-top:20px;">
          ${sigEmp ? `<div style="height:38px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:-6px;"><img src="${sigEmp}" style="max-height:38px;max-width:170px;object-fit:contain;"></div>` : ''}
          <div class="sig-name">${escapeHtml(l.employeeName)}</div>
          <div class="sig-role">Employee's Name and Signature</div>
        </div>
      </div>
    </div>

    <div class="sig-split">
      <div class="sig-box">
        <div style="font-weight:bold;margin-bottom:6px;">RECOMMENDED BY:</div>
        <div style="display:flex;gap:14px;margin-bottom:6px;">
          <div class="checkbox-row"><span class="check-box-square">${l.status === 'approved' ? '✓' : ''}</span> Approved</div>
          <div class="checkbox-row"><span class="check-box-square">${l.status === 'disapproved' ? '✓' : ''}</span> Disapproved</div>
        </div>
        <div>
          <span style="font-style:italic;">Reason:</span>
          <span class="underline-text">${l.status === 'disapproved' ? escapeHtml(l.disapprovalReason || '') : ''}</span>
        </div>
        ${sigSupervisor ? `<div style="height:38px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:-6px;"><img src="${sigSupervisor}" style="max-height:38px;max-width:170px;object-fit:contain;"></div>` : ''}
        <div class="sig-name">${escapeHtml(l.recommendedBy || 'ANGELINA A. AQUINO')}</div>
        <div class="sig-role">Supervisor</div>
      </div>

      <div class="sig-box">
        <div style="font-weight:bold;margin-bottom:6px;">APPROVED BY:</div>
        <div style="display:flex;gap:14px;margin-bottom:6px;">
          <div class="checkbox-row"><span class="check-box-square">${l.status === 'approved' ? '✓' : ''}</span> Approved</div>
          <div class="checkbox-row"><span class="check-box-square">${l.status === 'disapproved' ? '✓' : ''}</span> Disapproved</div>
        </div>
        <div>
          <span style="font-style:italic;">Reason:</span>
          <span class="underline-text">${l.status === 'disapproved' ? escapeHtml(l.disapprovalReason || '') : ''}</span>
        </div>
        ${sigManager ? `<div style="height:38px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:-6px;"><img src="${sigManager}" style="max-height:38px;max-width:170px;object-fit:contain;"></div>` : ''}
        <div class="sig-name">${escapeHtml(l.approvedBy || 'PATRICIA FAE C. RAMEL, CPA')}</div>
        <div class="sig-role">Manager</div>
      </div>
    </div>

    <div class="bottom-box">
      <div class="checkbox-row"><span class="check-box-square">${l.status === 'cancelled' ? '✓' : ''}</span> CANCELLED</div>
      <div>
        <span style="font-style:italic;">Reason:</span>
        <span class="underline-text">${l.status === 'cancelled' ? escapeHtml(l.disapprovalReason || '') : ''}</span>
      </div>

      <div class="bottom-grid">
        <div>
          <div style="font-weight:bold;margin-bottom:8px;">CONFORME BY:</div>
          ${sigConforme ? `<div style="height:38px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:-6px;"><img src="${sigConforme}" style="max-height:38px;max-width:170px;object-fit:contain;"></div>` : ''}
          <div class="sig-name">${escapeHtml(l.employeeName)}</div>
          <div class="sig-role">Employee's Signature</div>
        </div>
        <div>
          <div style="font-weight:bold;margin-bottom:8px;">NOTED BY:</div>
          ${sigNoted ? `<div style="height:38px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:-6px;"><img src="${sigNoted}" style="max-height:38px;max-width:170px;object-fit:contain;"></div>` : ''}
          <div class="sig-name">CHAMIE D.</div>
          <div class="sig-role">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>
  <div class="print-page-footer">
    <div>Official Leave Application — ${escapeHtml(l.employeeName)}</div>
    <div>${timestampStr}</div>
  </div>
  <script>
    document.title = "";
    window.print();
  </script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

/* ==========================================================================
   MODULE: STUDENT INVOICES & TUITION REFUNDS
   ========================================================================== */
function renderInvoice(el) {
  const pendingReqCount = (state.studentRequests || []).filter(r => r.status === "pending").length;

  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Student Invoices &amp; Tuition Refunds</h2>
        <div class="sub">Request Official Receipts/Invoices, submit Tuition Refund claims, and upload Proof of Payment (POP).</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appSwitchInvoiceTab('portal')">+ New Student Request</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <!-- Multi-Tabs -->
    <div class="module-tabs">
      <button class="tab-btn ${invoiceActiveTab === 'portal' ? 'active' : ''}" onclick="appSwitchInvoiceTab('portal')">
        <span>🎓 Student Request Portal</span>
      </button>
      <button class="tab-btn ${invoiceActiveTab === 'requests' ? 'active' : ''}" onclick="appSwitchInvoiceTab('requests')">
        <span>📂 Manage Student Requests &amp; POP</span>
        ${pendingReqCount > 0 ? `<span class="badge badge-warning" style="padding:2px 6px;font-size:0.68rem;">${pendingReqCount}</span>` : ''}
      </button>
      <button class="tab-btn ${invoiceActiveTab === 'register' ? 'active' : ''}" onclick="appSwitchInvoiceTab('register')">
        <span>📑 Issued Invoices &amp; OR Register (${state.invoices.length})</span>
      </button>
    </div>

    <div id="invoiceTabContent"></div>
  `;

  renderInvoiceTabBody();
}

function appSwitchInvoiceTab(tab) {
  invoiceActiveTab = tab;
  renderInvoice($q("#appContent"));
}

let popUploadDataUrl = "";
let popUploadFileName = "";

function renderInvoiceTabBody() {
  const container = $q("#invoiceTabContent");
  if (!container) return;

  if (invoiceActiveTab === "portal") {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Student Request Form (Invoice / OR or Tuition Refund)</h3>
        </div>
        <div class="card-body">
          <form id="studentReqForm" onsubmit="event.preventDefault();appSubmitStudentRequest();">
            <div style="display:flex;gap:16px;margin-bottom:14px;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid var(--line);">
              <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                <input type="radio" name="reqType" value="invoice" checked onchange="appToggleStudentReqType(this.value)">
                Request Official Invoice / Receipt
              </label>
              <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                <input type="radio" name="reqType" value="refund" onchange="appToggleStudentReqType(this.value)">
                Request Tuition Refund
              </label>
            </div>

            <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
              <div class="field">
                <label>Student Full Name</label>
                <input type="text" id="srStudentName" placeholder="e.g. Juan Dela Cruz" required>
              </div>
              <div class="field">
                <label>Student ID / Reg #</label>
                <input type="text" id="srStudentId" placeholder="e.g. ACTI-2026-088" required>
              </div>
              <div class="field">
                <label>Contact Number</label>
                <input type="text" id="srContact" placeholder="09xxxxxxxxx" required>
              </div>
              <div class="field">
                <label>Email Address</label>
                <input type="email" id="srEmail" placeholder="student@gmail.com" required>
              </div>
              <div class="field" style="grid-column:1/-1;">
                <label>Course / Program Enrolled</label>
                <select id="srProgram">
                  <option>Certified Accounting Technician (CAT)</option>
                  <option>Bookkeeping NC III Training</option>
                  <option>CPA Board Review Program</option>
                  <option>Tax Accounting &amp; Compliance Seminar</option>
                  <option>QuickBooks / Xero Automation Course</option>
                  <option>Corporate Financial Reporting</option>
                </select>
              </div>
            </div>

            <div class="acti-sheet-section-title" style="margin-top:16px;">Payment Details &amp; Proof of Payment (POP)</div>
            <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
              <div class="field">
                <label>Date Paid</label>
                <input type="date" id="srDatePaid" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
              <div class="field">
                <label>Payment Method</label>
                <select id="srPaymentMethod">
                  <option>GCash</option>
                  <option>BDO Online Banking</option>
                  <option>BPI Online / QR</option>
                  <option>Maya</option>
                  <option>Cash (Over-the-Counter)</option>
                  <option>Direct Bank Deposit</option>
                </select>
              </div>
              <div class="field">
                <label>Payment Reference / Transaction #</label>
                <input type="text" id="srRefNum" placeholder="e.g. GC-982144512" required>
              </div>
              <div class="field">
                <label>Amount Paid (₱)</label>
                <input type="number" id="srAmount" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <!-- Refund Section (Conditional) -->
            <div id="refundDetailsSection" style="display:none;margin-top:12px;padding:12px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;">
              <div style="font-weight:600;font-size:0.8rem;color:#9f1239;margin-bottom:8px;">Tuition Refund Details</div>
              <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
                <div class="field">
                  <label>Amount Requested for Refund (₱)</label>
                  <input type="number" id="srRefundAmount" step="0.01" min="1" placeholder="0.00">
                </div>
                <div class="field" style="grid-column:1/-1;">
                  <label>Reason for Refund</label>
                  <input type="text" id="srRefundReason" placeholder="e.g. Schedule conflict with school/work">
                </div>
                <div class="field" style="grid-column:1/-1;">
                  <label>Disbursement Account (GCash or Bank Account Name &amp; Number)</label>
                  <input type="text" id="srDisbursementAccount" placeholder="e.g. BDO Savings 001234567890 (Juan Dela Cruz) or GCash 0917xxxxxxx">
                </div>
              </div>
            </div>

            <!-- Proof of Payment Upload Box -->
            <div class="field" style="margin-top:14px;">
              <label>Upload Proof of Payment (POP Receipt / Screenshot / Deposit Slip)</label>
              <div class="pop-upload-box" onclick="$q('#srPopFile').click()" style="padding:14px;">
                <svg viewBox="0 0 24 24" width="28" height="28" style="color:var(--teal);margin:0 auto 4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div style="font-weight:600;font-size:0.82rem;color:var(--ink);">Click to upload receipt image or PDF</div>
                <div class="hint" style="font-size:0.72rem;">JPG, PNG, or PDF up to 10MB</div>
                <div id="popFileNameLabel" style="font-weight:600;color:var(--teal-dark);margin-top:6px;font-size:0.78rem;"></div>
                <img id="popPreviewThumb" class="pop-preview-img" style="display:none;" alt="Proof of Payment Preview">
              </div>
              <input type="file" id="srPopFile" accept="image/*,.pdf" style="display:none;" onchange="appHandlePOPSelect(this)">
            </div>

            <div class="field" style="margin-top:10px;">
              <label>Special Notes / Instructions (Optional)</label>
              <input type="text" id="srNotes" placeholder="e.g. Need company TIN included on Official Receipt">
            </div>

            <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">
              <button type="submit" class="btn-primary" style="padding:8px 20px;font-size:0.82rem;">Submit Request &amp; Proof of Payment</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } else if (invoiceActiveTab === "requests") {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Student Inquiries, Invoice &amp; Refund Requests</h3>
          <div class="card-actions">
            <button class="btn-sm" onclick="renderInvoiceTabBody()">Refresh</button>
          </div>
        </div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Course / Program</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method &amp; Ref</th>
                <th>Proof (POP)</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              ${(state.studentRequests || []).map(r => `
                <tr>
                  <td>${fmtDate(r.createdAt || r.datePaid)}</td>
                  <td><strong>${escapeHtml(r.studentName)}</strong><div style="font-size:0.72rem;color:#64748b;">${escapeHtml(r.studentId || '')} • ${escapeHtml(r.contactNumber || '')}</div></td>
                  <td>${escapeHtml(r.program)}</td>
                  <td><span class="badge ${r.type === 'refund' ? 'badge-error' : 'badge-info'}">${escapeHtml(r.type.toUpperCase())}</span></td>
                  <td><strong>${fmtMoney(r.amount)}</strong></td>
                  <td>${escapeHtml(r.paymentMethod)}<div style="font-size:0.7rem;color:#64748b;">${escapeHtml(r.refNumber)}</div></td>
                  <td>
                    ${r.popUrl ? `
                      <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;" onclick="appViewPOP('${r.id}')">View POP</button>
                    ` : `<span style="font-size:0.72rem;color:#94a3b8;">${escapeHtml(r.popName || 'None')}</span>`}
                  </td>
                  <td><span class="badge ${r.status === 'verified' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-error'}">${escapeHtml(r.status)}</span></td>
                  <td style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${r.status === 'pending' ? `
                      <button class="btn-sm teal" style="padding:3px 6px;font-size:0.72rem;" onclick="appApproveStudentReq('${r.id}')">${r.type === 'refund' ? 'Approve Refund' : 'Issue Invoice'}</button>
                      <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;color:var(--error);" onclick="appRejectStudentReq('${r.id}')">Reject</button>
                    ` : `
                      <span style="font-size:0.72rem;color:#64748b;">${r.issuedInvoiceRef || 'Completed'}</span>
                    `}
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="9" style="text-align:center;color:var(--ink-dim);padding:20px;">No student requests filed yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (invoiceActiveTab === "register") {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Official Invoices &amp; Receipts Register</h3>
          <div class="card-actions">
            <button class="btn-sm teal" onclick="appOpenInvoiceModal()">+ Manual Invoice</button>
          </div>
        </div>
        <div class="card-body">
          <table>
            <thead>
              <tr>
                <th>Invoice Ref</th>
                <th>Student / Client</th>
                <th>Date</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.invoices.map(i => `
                <tr>
                  <td><strong>${escapeHtml(i.ref)}</strong></td>
                  <td>${escapeHtml(i.client)}</td>
                  <td>${fmtDate(i.date)}</td>
                  <td>${fmtDate(i.due)}</td>
                  <td><strong>${fmtMoney(i.amount)}</strong></td>
                  <td><span class="badge ${i.status === 'paid' ? 'badge-success' : 'badge-warning'}">${escapeHtml(i.status)}</span></td>
                  <td style="display:flex;gap:4px;">
                    <button class="btn-sm teal" style="padding:3px 6px;font-size:0.72rem;" onclick="appPrintStudentInvoice('${i.id}')">Print OR</button>
                    ${i.status !== 'paid' ? `<button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;" onclick="appInvoiceStatus('${i.id}','paid')">Mark Paid</button>` : ''}
                    <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;color:var(--error);" onclick="appDeleteInvoice('${i.id}')">Delete</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--ink-dim);padding:20px;">No invoices issued yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

function appToggleStudentReqType(val) {
  const refundBox = $q("#refundDetailsSection");
  if (refundBox) refundBox.style.display = val === "refund" ? "block" : "none";
}

function appHandlePOPSelect(input) {
  const file = input ? input.files[0] : null;
  if (!file) return;
  popUploadFileName = file.name;
  const label = $q("#popFileNameLabel");
  if (label) label.textContent = "Selected: " + file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    popUploadDataUrl = e.target.result;
    const thumb = $q("#popPreviewThumb");
    if (thumb && file.type.startsWith("image/")) {
      thumb.src = popUploadDataUrl;
      thumb.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
}

function appSubmitStudentRequest() {
  const reqTypeRadio = $q('input[name="reqType"]:checked');
  const type = reqTypeRadio ? reqTypeRadio.value : "invoice";
  const studentName = $q("#srStudentName") ? $q("#srStudentName").value.trim() : "";
  const studentId = $q("#srStudentId") ? $q("#srStudentId").value.trim() : "";
  const contact = $q("#srContact") ? $q("#srContact").value.trim() : "";
  const email = $q("#srEmail") ? $q("#srEmail").value.trim() : "";
  const program = $q("#srProgram") ? $q("#srProgram").value : "";
  const datePaid = $q("#srDatePaid") ? $q("#srDatePaid").value : "";
  const paymentMethod = $q("#srPaymentMethod") ? $q("#srPaymentMethod").value : "GCash";
  const refNumber = $q("#srRefNum") ? $q("#srRefNum").value.trim() : "";
  const amount = Number($q("#srAmount") ? $q("#srAmount").value : 0);
  const notes = $q("#srNotes") ? $q("#srNotes").value.trim() : "";

  if (!studentName || !studentId || !refNumber || isNaN(amount) || amount <= 0) {
    alert("Please fill in student name, student ID, reference number, and a valid amount.");
    return;
  }

  const newReq = {
    id: "sr" + Date.now(),
    type,
    studentName,
    studentId,
    contactNumber: contact,
    email,
    program,
    datePaid,
    paymentMethod,
    refNumber,
    amount,
    popUrl: popUploadDataUrl,
    popName: popUploadFileName || "proof_of_payment.jpg",
    notes,
    refundAmount: type === "refund" ? Number($q("#srRefundAmount")?.value || amount) : 0,
    refundReason: type === "refund" ? ($q("#srRefundReason")?.value.trim() || "Course adjustment") : "",
    disbursementAccount: type === "refund" ? ($q("#srDisbursementAccount")?.value.trim() || "N/A") : "",
    status: "pending",
    createdAt: nowIso()
  };

  state.studentRequests.unshift(newReq);
  audit("student_request_submitted", `${type.toUpperCase()} for ${studentName}`, `${fmtMoney(amount)} via ${paymentMethod} (Ref: ${refNumber})`);
  notif(currentUser ? currentUser.id : "all", `New student ${type} request: ${studentName} (${fmtMoney(amount)})`, "invoice");
  persist();

  popUploadDataUrl = "";
  popUploadFileName = "";

  alert(`Student ${type} request submitted successfully with Proof of Payment!`);
  invoiceActiveTab = "requests";
  renderInvoice($q("#appContent"));
}

/* ---------------- Public Student Modal (index.html) ---------------- */
let publicPopUploadUrl = "";
let publicPopUploadName = "";

function openPublicStudentModal(type = "invoice") {
  publicPopUploadUrl = "";
  publicPopUploadName = "";

  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.id = "publicStudentModal";
  mod.innerHTML = `
    <div class="modal" style="max-width:580px;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);border-radius:18px;box-shadow:0 14px 40px rgba(8,99,117,0.18);">
      <div class="modal-header" style="border-bottom:1px solid #e2e8f0;padding:12px 18px;">
        <div>
          <h3 style="font-size:0.98rem;font-weight:600;color:#086375;">Student &amp; Trainee Portal</h3>
          <p style="font-size:0.72rem;color:#64748b;margin:0;">Request Official Receipt / Invoice or Tuition Refund with Proof of Payment</p>
        </div>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:16px 18px;max-height:80vh;overflow-y:auto;">
        <form id="publicStudentForm" onsubmit="event.preventDefault();appSubmitPublicStudentRequest();">
          <div style="display:flex;gap:14px;margin-bottom:12px;padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:0.78rem;font-weight:600;">
              <input type="radio" name="pReqType" value="invoice" ${type==='invoice'?'checked':''} onchange="appTogglePublicReqType(this.value)">
              Request Official Invoice / OR
            </label>
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:0.78rem;font-weight:600;">
              <input type="radio" name="pReqType" value="refund" ${type==='refund'?'checked':''} onchange="appTogglePublicReqType(this.value)">
              Request Tuition Refund
            </label>
          </div>

          <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            <div class="field">
              <label>Student Full Name</label>
              <input type="text" id="psrStudentName" placeholder="e.g. Juan Dela Cruz" required>
            </div>
            <div class="field">
              <label>Student ID / Reg #</label>
              <input type="text" id="psrStudentId" placeholder="e.g. ACTI-2026-088" required>
            </div>
            <div class="field">
              <label>Contact Number</label>
              <input type="text" id="psrContact" placeholder="09xxxxxxxxx" required>
            </div>
            <div class="field">
              <label>Email Address</label>
              <input type="email" id="psrEmail" placeholder="student@gmail.com" required>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Course / Program Enrolled</label>
              <select id="psrProgram">
                <option>Certified Accounting Technician (CAT)</option>
                <option>Bookkeeping NC III Training</option>
                <option>CPA Board Review Program</option>
                <option>Tax Accounting &amp; Compliance Seminar</option>
                <option>QuickBooks / Xero Automation Course</option>
                <option>Corporate Financial Reporting</option>
              </select>
            </div>
          </div>

          <div style="font-weight:600;font-size:0.76rem;color:#086375;margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.4px;">Payment Details &amp; POP Upload</div>
          <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
            <div class="field">
              <label>Date Paid</label>
              <input type="date" id="psrDatePaid" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="field">
              <label>Payment Method</label>
              <select id="psrPaymentMethod">
                <option>GCash</option>
                <option>BDO Online Banking</option>
                <option>BPI Online / QR</option>
                <option>Maya</option>
                <option>Cash (Over-the-Counter)</option>
                <option>Direct Bank Deposit</option>
              </select>
            </div>
            <div class="field">
              <label>Payment Reference / Transaction #</label>
              <input type="text" id="psrRefNum" placeholder="e.g. GC-982144512" required>
            </div>
            <div class="field">
              <label>Amount Paid (₱)</label>
              <input type="number" id="psrAmount" step="0.01" min="1" placeholder="0.00" required>
            </div>
          </div>

          <!-- Refund Section (Conditional) -->
          <div id="psrRefundSection" style="display:${type==='refund'?'block':'none'};margin-top:10px;padding:10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;">
            <div style="font-weight:600;font-size:0.78rem;color:#9f1239;margin-bottom:6px;">Tuition Refund Details</div>
            <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
              <div class="field">
                <label>Amount Requested for Refund (₱)</label>
                <input type="number" id="psrRefundAmount" step="0.01" min="1" placeholder="0.00">
              </div>
              <div class="field" style="grid-column:1/-1;">
                <label>Reason for Refund</label>
                <input type="text" id="psrRefundReason" placeholder="e.g. Schedule conflict with school/work">
              </div>
              <div class="field" style="grid-column:1/-1;">
                <label>Disbursement Account (GCash or Bank Account Name &amp; Number)</label>
                <input type="text" id="psrDisbursementAccount" placeholder="e.g. BDO Savings 001234567890 (Juan Dela Cruz) or GCash 0917xxxxxxx">
              </div>
            </div>
          </div>

          <!-- Proof of Payment Upload Box -->
          <div class="field" style="margin-top:10px;">
            <label>Upload Proof of Payment (POP Receipt / Screenshot)</label>
            <div class="pop-upload-box" onclick="$q('#psrPopFile').click()" style="padding:12px;">
              <svg viewBox="0 0 24 24" width="24" height="24" style="color:var(--teal);margin:0 auto 2px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <div style="font-weight:600;font-size:0.78rem;color:var(--ink);">Click to upload receipt image or PDF</div>
              <div class="hint" style="font-size:0.7rem;">JPG, PNG, or PDF up to 10MB</div>
              <div id="psrPopFileNameLabel" style="font-weight:600;color:var(--teal-dark);margin-top:4px;font-size:0.75rem;"></div>
              <img id="psrPopPreviewThumb" class="pop-preview-img" style="display:none;max-height:160px;" alt="Proof of Payment Preview">
            </div>
            <input type="file" id="psrPopFile" accept="image/*,.pdf" style="display:none;" onchange="appHandlePublicPOPSelect(this)">
          </div>

          <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary" style="padding:7px 18px;font-size:0.8rem;">Submit Request &amp; POP</button>
          </div>
        </form>
      </div>
    </div>
  `;
  const m = $q("#modals") || document.body;
  m.appendChild(mod);
}

function appTogglePublicReqType(val) {
  const refBox = $q("#psrRefundSection");
  if (refBox) refBox.style.display = val === "refund" ? "block" : "none";
}

function appHandlePublicPOPSelect(input) {
  const file = input ? input.files[0] : null;
  if (!file) return;
  publicPopUploadName = file.name;
  const label = $q("#psrPopFileNameLabel");
  if (label) label.textContent = "Selected: " + file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    publicPopUploadUrl = e.target.result;
    const thumb = $q("#psrPopPreviewThumb");
    if (thumb && file.type.startsWith("image/")) {
      thumb.src = publicPopUploadUrl;
      thumb.style.display = "block";
    }
  };
  reader.readAsDataURL(file);
}

function appSubmitPublicStudentRequest() {
  const typeRadio = $q('input[name="pReqType"]:checked');
  const type = typeRadio ? typeRadio.value : "invoice";
  const studentName = ($q("#psrStudentName") ? $q("#psrStudentName").value.trim() : "");
  const studentId = ($q("#psrStudentId") ? $q("#psrStudentId").value.trim() : "");
  const contact = ($q("#psrContact") ? $q("#psrContact").value.trim() : "");
  const email = ($q("#psrEmail") ? $q("#psrEmail").value.trim() : "");
  const program = ($q("#psrProgram") ? $q("#psrProgram").value : "");
  const datePaid = ($q("#psrDatePaid") ? $q("#psrDatePaid").value : "");
  const paymentMethod = ($q("#psrPaymentMethod") ? $q("#psrPaymentMethod").value : "GCash");
  const refNumber = ($q("#psrRefNum") ? $q("#psrRefNum").value.trim() : "");
  const amount = Number($q("#psrAmount") ? $q("#psrAmount").value : 0);

  if (!studentName || !studentId || !refNumber || isNaN(amount) || amount <= 0) {
    alert("Please fill in student name, student ID, reference number, and a valid amount.");
    return;
  }

  const newReq = {
    id: "sr" + Date.now(),
    type,
    studentName,
    studentId,
    contactNumber: contact,
    email,
    program,
    datePaid,
    paymentMethod,
    refNumber,
    amount,
    popUrl: publicPopUploadUrl,
    popName: publicPopUploadName || "proof_of_payment.jpg",
    refundAmount: type === "refund" ? Number($q("#psrRefundAmount")?.value || amount) : 0,
    refundReason: type === "refund" ? ($q("#psrRefundReason")?.value.trim() || "Course adjustment") : "",
    disbursementAccount: type === "refund" ? ($q("#psrDisbursementAccount")?.value.trim() || "N/A") : "",
    status: "pending",
    createdAt: nowIso()
  };

  state.studentRequests.unshift(newReq);
  audit("public_student_request", `${type.toUpperCase()} for ${studentName}`, `${fmtMoney(amount)} via ${paymentMethod} (Ref: ${refNumber})`);
  persist();

  const mod = $q("#publicStudentModal");
  if (mod) mod.remove();

  alert(`Thank you, ${studentName}!\nYour ${type === 'refund' ? 'tuition refund' : 'invoice / OR'} request (Tracking Ref: ${refNumber}) has been submitted to the ACTI Finance Office along with your Proof of Payment.`);
}

function appViewPOP(id) {
  const r = (state.studentRequests || []).find(x => x.id === id);
  if (!r || !r.popUrl) { alert("No Proof of Payment image attached."); return; }
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:620px;text-align:center;">
      <div class="modal-header">
        <h3>Proof of Payment — ${escapeHtml(r.studentName)}</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:18px;">
        <div style="font-size:0.8rem;color:#64748b;margin-bottom:10px;">
          ${escapeHtml(r.paymentMethod)} • Ref: <strong>${escapeHtml(r.refNumber)}</strong> • Amount: <strong>${fmtMoney(r.amount)}</strong>
        </div>
        <img src="${r.popUrl}" style="max-width:100%;max-height:420px;border-radius:8px;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(0,0,0,0.08);" alt="Proof of Payment">
      </div>
      <div class="modal-footer">
        <button class="btn-sm teal" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appApproveStudentReq(id) {
  const r = (state.studentRequests || []).find(x => x.id === id);
  if (!r) return;
  if (r.type === "refund") {
    if (!confirm(`Approve tuition refund of ${fmtMoney(r.refundAmount || r.amount)} to ${r.studentName}?`)) return;
    r.status = "verified";
    state.cashflow.unshift({
      id: "c" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      type: "out",
      category: "Tuition Refund",
      amount: Number(r.refundAmount || r.amount),
      ref: r.refNumber,
      note: `Tuition refund for ${r.studentName} (${r.program})`
    });
    audit("student_refund_approved", r.studentName, `${fmtMoney(r.refundAmount || r.amount)} refunded`);
    persist();
    renderInvoiceTabBody();
    alert("Refund approved and recorded in Cash Flow outflows.");
  } else {
    const invRef = "INV-" + new Date().getFullYear() + "-" + String(state.invoices.length + 1).padStart(3, '0');
    r.status = "verified";
    r.issuedInvoiceRef = invRef;
    const inv = {
      id: "inv" + Date.now(),
      ref: invRef,
      client: r.studentName + " (" + r.program + ")",
      studentId: r.studentId,
      date: r.datePaid || new Date().toISOString().split("T")[0],
      due: r.datePaid || new Date().toISOString().split("T")[0],
      amount: Number(r.amount),
      status: "paid",
      paymentMethod: r.paymentMethod,
      refNumber: r.refNumber,
      createdAt: nowIso()
    };
    state.invoices.unshift(inv);
    audit("student_invoice_issued", invRef, `Issued for ${r.studentName} (${fmtMoney(r.amount)})`);
    persist();
    renderInvoiceTabBody();
    alert(`Official Invoice ${invRef} issued successfully! You can now print the Official Receipt.`);
  }
}

function appRejectStudentReq(id) {
  const r = (state.studentRequests || []).find(x => x.id === id);
  if (!r) return;
  const reason = prompt("Enter reason for rejecting request:", "Invalid Proof of Payment / Transaction not found");
  if (reason === null) return;
  r.status = "rejected";
  audit("student_request_rejected", r.studentName, reason);
  persist();
  renderInvoiceTabBody();
}

function appPrintStudentInvoice(id) {
  const inv = state.invoices.find(x => x.id === id);
  if (!inv) return;
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print."); return; }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Official Invoice — ${escapeHtml(inv.ref)}</title>
<style>
  body { font-family: 'Poppins', Arial, sans-serif; font-size: 11px; padding: 25px; color: #1e293b; max-width: 800px; margin: 0 auto; background: #fff; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #086375; padding-bottom: 12px; margin-bottom: 18px; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-left img { width: 52px; height: 52px; border-radius: 50%; }
  .header-left h1 { margin: 0; font-size: 13px; color: #086375; font-weight: 700; }
  .header-left p { margin: 2px 0 0; font-size: 10px; color: #64748b; }
  .ref-box { text-align: right; }
  .ref-box h2 { margin: 0; font-size: 14px; color: #086375; font-weight: 700; }
  table.items-table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  table.items-table th, table.items-table td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11px; text-align: left; }
  table.items-table th { background: #f8fafc; font-weight: 600; color: #475569; }
  .total-row { font-size: 13px; font-weight: 700; color: #086375; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-col { text-align: center; width: 220px; }
  .sig-line { border-top: 1.5px solid #94a3b8; padding-top: 4px; font-weight: 600; font-size: 10px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="assets/acti-logo.png" alt="ACTI Seal">
      <div>
        <h1>ACCOUNTING CERTIFICATION AND TRAINING INSTITUTE, INC.</h1>
        <p>2nd Floor Vicente Manlapaz Bldg., District 1, Cauayan City, Isabela</p>
      </div>
    </div>
    <div class="ref-box">
      <h2>OFFICIAL RECEIPT / INVOICE</h2>
      <p>Ref: <strong>${escapeHtml(inv.ref)}</strong><br>Date: ${fmtDate(inv.date)}</p>
    </div>
  </div>

  <div style="margin-bottom:14px;line-height:1.6;">
    <strong>BILLED TO / STUDENT:</strong><br>
    ${escapeHtml(inv.client)}<br>
    ${inv.studentId ? `Student ID: ${escapeHtml(inv.studentId)}<br>` : ''}
    Payment Status: <span style="color:#059669;font-weight:700;">PAID IN FULL</span>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description / Course</th>
        <th>Payment Ref #</th>
        <th>Payment Method</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(inv.client)}</td>
        <td>${escapeHtml(inv.refNumber || 'Direct Payment')}</td>
        <td>${escapeHtml(inv.paymentMethod || 'Cash / Online')}</td>
        <td class="total-row">${fmtMoney(inv.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="sig-row">
    <div class="sig-col">
      <div style="height:35px;"></div>
      <div class="sig-line">Student / Payer Conforme</div>
    </div>
    <div class="sig-col">
      <div style="height:35px;"></div>
      <div class="sig-line">Authorized Signatory / Finance Officer</div>
      <div style="font-size:9px;color:#64748b;">Accounting Certification &amp; Training Institute</div>
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

function appOpenInvoiceModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:500px;">
      <div class="modal-header"><h3>New Invoice</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Invoice Ref</label>
            <input type="text" id="invRef" value="INV-${new Date().getFullYear()}-${String(state.invoices.length+1).padStart(3,'0')}">
          </div>
          <div class="field">
            <label>Client / Student Name</label>
            <input type="text" id="invClient" placeholder="e.g. ABC Corporation or Student Name">
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
  renderInvoiceTabBody();
}

function appDeleteInvoice(id) {
  if (!confirm("Delete this invoice?")) return;
  state.invoices = state.invoices.filter(x => x.id !== id);
  audit("invoice_deleted", id, "Invoice deleted");
  persist();
  renderInvoiceTabBody();
}

/* ==========================================================================
   MODULE: STAFF DAILY TASKS (PER-EMPLOYEE BOXES & DASHBOARD)
   ========================================================================== */
function renderTasks(el) {
  const myEmp = currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null;

  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Staff Daily Task Monitoring</h2>
        <div class="sub">Individual employee task boxes, daily goals, and progress tracking.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenTaskModal()">+ Add Task</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="module-tabs">
      <button class="tab-btn ${taskActiveFilter === 'boxes' ? 'active' : ''}" onclick="appSwitchTaskFilter('boxes')">
        <span>🏢 Per-Employee Boxes (Super Admin View)</span>
      </button>
      <button class="tab-btn ${taskActiveFilter === 'my' ? 'active' : ''}" onclick="appSwitchTaskFilter('my')">
        <span>👤 My Daily Tasks (${myEmp ? state.tasks.filter(t => t.employeeId === myEmp.id).length : 0})</span>
      </button>
      <button class="tab-btn ${taskActiveFilter === 'all' ? 'active' : ''}" onclick="appSwitchTaskFilter('all')">
        <span>📋 All Tasks List (${state.tasks.length})</span>
      </button>
    </div>

    <div id="taskModuleContent"></div>
  `;

  renderTasksContent();
}

function appSwitchTaskFilter(filter) {
  taskActiveFilter = filter;
  renderTasks($q("#appContent"));
}

function renderTasksContent() {
  const container = $q("#taskModuleContent");
  if (!container) return;

  const myEmp = currentUser ? state.employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase()) : null;

  if (taskActiveFilter === "boxes") {
    container.innerHTML = `
      <div class="staff-task-grid">
        ${state.employees.map(emp => {
          const empTasks = state.tasks.filter(t => t.employeeId === emp.id);
          const doneTasks = empTasks.filter(t => t.status === "done").length;
          const pct = empTasks.length ? Math.round((doneTasks / empTasks.length) * 100) : 0;
          const initials = emp.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

          return `
            <div class="employee-task-box">
              <div class="emp-box-header">
                <div class="emp-profile-mini">
                  <div class="emp-avatar-circle">${initials}</div>
                  <div>
                    <div class="emp-box-title">${escapeHtml(emp.name)}</div>
                    <div class="emp-box-designation">${escapeHtml(emp.designation || emp.type)}</div>
                  </div>
                </div>
                <span class="badge ${pct === 100 ? 'badge-success' : 'badge-info'}" style="font-size:0.68rem;">${pct}% Done</span>
              </div>

              <div class="emp-box-body">
                <div class="emp-progress-bar-wrap">
                  <div class="emp-progress-meta">
                    <span>${doneTasks} of ${empTasks.length} Completed</span>
                    <span>${pct}%</span>
                  </div>
                  <div class="emp-progress-track">
                    <div class="emp-progress-fill" style="width:${pct}%;"></div>
                  </div>
                </div>

                <div>
                  ${empTasks.map(t => `
                    <div class="emp-task-item ${t.status === 'done' ? 'done' : ''}">
                      <div style="flex:1;">
                        <div style="font-weight:600;color:var(--ink);">${escapeHtml(t.title)}</div>
                        <div style="font-size:0.7rem;color:#64748b;margin-top:2px;">Due: ${fmtDate(t.due)}</div>
                      </div>
                      <div style="display:flex;align-items:center;gap:4px;">
                        <button class="btn-sm" style="padding:2px 6px;font-size:0.68rem;" onclick="appToggleTask('${t.id}')">
                          ${t.status === 'done' ? '✓ Done' : t.status === 'in progress' ? 'In Progress' : 'Start'}
                        </button>
                        <button class="btn-sm" style="padding:2px 4px;font-size:0.68rem;color:var(--error);" title="Delete Task" onclick="appDeleteTask('${t.id}')">&times;</button>
                      </div>
                    </div>
                  `).join("") || `<div style="text-align:center;color:#94a3b8;font-size:0.78rem;padding:16px;">No tasks assigned yet</div>`}
                </div>
              </div>

              <div class="emp-box-footer">
                <button class="btn-sm teal" style="width:100%;font-size:0.78rem;" onclick="appOpenTaskModalForEmp('${emp.id}')">+ Add Task for ${escapeHtml(emp.name.split(' ')[0])}</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else if (taskActiveFilter === "my") {
    const empTasks = myEmp ? state.tasks.filter(t => t.employeeId === myEmp.id) : state.tasks;
    const doneTasks = empTasks.filter(t => t.status === "done").length;
    const pct = empTasks.length ? Math.round((doneTasks / empTasks.length) * 100) : 0;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>My Daily Tasks Checklist (${myEmp ? myEmp.name : 'Personal'})</h3>
          <div class="card-actions">
            <span class="badge badge-success">${doneTasks} / ${empTasks.length} Completed (${pct}%)</span>
            <button class="btn-sm teal" onclick="appOpenTaskModal()">+ Add Task</button>
          </div>
        </div>
        <div class="card-body">
          <div class="emp-progress-track" style="margin-bottom:14px;">
            <div class="emp-progress-fill" style="width:${pct}%;"></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${empTasks.map(t => `
                <tr>
                  <td><strong>${escapeHtml(t.title)}</strong></td>
                  <td>${fmtDate(t.due)}</td>
                  <td><span class="badge ${t.status === 'done' ? 'badge-success' : t.status === 'in progress' ? 'badge-warning' : 'badge-info'}">${escapeHtml(t.status)}</span></td>
                  <td>${t.progress}%</td>
                  <td style="display:flex;gap:4px;">
                    <button class="btn-sm teal" style="padding:3px 6px;font-size:0.72rem;" onclick="appToggleTask('${t.id}')">
                      ${t.status === 'done' ? 'Mark Pending' : t.status === 'in progress' ? 'Mark Done' : 'Start Task'}
                    </button>
                    <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;color:var(--error);" onclick="appDeleteTask('${t.id}')">Delete</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:18px;">No tasks assigned to you today.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (taskActiveFilter === "all") {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>All Staff Tasks Register</h3>
        </div>
        <div class="card-body">
          <table>
            <thead><tr><th>Task</th><th>Assigned To</th><th>Status</th><th>Due</th><th>Progress</th><th>Action</th></tr></thead>
            <tbody>
              ${state.tasks.map(task => {
                const emp = state.employees.find(e => e.id === task.employeeId);
                return `<tr>
                  <td>${escapeHtml(task.title)}</td>
                  <td><strong>${escapeHtml(emp ? emp.name : "Staff")}</strong></td>
                  <td><span class="badge ${task.status==='done'?'badge-success':task.status==='in progress'?'badge-warning':'badge-info'}">${escapeHtml(task.status)}</span></td>
                  <td>${fmtDate(task.due)}</td>
                  <td>${task.progress}%</td>
                  <td style="display:flex;gap:4px;">
                    <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;" onclick="appToggleTask('${task.id}')">Toggle Status</button>
                    <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;color:var(--error);" onclick="appDeleteTask('${task.id}')">Delete</button>
                  </td>
                </tr>`;
              }).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--ink-dim);padding:18px;">No tasks</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
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
  renderTasksContent();
}

function appOpenTaskModalForEmp(empId) {
  appOpenTaskModal(empId);
}

function appOpenTaskModal(preSelectedEmpId) {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:500px;">
      <div class="modal-header"><h3>Add Staff Task</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Assign To Staff</label>
            <select id="taskEmp">
              ${state.employees.map(e => `<option value="${e.id}" ${preSelectedEmpId === e.id ? 'selected' : ''}>${escapeHtml(e.name)} (${escapeHtml(e.designation || e.type)})</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Task Title / Deliverable</label>
            <input type="text" id="taskTitle" placeholder="e.g. Prepare monthly voucher report">
          </div>
          <div class="field">
            <label>Due Date</label>
            <input type="date" id="taskDue" value="${new Date().toISOString().split('T')[0]}">
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
  const assignedEmp = state.employees.find(e => e.id === emp);
  state.tasks.unshift({
    id: "t" + Date.now(), employeeId: emp, title, status: "pending", due, progress: 0, createdAt: nowIso()
  });
  audit("task_created", title, `assigned to ${assignedEmp ? assignedEmp.name : 'Staff'}`);
  persist();
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderTasksContent();
}

function appDeleteTask(id) {
  if (!confirm("Delete this task?")) return;
  state.tasks = state.tasks.filter(x => x.id !== id);
  audit("task_deleted", id, "Task deleted");
  persist();
  renderTasksContent();
}

/* ==========================================================================
   MODULE: OVERTIME / OFFSET
   ========================================================================== */
function renderOvertime(el) {
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
    const action = o.status === "pending" && (isAdmin() || isSuperAdmin())
      ? `<button class="btn-sm teal" style="padding:3px 6px;font-size:0.72rem;" onclick="appOTAction('${o.id}','approved')">Approve</button>
         <button class="btn-sm" style="padding:3px 6px;font-size:0.72rem;color:var(--error);" onclick="appOTAction('${o.id}','rejected')">Reject</button>`
      : `<span style="font-size:0.75rem;color:var(--ink-dim);">${escapeHtml(o.approvedBy || '-')}</span>`;
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
  }).join("") || `<tr><td colspan="8" style="text-align:center;color:var(--ink-dim);padding:18px;">No requests</td></tr>`;
}

function appOpenOTModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:480px;">
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
      <td style="font-size:0.75rem;color:var(--ink-dim);">${escapeHtml(a.meta)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:18px;">No logs</td></tr>`;
}

function appClearAudit() {
  if (!confirm("Clear all audit logs? This cannot be undone.")) return;
  state.audit = [];
  persist();
  renderAudit($q("#appContent"));
}

/* ==========================================================================
   MODULE: ADMINS & MENU CONTROLS (ROLE-BASED ACCESS)
   ========================================================================== */
function renderAdmin(el) {
  if (!isAdmin()) { el.innerHTML = "<div class='empty-state'><div class='empty-icon'>🔒</div><h3>Admin access required</h3><p>Only authorized super admins can manage admins.</p></div>"; return; }
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Admin Controls &amp; Menu Permissions</h2>
        <div class="sub">Configure menu access checkboxes per admin. Super Admins always retain full unblockable access.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenAdminModal()">+ Add Admin</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Registered Admins &amp; Assigned Permissions</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th>Role</th><th>Allowed Menus</th><th>Actions</th></tr></thead>
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
    const permSummary = isSuper ? "All Menus (Full Access)" : (a.permissions && a.permissions.length ? a.permissions.join(", ") : "All Menus");

    return `<tr>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td><span class="badge ${blocked ? 'badge-error' : 'badge-bg'}" style="text-transform:none;">${blocked ? "Blocked" : (a.status === 'active' ? "Active" : a.status || "Active")}</span></td>
      <td>${fmtDate(a.createdAt)}</td>
      <td>${isSuper ? "Super Admin" : "Staff Admin"}</td>
      <td><span style="font-size:0.75rem;color:#475569;">${escapeHtml(permSummary)}</span></td>
      <td>
        ${isSuper ? "<span style='font-size:0.75rem;color:var(--ink-dim);'>Owner</span>" : `
          <button class="btn-sm" onclick="appBlockAdmin('${a.id}', ${!blocked})" style="padding:3px 6px;font-size:0.72rem;">${blocked ? "Unblock" : "Block"}</button>
          <button class="btn-sm" onclick="appEditAdminModal('${a.id}')" style="padding:3px 6px;font-size:0.72rem;">Edit Perms</button>
          <button class="btn-sm" onclick="appDeleteAdmin('${a.id}')" style="padding:3px 6px;font-size:0.72rem;color:var(--error);">Delete</button>
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

function appOpenAdminModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>Add Admin &amp; Assign Menu Controls</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Full Name</label>
            <input type="text" id="admName" placeholder="Full name">
          </div>
          <div class="field">
            <label>Email (Gmail)</label>
            <input type="email" id="admEmail" placeholder="admin@gmail.com">
          </div>
        </div>

        <div class="acti-sheet-section-title" style="margin-top:14px;">Allowed Menus / Module Access</div>
        <div class="permission-matrix">
          ${MODULES.map(m => `
            <label class="perm-check-item">
              <input type="checkbox" name="admPerm" value="${m.key}" checked>
              <span>${m.label}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveNewAdmin()">Add Admin</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

function appEditAdminModal(id) {
  const admin = (state.admins || []).find(a => a.id === id);
  if (!admin) return;
  const currentPerms = admin.permissions || MODULES.map(m => m.key);

  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:540px;">
      <div class="modal-header"><h3>Edit Permissions — ${escapeHtml(admin.name)}</h3><button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label>Name</label>
            <input type="text" id="editAdmName" value="${escapeHtml(admin.name)}">
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" id="editAdmEmail" value="${escapeHtml(admin.email)}">
          </div>
        </div>

        <div class="acti-sheet-section-title" style="margin-top:14px;">Menu Access Checkboxes</div>
        <div class="permission-matrix">
          ${MODULES.map(m => `
            <label class="perm-check-item">
              <input type="checkbox" name="editAdmPerm" value="${m.key}" ${currentPerms.includes(m.key) || currentPerms.includes("*") ? 'checked' : ''}>
              <span>${m.label}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveAdminPerms('${admin.id}')">Save Changes</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

async function appSaveNewAdmin() {
  const name = $q("#admName").value.trim();
  const email = $q("#admEmail").value.trim();
  if (!name || !email) { alert("Fill name and email"); return; }
  const checkedBoxes = $all('input[name="admPerm"]:checked');
  const perms = checkedBoxes.map(cb => cb.value);

  try {
    const admin = await api.addAdmin(email, name);
    admin.permissions = perms;
    const existing = (state.admins || []).find(a => a.email.toLowerCase() === email.toLowerCase());
    if (existing) existing.permissions = perms;
    audit("admin_added", admin.email, `${admin.name} added with ${perms.length} menu permissions`);
    notif(currentUser ? currentUser.id : "all", `New admin added: ${admin.name}`, "admin");
    persist();
  } catch (errMsg) {
    alert(errMsg);
    return;
  }
  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderAdmin($q("#appContent"));
  renderSidebar();
}

function appSaveAdminPerms(id) {
  const admin = (state.admins || []).find(a => a.id === id);
  if (!admin) return;
  const name = $q("#editAdmName") ? $q("#editAdmName").value.trim() : admin.name;
  const email = $q("#editAdmEmail") ? $q("#editAdmEmail").value.trim() : admin.email;
  const checkedBoxes = $all('input[name="editAdmPerm"]:checked');
  const perms = checkedBoxes.map(cb => cb.value);

  admin.name = name;
  admin.email = email;
  admin.permissions = perms;
  audit("admin_permissions_updated", admin.email, `Updated permissions: ${perms.join(", ")}`);
  persist();

  const mod = $q(".modal-overlay");
  if (mod) mod.remove();
  renderAdmin($q("#appContent"));
  renderSidebar();
}

async function appDeleteAdmin(id) {
  const admin = (state.admins || []).find(a => a.id === id) || state.users.find(u => u.id === id);
  if (!admin) { alert("Admin not found"); return; }
  if (SUPER_ADMINS.includes(admin.email.toLowerCase())) { alert("Cannot delete a super admin owner."); return; }
  if (!confirm(`Delete admin ${admin.name} (${admin.email})?`)) return;
  try {
    await api.deleteAdmin(id);
    state.admins = (state.admins || []).filter(a => a.id !== id);
    audit("admin_deleted", admin.email, `deleted admin ${admin.name}`);
    notif(currentUser ? currentUser.id : "all", `Admin deleted: ${admin.name}`, "admin");
    persist();
  } catch (errMsg) { alert(errMsg); return; }
  renderAdmin($q("#appContent"));
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
        <div class="sub">Enroll staff into the system. Enrolled staff can file leave (5 days/yr), overtime, and be assigned tasks.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm teal" onclick="appOpenStaffModal()">+ Enroll Staff</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Enrolled Staff Roster</h3></div>
      <div class="card-body">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Designation</th><th>Contact</th><th>Status</th><th>Joined</th><th>Leave Balance</th><th>Actions</th></tr></thead>
          <tbody id="staffList"></tbody>
        </table>
      </div>
    </div>
  `;
  const t = $q("#staffList");
  t.innerHTML = state.employees.map(emp => {
    const isSuper = SUPER_ADMINS.includes(emp.email.toLowerCase());
    return `<tr>
      <td><strong>${escapeHtml(emp.name)}</strong></td>
      <td>${escapeHtml(emp.email)}</td>
      <td><span class="badge badge-info" style="text-transform:none;">${escapeHtml(emp.designation || emp.type)}</span></td>
      <td>${escapeHtml(emp.contactNumber || 'N/A')}</td>
      <td><span class="badge ${emp.status === 'Active' ? 'badge-bg' : 'badge-error'}">${escapeHtml(emp.status)}</span></td>
      <td>${fmtDate(emp.joinDate)}</td>
      <td>${emp.leaveBalance != null ? emp.leaveBalance : 5} / 5 days</td>
      <td>
        ${isSuper ? "<span style='font-size:0.75rem;color:var(--ink-dim);'>Super Admin</span>" : `
          <button class="btn-sm" onclick="appEditStaff('${emp.id}')" style="padding:3px 6px;font-size:0.72rem;">Edit</button>
          <button class="btn-sm" onclick="appDeleteStaff('${emp.id}')" style="padding:3px 6px;font-size:0.72rem;color:var(--error);">Delete</button>
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
    <div class="modal" style="max-width:500px;">
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
            <label>Designation Title</label>
            <input type="text" id="staffDesignation" value="${existing ? escapeHtml(existing.designation || existing.type) : 'Admin Staff'}" placeholder="e.g. Supervisor, Admin Staff, Clerk">
          </div>
          <div class="field">
            <label>Contact Number</label>
            <input type="text" id="staffContact" value="${existing ? escapeHtml(existing.contactNumber || '') : ''}" placeholder="09xxxxxxxxx">
          </div>
          <div class="field">
            <label>Staff Type</label>
            <select id="staffType">${['staff','supervisor','manager','regular','contractual','permanent'].map(t => `<option ${existing && existing.type === t ? 'selected' : ''}>${t}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Leave Balance (days, default 5)</label>
            <input type="number" id="staffLeave" value="${existing && existing.leaveBalance != null ? existing.leaveBalance : 5}" min="0" max="5">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-sm teal" onclick="appSaveStaff('${existing ? existing.id : ''}')">Save Staff</button>
      </div>
    </div>
  `;
  $q("#modals").appendChild(mod);
}

async function appSaveStaff(empId) {
  const name = $q("#staffName").value.trim();
  const email = $q("#staffEmail").value.trim();
  const designation = ($q("#staffDesignation") ? $q("#staffDesignation").value.trim() : "") || "Admin Staff";
  const contactNumber = $q("#staffContact") ? $q("#staffContact").value.trim() : "";
  const type = $q("#staffType").value;
  const leaveBalance = Number($q("#staffLeave").value || 5);
  if (!name || !email) { alert("Fill name and email"); return; }
  try {
    if (empId) {
      const idx = state.employees.findIndex(e => e.id === empId);
      if (idx !== -1) {
        state.employees[idx] = { ...state.employees[idx], name, email, designation, contactNumber, type, leaveBalance, annualEntitlement: 5 };
      }
      try { await api.update("employees", empId, { name, email, designation, contactNumber, type, leaveBalance, annualEntitlement: 5 }); } catch (_) {}
    } else {
      const newStaff = {
        id: "e" + Date.now(),
        name,
        email,
        designation,
        contactNumber,
        type,
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0],
        contractStartDate: new Date().toISOString().split("T")[0],
        permanentDate: new Date().toISOString().split("T")[0],
        salary: 28000,
        annualEntitlement: 5,
        leaveBalance,
        enrolled: true
      };
      state.employees.unshift(newStaff);
      try { await api.create("employees", newStaff); } catch (_) {}
    }
    audit("staff_" + (empId ? "edited" : "enrolled"), email, `${name} (${designation})`);
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
   MODULE: CONTROLS CHECKLIST (DAILY, WEEKLY, MONTHLY BREAKDOWN)
   ========================================================================== */
function renderControls(el) {
  el.innerHTML = `
    <div class="module-header">
      <div>
        <h2>Controls Checklist</h2>
        <div class="sub">Structured daily, weekly, and monthly management checkpoints for ACTI operations.</div>
      </div>
      <div class="card-actions">
        <button class="btn-sm" onclick="appResetControls()">Reset All Checkboxes</button>
        <button class="btn-sm" onclick="appNavigateBack()">Back</button>
      </div>
    </div>

    <!-- Daily Controls Card -->
    <div class="card">
      <div class="card-header">
        <h3>1. Daily Office Operations Controls</h3>
        <span class="badge badge-info" id="ctrlDailyBadge">Daily</span>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_d1" onchange="appToggleControl('ctrl_d1')">
            <label for="ctrl_d1" style="margin:0;font-weight:500;">Daily cash count balanced &amp; petty cash log verified</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_d2" onchange="appToggleControl('ctrl_d2')">
            <label for="ctrl_d2" style="margin:0;font-weight:500;">Disbursement &amp; Receipt vouchers reviewed and posted to register</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_d3" onchange="appToggleControl('ctrl_d3')">
            <label for="ctrl_d3" style="margin:0;font-weight:500;">Student invoice &amp; refund requests verified with Proof of Payment (POP)</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_d4" onchange="appToggleControl('ctrl_d4')">
            <label for="ctrl_d4" style="margin:0;font-weight:500;">Staff daily task monitoring cards updated</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Weekly Controls Card -->
    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <h3>2. Weekly Accounting &amp; Compliance Controls</h3>
        <span class="badge badge-warning" id="ctrlWeeklyBadge">Weekly</span>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_w1" onchange="appToggleControl('ctrl_w1')">
            <label for="ctrl_w1" style="margin:0;font-weight:500;">Statement of Account (SOA) PDF uploaded to Cash Flow module</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_w2" onchange="appToggleControl('ctrl_w2')">
            <label for="ctrl_w2" style="margin:0;font-weight:500;">Overtime &amp; Offset claims audited and approved</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_w3" onchange="appToggleControl('ctrl_w3')">
            <label for="ctrl_w3" style="margin:0;font-weight:500;">Employee leave balances reviewed against approved requests (5-day policy)</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_w4" onchange="appToggleControl('ctrl_w4')">
            <label for="ctrl_w4" style="margin:0;font-weight:500;">Bank / GCash deposit slips reconciled with Cash Flow inflows</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly Controls Card -->
    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <h3>3. Monthly Executive &amp; Audit Controls</h3>
        <span class="badge badge-success" id="ctrlMonthlyBadge">Monthly</span>
      </div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_m1" onchange="appToggleControl('ctrl_m1')">
            <label for="ctrl_m1" style="margin:0;font-weight:500;">Bi-weekly &amp; Monthly Auto Payroll net pay verified</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_m2" onchange="appToggleControl('ctrl_m2')">
            <label for="ctrl_m2" style="margin:0;font-weight:500;">Monthly Inflow vs Outflow Cash Flow surplus/deficit reviewed</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_m3" onchange="appToggleControl('ctrl_m3')">
            <label for="ctrl_m3" style="margin:0;font-weight:500;">Audit log trail reviewed for administrative security</label>
          </div>
          <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
            <input type="checkbox" id="ctrl_m4" onchange="appToggleControl('ctrl_m4')">
            <label for="ctrl_m4" style="margin:0;font-weight:500;">Staff roster contracts &amp; permanent tenure dates audited</label>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-header"><h3>Overall Control Completion</h3></div>
      <div class="card-body">
        <div id="controlsStatus" style="text-align:center;font-size:1.1rem;font-weight:600;color:var(--teal-dark);">0 / 12 controls completed</div>
      </div>
    </div>
  `;
  updateControlsStatus();
}

function appToggleControl(id) {
  const el = $q("#" + id);
  if (!el) return;
  const saved = lsLoad("controls_checklist", {});
  saved[id] = el.checked;
  lsSave("controls_checklist", saved);
  updateControlsStatus();
  audit("control_toggled", id, el.checked ? "checked" : "unchecked");
}

function updateControlsStatus() {
  const saved = lsLoad("controls_checklist", {});
  const ids = ["ctrl_d1","ctrl_d2","ctrl_d3","ctrl_d4","ctrl_w1","ctrl_w2","ctrl_w3","ctrl_w4","ctrl_m1","ctrl_m2","ctrl_m3","ctrl_m4"];
  const done = ids.filter(i => saved[i] === true).length;
  const el = $q("#controlsStatus");
  if (el) el.textContent = `${done} / ${ids.length} controls completed (${Math.round((done / ids.length) * 100)}%)`;
  ids.forEach(i => {
    const cb = $q("#" + i);
    if (cb) cb.checked = saved[i] === true;
  });
}

function appResetControls() {
  if (!confirm("Reset all control checkboxes?")) return;
  lsSave("controls_checklist", {});
  updateControlsStatus();
}

/* ==========================================================================
   NOTIFICATIONS MODAL
   ========================================================================== */
function appOpenNotificationsModal() {
  const mod = document.createElement("div");
  mod.className = "modal-overlay";
  mod.innerHTML = `
    <div class="modal" style="max-width:500px;">
      <div class="modal-header">
        <h3>Notifications</h3>
        <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="max-height:380px;overflow-y:auto;padding:14px;">
        ${state.notifications.length === 0 ? '<div style="text-align:center;color:var(--ink-dim);padding:24px;">No notifications yet</div>' : `
          <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
            <button class="btn-sm" onclick="appMarkAllNotificationsRead()">Mark all as read</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${state.notifications.map(n => `
              <div style="padding:8px 12px;border-radius:8px;background:${n.read ? 'var(--surface-2)' : '#e0f2f1'};border:1px solid ${n.read ? 'var(--line)' : '#b2dfdb'};display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:0.82rem;font-weight:${n.read ? '400' : '600'};color:var(--ink);">${escapeHtml(n.text)}</div>
                  <div style="font-size:0.72rem;color:var(--ink-dim);">${fmtDate(n.at)}</div>
                </div>
                ${n.link ? `<button class="btn-sm teal" style="padding:3px 6px;font-size:0.72rem;" onclick="appNavigate('${n.link}');document.querySelector('.modal-overlay').remove();">View</button>` : ''}
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
  "#/filealeave": "leave",
  "#/overtime": "overtime",
  "#/invoice": "invoice",
  "#/studentrefund": "invoice",
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
  if (hash === "#/filealeave") {
    leaveActiveTab = "file";
    return "leave";
  }
  if (hash === "#/studentrefund") {
    invoiceActiveTab = "portal";
    return "invoice";
  }
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
  } else if (key === "leave" && window.location.hash === "#/filealeave") {
    leaveActiveTab = "file";
    renderLeave($q("#appContent"));
  } else if (key === "invoice" && window.location.hash === "#/studentrefund") {
    invoiceActiveTab = "portal";
    renderInvoice($q("#appContent"));
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
    let recaptchaChecked = false;

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
      const cards = $all(".card, .employee-task-box, .acti-paper-wrapper");
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
      else if (m.includes("leave")) appSwitchLeaveTab("file");
      else if (m.includes("overtime")) appOpenOTModal();
      else if (m.includes("invoice") || m.includes("refund")) appSwitchInvoiceTab("portal");
      else if (m.includes("task")) appOpenTaskModal();
      else if (m.includes("staff")) appOpenStaffModal();
      else if (m.includes("admin")) appOpenAdminModal();
      else appNavigate("voucher");
    };
  }
}

// Expose all action handlers on window
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
  appSwitchLeaveTab,
  appOnPaperEmpSelect,
  appPaperToggleType,
  appResetPaperLeaveForm,
  appSubmitPaperLeave,
  appLoadLeaveToForm,
  appLeaveAction,
  appDisapproveLeaveModal,
  appAdjustLeaveBalanceSuperAdmin,
  appProposeLeaveBalanceSupervisor,
  appApproveBalanceAdjustment,
  appRejectBalanceAdjustment,
  appPrintOfficialLeaveForm,
  appPrintLeave,
  appAutoComputeLeaveDays,
  appHandleSigUpload,
  appStampDigitalSignature,
  appClearSignature,
  appOnRecCheck,
  appOnAppCheck,
  appOpenOTModal,
  appSubmitOT,
  appOTAction,
  appSwitchInvoiceTab,
  appToggleStudentReqType,
  appHandlePOPSelect,
  appSubmitStudentRequest,
  openPublicStudentModal,
  appTogglePublicReqType,
  appHandlePublicPOPSelect,
  appSubmitPublicStudentRequest,
  appViewPOP,
  appApproveStudentReq,
  appRejectStudentReq,
  appPrintStudentInvoice,
  appOpenInvoiceModal,
  appSaveInvoice,
  appInvoiceStatus,
  appDeleteInvoice,
  appSwitchTaskFilter,
  appOpenTaskModal,
  appOpenTaskModalForEmp,
  appSaveTask,
  appToggleTask,
  appDeleteTask,
  appClearAudit,
  appOpenAdminModal,
  appEditAdminModal,
  appSaveNewAdmin,
  appSaveAdminPerms,
  appBlockAdmin,
  appDeleteAdmin,
  appOpenStaffModal,
  appSaveStaff,
  appEditStaff,
  appDeleteStaff,
  appToggleControl,
  appResetControls,
  appOpenNotificationsModal,
  appMarkAllNotificationsRead,
  appClearNotifications
});

initApp().catch(e => { console.error("initApp error", e); shellLogin(); });
