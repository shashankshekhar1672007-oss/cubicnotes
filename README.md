# 📔 CubicNotes

<p align="center">
  <img src="frontend/public/favicon.svg" alt="CubicNotes Logo" width="80" height="80" />
</p>

<h3 align="center">CubicNotes</h3>

<p align="center">
  A premium, full-featured personal knowledge base and productivity workstation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18.x+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/React-v18.x-20232a?style=flat-square&logo=react&logoColor=61dafb" alt="React" />
  <img src="https://img.shields.io/badge/Vite-v5.x-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-v4.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47a248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Flash-8e75e7?style=flat-square&logo=google-gemini&logoColor=white" alt="Gemini AI" />
</p>

---

## 🌟 Overview

**CubicNotes** is a modern personal knowledge management and productivity application. It provides users with a beautifully integrated workspace for capturing notes, structuring nested notebooks, maintaining checklist tasks, setting recurring reminders, syncing with Google Calendar, and leveraging Gemini AI assistants for content expansion, summarization, and writing.

Featuring a **Ghost Mode (Guest Flow)**, CubicNotes allows unregistered users to browse and read demo workspaces, prompting seamless inline authentication (via password or Google OAuth 2.0 with email verification) only when write actions are attempted.

---

## 🚀 Key Features

### 1. Unified Dashboard
* **Analytics Carousel**: Interactive summary cards detailing total active notes, notebooks, incomplete tasks, pending reminders, and trash counts.
* **Workspace Highlights**: Quick navigation portals, recent notes quick-access grid, and toggleable list of priority tasks.
* **Interactive Stats**: Visually responsive counters and quick action shortcuts.

### 2. Multi-Tiered Authentication & Guest Flow
* **JWT Session Guarding**: Secure JSON Web Token authentication with password hashing (bcrypt) and automatic background token validation.
* **Google OAuth 2.0 Integration**: Native authentication using Google Client SDK for one-click log-ins.
* **Email Verification (OTP)**: Multi-step registration flow sending 6-digit verification codes using `nodemailer` to secure user accounts.
* **Ghost Mode (Guest Gating)**: Read-only access to all features (Notes, Notebooks, Tasks, Reminders). Intercepts write actions seamlessly via a custom `<GhostLoginModal />` to register or log in, retaining the guest's context.

### 3. Notebooks & Advanced Document Editor
* **Nested Folders**: Categorize notes inside notebooks with support for parent-child folder structures.
* **Tiptap WYSIWYG Editor**: Advanced block-based rich text editor featuring inline formatting toolbar (font family, font size, line height, colors, highlights, headings, lists, quotes, tables, alignment, subscript, and superscript).
* **Slash Commands (/) Menu**: Trigger block inserts on-the-fly (e.g., `/h1` for Heading 1, `/bullet` for list, `/table` for grids).

### 4. Lightweight Markdown Notes
* **Quick Notes Grid**: Cards utilizing a color-mix accent engine (`--card-accent`) to display custom border highlights.
* **Markdown Support**: Built-in lightweight renderer allowing write/preview transitions.
* **Global Selection Support**: Unified long-press multi-select support across mobile, tablet, and desktop viewports.
* **Batch Actions**: Multi-select notes to pin, unpin, or delete them simultaneously.
* **Pins & Tags**: Pin critical notes to the top and organize them using inline custom hashtags.

### 5. Task & Checklist Management
* **Priority Matrices**: Separate tasks by priority status (Low, Medium, High).
* **Nested Subtasks**: Create lists of subtasks that support independent completion toggling.
* **Task Filters**: Dynamically filter tasks by Priority status, All, Active, or Completed lists.

### 6. Cron-Powered Reminders & Alerts
* **Flexible Schedules**: Configure one-time reminders or recurring triggers (daily, weekly, monthly).
* **Note Linking**: Attach reminders directly to notes or notebook pages.
* **Split Timeline**: Upcoming and Past reminders groups.
* **Auto-Rolling Recurrences**: A background cron scheduler rolls repeat reminders forward automatically upon firing.

