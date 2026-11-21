/* ==========================================================================
   CONTROL CENTER — Serverless Database Store
   Vercel-compatible: JSON file on localhost, in-memory fallback on serverless
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "db.json");

const SEED = {
  users: [
    { id: "u0", email: "actinst.admin@gmail.com", name: "ACTI Admin", role: "admin", status: "active", createdAt: new Date().toISOString() },
    { id: "u1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", status: "active", createdAt: new Date().toISOString() }
  ],
  admins: [
    { id: "a0", email: "actinst.admin@gmail.com", name: "ACTI Admin", role: "admin", status: "active", createdAt: new Date().toISOString() },
    { id: "a1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", status: "active", createdAt: new Date().toISOString() }
  ],
  // Staff / employees enrolled in the system
  // Paid leave: 5 days per year, eligible 1 year after permanent date
  // contractStartDate = start of contract; permanentDate = when became permanent (leave eligibility basis)
  employees: [
    { id: "e0", email: "actinst.admin@gmail.com", name: "ACTI Admin", type: "super_admin", status: "Active", joinDate: "2022-01-01", contractStartDate: "2022-01-01", permanentDate: "2022-01-01", salary: 50000, leaveBalance: 15, enrolled: true, leaveEntitlement: 15, leaveType: "paid" },
    { id: "e1", email: "actianj@gmail.com", name: "Angelina A. Aquino", type: "supervisor", status: "Active", joinDate: new Date().toISOString().split("T")[0], contractStartDate: new Date().toISOString().split("T")[0], permanentDate: new Date().toISOString().split("T")[0], salary: 0, leaveBalance: 14, enrolled: true, leaveEntitlement: 5, leaveType: "paid" },
    { id: "e2", email: "actitrish0303@gmail.com", name: "Danica R. Tuliao", type: "staff", status: "Active", joinDate: "2022-10-03", contractStartDate: "2022-10-03", permanentDate: "2022-10-03", salary: 0, leaveBalance: 5, enrolled: true, leaveEntitlement: 5, leaveType: "paid" },
    { id: "e3", email: "charmaine.mallillin@gmail.com", name: "Charmaine Mallillin", type: "regular", status: "Active", joinDate: "2022-10-03", contractStartDate: "2022-10-03", permanentDate: "2022-10-03", salary: 0, leaveBalance: 5, enrolled: true, leaveEntitlement: 5, leaveType: "paid" },
    { id: "e4", email: "maria@office.local", name: "Maria Santos", type: "staff", status: "Active", joinDate: "2023-01-15", contractStartDate: "2023-01-15", permanentDate: "2023-01-15", salary: 28000, leaveBalance: 14, enrolled: true, leaveEntitlement: 5, leaveType: "paid" },
    { id: "e5", email: "john@office.local", name: "John Reyes", type: "staff", status: "Active", joinDate: "2022-06-10", contractStartDate: "2022-06-10", permanentDate: "2022-06-10", salary: 32000, leaveBalance: 10, enrolled: true, leaveEntitlement: 5, leaveType: "paid" },
    { id: "e6", email: "dcchamie25@gmail.com", name: "Chamie D.", type: "super_admin", status: "Active", joinDate: "2022-01-01", contractStartDate: "2022-01-01", permanentDate: "2022-01-01", salary: 50000, leaveBalance: 15, enrolled: true, leaveEntitlement: 15, leaveType: "paid" }
  ],
  sessions: [],
  vouchers: [],
  cashflow: [],
  payroll: [],
  blogs: [],
  invoices: [],
  leaves: [],
  overtime: [],
  tasks: [],
  audit: [],
  notifications: [],
  soaUploads: [],  // Statement of Account uploads
  studentRequests: [] // Student Invoices & Refund Requests with Proof of Payment
};

let memory = null;

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) { /* fall through to memory */ }
  if (!memory) memory = clone(SEED);
  return memory;
}

function save(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    memory = data;
    return false;
  }
}

module.exports = { load, save, SEED, clone };
