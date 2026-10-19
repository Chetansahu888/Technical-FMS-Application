# Technical Help FMS

Enterprise Technical Problem and SLA Management Application for Google Sheets, FMS Trackers, Google Forms, Websites, and React Applications.

---

## 🚀 Key Features

1. **Role-Based Workflows**:
   - **Employee**: Raise tickets for self or on behalf of others, attach screenshots & PDFs, track live ticket status, view resolution remarks.
   - **IT Specialist (Bhupendra & Md Alauddin)**: View assigned tickets, start work, place on hold with mandatory reason, resume, and mark completed with mandatory solution remarks.
   - **Admin (Suresh Verma)**: Global monitoring, ticket assignment and reassignment with mandatory audit reason, operational reports, CSV exports, and master data management.

2. **Automatic Round-Robin Assignment**:
   - New tickets alternate automatically between active IT specialists.

3. **SLA & Business Day Engine**:
   - Calculates next working day planned SLA preserving the exact local hour and minute (Asia/Kolkata timezone context).
   - Sunday is non-working; Saturday is working.
   - Configurable SLA working days count in Master Settings.

4. **Status & Delay Tracking**:
   - Reconciled metrics: Total = Pending + In Progress + Hold + Completed.
   - Overdue SLA flag for tickets pending past planned completion.
   - Real-time remaining time display for pending tickets within SLA.

5. **MIS & Performance Reports**:
   - Filter by date range, date basis (Request Date, Planned Date, Actual Date), company, IT person, category, and status.
   - One-click CSV export with proper escaping of quotes, commas, and newlines.

6. **Backend Integration Boundary**:
   - Clean service architecture located in `src/services/` with a dedicated Google Sheets Apps Script adapter boundary in `src/services/googleSheetsAdapter.ts`.
   - Persists locally using browser storage with realistic seed data for immediate demonstration.

---

## 🛠️ Tech Stack

- **React 19 + TypeScript + Vite**
- **React Router v7** for single-page client routing
- **Lucide Icons** for consistent enterprise iconography
- **Vanilla CSS Design System** using custom properties tailored to `#2563EB` enterprise palette

---

## 💻 Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 👥 Demo Accounts (1-Click Switcher Available in Top Bar)

| Name | Role | Email | Company |
| :--- | :--- | :--- | :--- |
| **Suresh Verma** | System Admin | `suresh.verma@company.com` | PMMPL |
| **Bhupendra** | IT Specialist | `bhupendra.it@company.com` | PMMPL |
| **Md Alauddin** | IT Specialist | `alauddin.it@company.com` | PMMPL |
| **Rahul Sharma** | Employee | `rahul.sharma@pmmpl.com` | PMMPL |
| **Priya Patel** | Employee | `priya.patel@purab.com` | Purab |
| **Amit Gupta** | Employee | `amit.gupta@rkl.com` | RKL |

---

## 🔌 Google Sheets & Apps Script Connection Roadmap

When corporate IT provides the Google Sheet and Apps Script Web App URL:
1. Open `src/services/googleSheetsAdapter.ts`.
2. Configure `endpointUrl` with the deployed Apps Script Web App URL.
3. The existing service functions `formatPayloadForAppsScript()` and `syncToGoogleSheets()` are already pre-wired to push ticket records without changing any frontend UI code.
