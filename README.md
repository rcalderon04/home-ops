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

## Deployment (later)

When ready to deploy to a web server:

```bash
# Build the frontend
cd client && npm run build

# Set environment and run
cd ../server
NODE_ENV=production PORT=80 node index.js
```

The Express server will serve the built frontend from `client/dist/`.
