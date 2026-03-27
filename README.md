# Home Ops — Task Manager

A local-first home operations tracker built from `home_operations_tracker_v2.xlsx`.

## Stack

- **Backend**: Node.js + Express + SQLite (via `better-sqlite3`)
- **Frontend**: React 18 + Vite (no build step needed for dev)
- **Dev runner**: `concurrently` runs both servers with one command

## Quick Start

### Prerequisites
- Node.js 18+ (https://nodejs.org)

### 1. Install dependencies
```bash
cd home-ops
npm run install:all
```
This installs root, server, and client deps in one step.

### 2. Start the dev environment
```bash
npm run dev
```

This starts:
- **API server** → http://localhost:3001 (auto-seeds the SQLite DB on first run)
- **React frontend** → http://localhost:5173 (opens in browser)

The frontend proxies `/api/*` requests to the backend — no CORS issues.

---

## App Structure

### Pages
| Page | Route | Description |
|---|---|---|
| Weekly Planner | default | Week-by-week task board with status controls |
| Task Library | tasks | Browse/filter/edit all tasks |
| New Task | new-task | Create or edit a task (all fields from xlsx) |

### Weekly Planner Logic
- **Planned tasks**: anything added to the current week
- **Due this week**: tasks whose `next_due_date` falls in the week — shown as addable suggestions
- **Advance notice**: tasks with `split_into_subtasks=Yes` OR `est_minutes >= 120` whose `target_date` is within 4 weeks — shown with a ⚠ warning
- **Status flow**: Not Started → In Progress → Completed → Deferred (completing auto-logs to activity_log)
- **Subtasks**: expand inline from any task card that has subtasks

---

## Data Model

SQLite database (`server/home-ops.db`) — created automatically on first run.

| Table | Purpose |
|---|---|
| `tasks` | Master task library — all 18 seed tasks from xlsx |
| `weekly_plan_items` | Tasks assigned to a specific week |
| `subtasks` | Multi-step breakdown for complex tasks |
| `activity_log` | Auto-written when a task is completed |

---

## API Reference

### Tasks
```
GET    /api/tasks              ?active=true&category=X&search=Y
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### Weekly Planner
```
GET    /api/weekly?week=2026-03-17    Returns planned + suggestions + advance + stats
POST   /api/weekly                    Add task to week
PUT    /api/weekly/:id                Update status, day, owner, notes
DELETE /api/weekly/:id                Remove from week
```

### Subtasks
```
GET    /api/subtasks?task_id=T-007
POST   /api/subtasks
PUT    /api/subtasks/:id
DELETE /api/subtasks/:id
```

---

## Deploy To Railway

This app works well on Railway as a single Node service plus a persistent volume for SQLite.

### 1. Create the Railway service

- Create a new project from this repo
- Add a volume and mount it at `/data`
- Railway should detect the root `package.json`

### 2. Configure the service

Use these settings:

- Build command: `npm run build`
- Start command: `npm start`

Use Node 20 LTS for Railway. If Railway is defaulting to Node 22, set:

```bash
NIXPACKS_NODE_VERSION=20
```

Set these environment variables:

```bash
NODE_ENV=production
NIXPACKS_NODE_VERSION=20
AUTO_SEED=false
DATABASE_PATH=/data/home-ops.db
APP_PASSWORD=choose-a-strong-shared-password
AUTH_SECRET=generate-a-long-random-secret
```

Optional:

```bash
APP_ORIGIN=https://your-railway-domain.up.railway.app
```

`APP_PASSWORD` enables the shared login screen.

`AUTH_SECRET` is used to sign login tokens. Use a long random value in Railway.

### 3. First-time bootstrap

For a brand new Railway volume, keep normal app startup clean and run the one-time bootstrap command instead:

```bash
npm run bootstrap
```

If Railway has previously built the app with the wrong native SQLite binary, redeploy once with cache cleared after switching to Node 20.

This runs the existing seed script against the configured `DATABASE_PATH`.

Because the seed checks whether tasks already exist, it is safe to re-run and will skip if the database is already initialized.

Keep this in production:

```bash
AUTO_SEED=false
```

That way normal deploys and restarts never re-seed automatically.

### 4. How production works

- Railway runs the root build script, which builds the React app in `client/dist`
- The Express server serves both the API and the built frontend
- SQLite is stored on the mounted Railway volume via `DATABASE_PATH`

### Notes

- Without a persistent volume, SQLite data will not survive redeploys or restarts
- For two users sharing the app, this single-service SQLite setup is a good fit
