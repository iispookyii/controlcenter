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
  notifications: []
};

let memory = null;

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  // Local dev: persist to db.json
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) { /* fall through to memory */ }
  // Serverless fallback: in-memory (resets on cold start — fine for demo)
  if (!memory) memory = clone(SEED);
  return memory;
}

function save(data) {
  // Local dev: write to disk
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    // Serverless: keep in memory
    memory = data;
    return false;
  }
}

module.exports = { load, save, SEED, clone };
