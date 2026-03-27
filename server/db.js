const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'home-ops.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      parent_task_id TEXT,
      task_name TEXT NOT NULL,
      category TEXT,
      area TEXT,
      location_type TEXT,
      cadence_type TEXT,
      cadence_interval INTEGER DEFAULT 1,
      season TEXT DEFAULT 'Any',
      is_active INTEGER DEFAULT 1,
      est_minutes INTEGER,
      difficulty TEXT,
      points INTEGER,
      default_owner TEXT DEFAULT 'Either',
      tools_needed TEXT,
      products_needed TEXT,
      safety_notes TEXT,
      product_record_required TEXT DEFAULT 'No',
      split_into_subtasks TEXT DEFAULT 'No',
      target_date TEXT,
      last_completed TEXT,
      next_due_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_plan_items (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      task_id TEXT,
      task_name TEXT NOT NULL,
      category TEXT,
      est_minutes INTEGER,
      owner TEXT DEFAULT 'Either',
      planned_day TEXT,
      status TEXT DEFAULT 'Not Started',
      actual_date TEXT,
      points_earned INTEGER,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      parent_task_id TEXT,
      subtask_name TEXT NOT NULL,
      sequence INTEGER DEFAULT 0,
      est_minutes INTEGER,
      owner TEXT DEFAULT 'Either',
      status TEXT DEFAULT 'Not Started',
      due_date TEXT,
      completed_date TEXT,
      tools TEXT,
      products TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      log_date TEXT DEFAULT (date('now')),
      task_id TEXT,
      plan_item_id TEXT,
      project_id TEXT,
      action TEXT,
      minutes_spent INTEGER,
      points INTEGER,
      owner TEXT,
      products_used TEXT,
      outcome TEXT,
      notes TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reward_rules (
      id TEXT PRIMARY KEY,
      reward_level TEXT,
      min_points INTEGER,
      max_points INTEGER,
      reward TEXT NOT NULL,
      cadence TEXT DEFAULT 'Weekly',
      shared_or_individual TEXT DEFAULT 'Shared',
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reward_cashins (
      id TEXT PRIMARY KEY,
      rule_id TEXT,
      reward_name TEXT NOT NULL,
      owner TEXT,
      points_spent INTEGER DEFAULT 0,
      cashed_in_date TEXT DEFAULT (date('now')),
      notes TEXT,
      FOREIGN KEY (rule_id) REFERENCES reward_rules(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_next_due ON tasks(next_due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_target_date ON tasks(target_date);
    CREATE INDEX IF NOT EXISTS idx_weekly_week_start ON weekly_plan_items(week_start);
    CREATE INDEX IF NOT EXISTS idx_subtasks_parent ON subtasks(parent_task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_owner ON activity_log(owner);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(log_date);
    CREATE INDEX IF NOT EXISTS idx_cashins_owner ON reward_cashins(owner);
  `);
}

module.exports = { getDb };