### 7. Google Calendar Sync
* **Authentication OAuth Sync**: Link your Google Calendar inside Settings.
* **Real-time Event Creation**: Creating, updating, or deleting synced reminders automatically spawns or removes matching events on your Google Calendar.
* **Secure Token Storage**: User calendar access tokens are stored in the database using custom encryption (`cryptoHelper`).

### 8. Gemini AI Writing Assistant
* **Direct Integration**: Direct client calls to Google Generative AI (Gemini 2.5 Flash model) for responsive generations.
* **Summarize Text**: Condenses highlighted text into 2-3 actionable lines.
* **Smart Completion**: Continues writing notes naturally from the user's cursor position.
* **Prompt-to-Text Generation**: Renders new paragraphs from custom instruction prompts using current text as context.
* **Hybrid Credit System**: Allocates 5 free daily AI actions reset at midnight via database crons. Users can input a personal Gemini API Key in Settings to unlock unlimited free actions.

### 9. Web Push Notifications
* **Native Browser Alerts**: Standard push notification subscriptions handled by custom service workers (`sw.js`).
* **Self-Healing Subscriptions**: Automatic pruning of expired or uninstalled subscriber endpoints from database logs.
* **Transient Keys Fallback**: Dynamically generates transient VAPID keys locally if production environment variables are missing.

### 10. Styling, Themes, & Trash Retention
* **Design System**: Harmonious color palette defined via global token sets. Supports seamless dark/light modes.
* **Soft Trash Bin**: Deleted notes and tasks reside in a recycle bin where they can be restored or purged.
* **Trash Retention Cron**: Automatic permanent purge of trash items older than a user-specified retention window (default 30 days, editable in Settings).

---

## 📁 Project Directory Structure

```
cubicnotes/
├── backend/
│   ├── config/             # DB connection, Push Notification VAPID setups
│   ├── controllers/        # Express request logic (Auth, Notes, Tasks, Reminders, AI, etc.)
│   ├── middleware/         # Auth verification guards & global error handlers
│   ├── models/             # Mongoose schemas (User, Note, Notebook, Page, Task, Reminder)
│   ├── routes/             # Router mappings mounted on server.js
│   ├── utils/              # Email, Crypto, and Google Calendar sync helpers
│   ├── workers/            # Cron jobs (creditResetCron, reminderCron, trashCleanupCron)
│   ├── .env.example
│   ├── package.json
│   └── server.js           # Server entrance point
│
└── frontend/
    ├── public/
    │   ├── sw.js           # Push Notification Service Worker
    │   └── favicon.ico
    ├── src/
    │   ├── assets/         # Images and organized CSS styling directories
    │   │   └── styles/     # base (theme, global), layouts, and components stylesheets
    │   ├── components/     # UI elements, Document (TipTap), Editor (Markdown), Layouts (Sidebar/Topbar)
    │   ├── context/        # Auth, Theme, and Ghost Gate state providers
    │   ├── hooks/          # useAuth, useDebounce, useGhostGuard
    │   ├── pages/          # App views (Dashboard, Notes, Notebooks, Tasks, Reminders, Settings, Trash)
    │   ├── services/       # api.js axios instance wrapper
    │   ├── utils/          # Formatting, tiptap-to-markdown, markdown parsers, push setups
    │   ├── App.jsx         # App router layout
    │   └── main.jsx        # Root providers bootstrapping
    ├── index.html
    ├── package.json
    └── vite.config.js      # Dev server api proxies config
```

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the `backend` and `frontend` directories using the details below:

### 1. Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_signing_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Gmail SMTP Authentication (For verification OTP delivery)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Gemini AI (System key for 5 daily free credits)
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth 2.0 Credentials (For login sync)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: Production Web Push Keys (Generates dynamically on boot if omitted)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### 2. Frontend (`frontend/.env`)
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## 💻 Installation & Execution

### Prerequisites
* **Node.js** (v18.x or higher)
* **MongoDB** (Local instance or MongoDB Atlas cluster)

