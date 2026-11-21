# Control Center — Office Management System

A complete office management prototype built as a single-page HTML/CSS/JS app.
**No build step, no backend required** — runs in any browser and persists data in `localStorage`.

## Access
1. Open `index.html` — the **Interactive Lamp Login / Signup** (teal theme).
2. Sign in with the main admin email: **dcchamie25@gmail.com** (any password works in demo mode).
3. The dashboard opens with all modules in the teal sidebar.

## Main Admin
- Email: `dcchamie25@gmail.com` (seeded as the owner/admin)
- Can add other admins, view audit logs, approve leave, and manage all records.

## Modules
| Module | What it does |
|---|---|
| **Dashboard** | KPI cards (net cash flow, income, expenses, pending leave/OT, unpaid invoices), recent activity, staff tasks |
| **Auto Voucher** | Create expense/income vouchers with **auto-save draft** (details saved as you type), then post — posts also mirror to Cash Flow |
| **Cash Flow** | Money-in / money-out statement with running net |
| **Auto Payroll** | Auto-computes gross, deductions (10%), net pay for **permanent** staff |
| **Blogger** | Create/publish blog updates; **QR code** generated for every post (scan to open the post link) |
| **Leave** | Online leave filing; **leave balance tracker for permanent employees**; contractual staff file online leave only; admin approves/rejects |
| **Overtime** | OT / offset requests with hours, type, reason, status |
| **Invoices** | Create and track client invoices (paid / pending / overdue) |
| **Tasks** | Staff daily task monitoring with status and progress |
| **Audit Logs** | Every action recorded (who, what, when, target, details) |
| **Admins** | Add and manage admin users |

## Design
- **Teal color scheme** throughout (primary `#0097a7`, deep `#003b3f`), matching the `acti.ph` look.
- Login page uses a **CSS-drawn lamp** (glow + drip) like the reference image, teal sign-in button, email/password fields, "Remember me", "Forgot?", and social continue buttons.
- Responsive sidebar navigation that collapses on mobile.

## Files
- `index.html` — lamp login page
- `dashboard.html` — main app shell + all modules
- `css/style.css` — teal styles
- `js/app.js` — app logic, auth, all modules, audit log
- `js/qrcode.js` — pure-JS QR code generator (no CDN needed)

## Notes
- This is a frontend prototype. Data persists in the browser's `localStorage` (per device). For multi-user shared deployment, connect `app.js` to a real backend/API.
- Blogger QR links point to the app origin with a `?blog=<slug>` query.
