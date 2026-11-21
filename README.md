# Control Center — Office Management System

Office management system with **backend API + database** (Vercel serverless functions), teal theme, lamp-login, and full admin controls.

## Access
1. Open `index.html` — **Lamp Login** (lamp shown first, then login card).
2. Sign in with Google: **dcchamie25@gmail.com** (only the main admin can access).
3. Dashboard opens with all modules in the teal sidebar.

## Main Admin
- Email: `dcchamie25@gmail.com` (owner — cannot be blocked or deleted)
- Can add, edit, block/unblock, and delete other admins

## Backend (Vercel Serverless)
| File | Purpose |
|------|---------|
| `api/store.js` | JSON-file database on localhost; in-memory fallback on Vercel serverless |
| `api/auth.js` | Google-only login / session / logout (main admin restricted) |
| `api/admins.js` | Admin CRUD + block/unblock |
| `api/data.js` | CRUD for vouchers, cashflow, payroll, blogs, invoices, leaves, overtime, tasks, audit |
| `vercel.json` | Routes `/api/*` to serverless functions |
| `js/apiClient.js` | API fetch client with localStorage fallback (works offline) |

## Modules
| Module | What it does |
|---|---|
| **Dashboard** | KPI cards, recent activity, staff tasks |
| **Auto Voucher** | Vouchers with auto-save draft; posts to Cash Flow |
| **Cash Flow** | Money-in / money-out statement |
| **Auto Payroll** | Auto-computes gross/deductions/net for permanent staff |
| **Blogger** | Create/update/view posts + QR code per post |
| **Leave** | Online filing + leave balance (permanent); contractual file-only; admin approve/reject |
| **Overtime** | OT / offset requests |
| **Invoices** | Create/track client invoices |
| **Tasks** | Staff daily task monitoring — **click each task to cycle Pending → In Progress → Done** |
| **Audit Logs** | Every action recorded |
| **Admins** | Add / edit / block-unblock / delete admin accounts |

## Design
- Teal color scheme (`#0097a7`, `#003b3f`)
- Login: lamp hero first, Google-only sign-in, reCAPTCHA checkbox + honeypot bot protection
- Responsive sidebar

## Deploy to Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Import GitHub repo `iispookyii/controlcenter`
3. **Important:** Set production branch to **`arena/e04d96da-controlcenter`** (not `main`)
4. Root Directory: `./` | Application Preset: `Other`
5. Deploy

The app works offline (localStorage) and syncs to the Vercel API when online.