### 1. Setting up the Backend
```bash
cd backend
npm install
# Populate environment variables in .env
npm run dev
```
The server will boot on `http://localhost:5000` (or `PORT`).

### 2. Setting up the Frontend
```bash
cd frontend
npm install
# Populate client ID in .env
npm run dev
```
The Vite development server will open on `http://localhost:5173` and automatically proxy `/api` requests to the backend.

---

## ⏰ Background Cron Workers

Three automated tasks run continuously in the background on the Express server:

1. **Reminder Cron (`workers/reminderCron.js`)**
   * *Schedule:* Every minute (`* * * * *`).
   * *Action:* Checks for active reminders matching the current time window, dispatches browser push notifications using `web-push`, and rolls repeating schedules forward (Daily, Weekly, Monthly).
2. **AI Daily Credit Reset (`workers/creditResetCron.js`)**
   * *Schedule:* Midnight UTC (`0 0 * * *`).
   * *Action:* Resets the system-based `aiCredits` count to `5` for all users who don't utilize a custom Gemini API key.
3. **Trash Purging Cron (`workers/trashCleanupCron.js`)**
   * *Schedule:* Daily at 1:00 AM (`0 1 * * *`).
   * *Action:* Queries user profile preferences (`trashRetentionDays`, defaults to `30`) and permanently deletes trashed notes and tasks exceeding this threshold.

---

## ⌨️ Application Keyboard Shortcuts

For authenticated users, the application registers global event listeners for these quick keys:

* **Search Overlay:**
  * Mac: <kbd>Cmd</kbd> + <kbd>K</kbd>
  * Windows/Linux: <kbd>Ctrl</kbd> + <kbd>K</kbd>
* **Quick Create Note:**
  * Mac: <kbd>Cmd</kbd> + <kbd>N</kbd>
  * Windows/Linux: <kbd>Ctrl</kbd> + <kbd>N</kbd>
* **Search Navigation:**
  * <kbd>↑</kbd> / <kbd>↓</kbd> to focus items.
  * <kbd>Enter</kbd> to open.
  * <kbd>ESC</kbd> to close.

---

## 🔗 Key API Endpoints

All endpoints except authentication require a valid header: `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Router (`/api/auth`)
* `POST /register` — Initialize email registration (sends OTP).
* `POST /verify-otp` — Verifies registration OTP, creates database profile, returns token.
* `POST /resend-otp` — Resends a verification OTP code.
* `POST /login` — Traditional password authentication.
* `POST /google` — Google OAuth payload login/signup.
* `GET /me` — Returns current logged-in profile.

### Notes Router (`/api/notes`)
* `GET /` — Fetch all notes (supports tag, pinned, search, notebook, and trash queries).
* `POST /` — Create a new note.
* `GET /activity` — Returns Note/Task creation charts for the past 6 months.
* `GET /:id` — Get note details.
* `PUT /:id` — Update note fields.
* `DELETE /:id` — Soft-deletes a note (passes `?permanent=true` to purge completely).
* `PUT /:id/restore` — Restores a soft-deleted note.

### Notebooks & Pages (`/api/notebooks`, `/api/pages`)
* `GET /api/notebooks` — Fetch all notebooks with aggregated page/note counts.
* `POST /api/notebooks` — Create a notebook.
* `DELETE /api/notebooks/:id` — Delete notebook (unlinks nested notes, deletes nested pages).
* `GET /api/pages?notebook=<id>` — Fetch pages ordered by positioning index.
* `POST /api/pages` — Add page to notebook.
* `PUT /api/pages/:id` — Update page title or ProseMirror structured JSON document body.

### Gemini AI Router (`/api/ai`)
* `POST /summarize` — Compress highlighted text content.
* `POST /complete` — Generates next words from cursor context.
* `POST /generate` — Creates text from instructions with optional context.
* `GET /settings` — Fetch remaining daily system credits.
* `PUT /settings` — Saves custom API keys (validates keys via dummy request first).
