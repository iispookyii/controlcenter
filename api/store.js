/* ==========================================================================
   CONTROL CENTER — Serverless Database Store
   Vercel-compatible: JSON file on localhost, in-memory fallback on serverless
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "db.json");

const SEED = {
  users: [
    { id: "u1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", status: "active", createdAt: new Date().toISOString() }
  ],
  admins: [
    { id: "a1", email: "dcchamie25@gmail.com", name: "Chamie D.", role: "admin", status: "active", createdAt: new Date().toISOString() }
  ],
  // Staff / employees enrolled in the system
  employees: [
    { id: "e1", email: "actianj@gmail.com", name: "Angelina A. Aquino", type: "supervisor", status: "Active", joinDate: new Date().toISOString().split("T")[0], salary: 0, leaveBalance: 14, enrolled: true },
    { id: "e2", email: "actitrish0303@gmail.com", name: "Trisha Manager", type: "manager", status: "Active", joinDate: new Date().toISOString().split("T")[0], salary: 0, leaveBalance: 0, enrolled: true },
    { id: "e3", email: "maria@office.local", name: "Maria Santos", type: "staff", status: "Active", joinDate: "2023-01-15", salary: 28000, leaveBalance: 14, enrolled: true },
    { id: "e4", email: "john@office.local", name: "John Reyes", type: "staff", status: "Active", joinDate: "2022-06-10", salary: 32000, leaveBalance: 10, enrolled: true }
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
  soaUploads: []  // Statement of Account uploads
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
