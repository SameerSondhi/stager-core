# Stager ⚡

> **Enterprise Internal Launchpad, Contextual Command Center & Omnibox Go-Links Resolver**

Stager is a high-density, multi-tenant enterprise developer portal and contextual launchpad built with **Turborepo**, **Next.js 15 (App Router)**, **Supabase PostgreSQL**, and a **Manifest V3 Chrome Extension**.

---

## 🏗️ Architecture

```
stager-v1/
├── package.json                   # Turborepo root configuration & scripts
├── pnpm-workspace.yaml            # pnpm workspace mapping apps/* and packages/*
├── turbo.json                     # Turborepo build & dev task pipelines
├── .env.example                   # Environment variable template
│
├── packages/
│   └── database/                  # Supabase schema, migrations, seeds & TypeScript types
│       ├── migrations/
│       │   └── 001_initial_schema.sql # Tables (orgs, profiles, go_links, broadcasts, acks) + RLS
│       ├── seed.sql               # Mock organization, 5 go-links, 2 announcements
│       └── src/                   # Client helper with zero-config fallback preview
│
└── apps/
    ├── web/                       # Next.js 15 App Router Web Application
    │   ├── app/
    │   │   ├── components/        # CommandBar (Cmd+K), Broadcasts, Launchpad, MyQueue
    │   │   ├── api/v1/            # resolve (CORS enabled for omnibox), go-links, broadcasts, queue
    │   │   └── page.tsx           # High-density command center dashboard
    │   └── tailwind.config.ts     # Dark enterprise theme tokens
    │
    └── extension/                 # Manifest V3 Chrome Extension
        ├── manifest.json          # Omnibox ('go'), newtab override, sidepanel, permissions
        ├── src/
        │   ├── background.ts      # Omnibox query resolution via web API
        │   ├── newtab.ts          # New tab page redirect & launchpad
        │   └── sidepanel.ts       # Compact companion launchpad & triage queue
        ├── index.html             # New tab page UI
        ├── sidepanel.html         # Side panel UI
        └── vite.config.ts         # Vite build outputting to apps/extension/dist
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (compatible with Node 20 / 22 / 26)
- **pnpm**: `v9.0.0+`
  ```bash
  # If pnpm is not installed:
  npm install -g pnpm
  ```
- **Docker** (optional, only needed if running local Supabase via Docker)

---

### 2. Install Dependencies
```bash
pnpm install
```

---

### 3. Database Setup (Supabase Local)

Stager supports two modes:
1. **Zero-Config In-Memory Mode (Default)**: Runs out-of-the-box with pre-seeded mock data without requiring any external services or Docker.
2. **Supabase Local PostgreSQL Instance**: For full persistence and Row Level Security (RLS) enforcement.

#### Option A: Running with Supabase Local (Docker)
1. Initialize and start Supabase:
   ```bash
   npx supabase init
   npx supabase start
   ```
2. Apply the schema migration and seed data:
   ```bash
   npx supabase db execute --file packages/database/migrations/001_initial_schema.sql
   npx supabase db execute --file packages/database/seed.sql
   ```
3. Copy environment variables to `apps/web/.env.local`:
   ```bash
   cp .env.example apps/web/.env.local
   ```
   Update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the keys output by `npx supabase status`.

#### Option B: Zero-Config In-Memory Mode
No database setup is required. When `NEXT_PUBLIC_SUPABASE_URL` is omitted or left as dummy, the backend automatically initializes an in-memory reactive store pre-loaded with the exact data from `seed.sql`.

---

### 4. Run Development Servers
Start both the Next.js web application and the extension watcher concurrently via Turborepo:

```bash
pnpm dev
```

- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Extension Build**: outputs and updates continuously to `apps/extension/dist`

To build for production:
```bash
pnpm build
```

---

### 5. Load the Chrome Extension

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the directory:
   ```
   /path/to/stager-v1/apps/extension/dist
   ```
5. The **Stager - Enterprise Command Center** extension will now be active in Chrome!

---

## 💡 How to Use Stager

### 1. Browser Omnibox (Address Bar)
Type `go`, press <kbd>Space</kbd> or <kbd>Tab</kbd>, and enter any keyword:
- `go github` → opens `https://github.com/acme-corp`
- `go docs` → opens `https://docs.acme.internal`
- `go standup` → opens `https://meet.google.com/acme-standup`
- `go jira` → opens `https://acme.atlassian.net`
- `go design` → opens `https://www.figma.com/@acme`

If a keyword does not exist, Stager automatically directs you to create it.

### 2. Global Command Bar (`Cmd + K` or `Ctrl + K`)
- Press <kbd>Cmd</kbd> + <kbd>K</kbd> anywhere on the dashboard to trigger instant fuzzy search.
- Use arrow keys to navigate and press <kbd>Enter</kbd> to launch.
- If a keyword isn't found, an inline prompt lets you create `go/<keyword>` instantly.

### 3. Top Pinned Broadcasts
- Active announcements display author role, department badges, and expiration indicators.
- Click **Acknowledge** with checkmark feedback to mark the notification as read.

### 4. Personal Triage Queue ("My Queue")
- **Assigned Jira Issues**: Priority tags (P0/P1/P2) and status indicators.
- **PRs Awaiting Review**: Open duration, repo name, and author details.
- **Calendar (Next Up)**: Upcoming meetings with one-click video links.

### 5. Companion Side Panel
- Click the Stager extension icon in the Chrome toolbar to open the compact launchpad and triage panel alongside your current browsing tab.

---

## 📡 API Endpoints

All endpoints have CORS enabled for external clients and the Chrome extension:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/resolve?keyword=:key` | Resolves destination URL & increments click count |
| `GET` | `/api/v1/go-links` | Returns all go-links sorted by frequency |
| `POST` | `/api/v1/go-links` | Creates or updates a go-link (`{ keyword, target_url, description }`) |
| `GET` | `/api/v1/broadcasts` | Returns active pinned broadcasts and acknowledgment status |
| `POST` | `/api/v1/broadcasts/:id/acknowledge` | Acknowledges a broadcast for the current user |
| `GET` | `/api/v1/queue` | Fetches Jira issues, PRs awaiting review, and upcoming meetings |

---

## 🛠️ Verification & Scripts

- `pnpm dev`: Concurrently start web app and extension watch build
- `pnpm build`: Compile all packages and production artifacts
- `pnpm check-types`: Run strict TypeScript type checks across all workspaces
