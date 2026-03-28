const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/tasks — all tasks, optional ?active=true filter
router.get('/', (req, res) => {
  const db = getDb();
  const { active, category, search } = req.query;
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (active === 'true') { query += ' AND is_active = 1'; }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (search) { query += ' AND task_name LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY next_due_date ASC, task_name ASC';
  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// POST /api/tasks/:id/complete-now
router.post('/:id/complete-now', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const today = new Date().toISOString().split('T')[0];
  const owner = req.body.owner || task.default_owner || 'Either';
  const nextDueDate = calculateNextDueDate(task, today);

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE tasks
      SET last_completed = ?, next_due_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(today, nextDueDate, task.id);

    db.prepare(`
      INSERT INTO activity_log (
        id, log_date, task_id, plan_item_id, project_id, action,
        minutes_spent, points, owner, products_used, outcome, notes
      )
      VALUES (?, ?, ?, NULL, NULL, 'Completed task', ?, ?, ?, NULL, ?, NULL)
    `).run(
      generateNextLogId(db),
      today,
      task.id,
      task.est_minutes || 0,
      task.points || 0,
      owner,
      'Completed from task library'
    );
  });

  tx();

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /api/tasks — create task
router.post('/', (req, res) => {
  const db = getDb();
  const nextId = generateNextId(db);
  const task = { id: nextId, ...sanitizeTask(req.body) };

  try {
    db.prepare(`
      INSERT INTO tasks (id, parent_task_id, task_name, category, area, location_type,
        cadence_type, cadence_interval, season, is_active, est_minutes, difficulty,
        points, default_owner, tools_needed, products_needed, safety_notes,
        product_record_required, split_into_subtasks, target_date, last_completed,
        next_due_date, notes)
      VALUES (@id, @parent_task_id, @task_name, @category, @area, @location_type,
        @cadence_type, @cadence_interval, @season, @is_active, @est_minutes, @difficulty,
        @points, @default_owner, @tools_needed, @products_needed, @safety_notes,
        @product_record_required, @split_into_subtasks, @target_date, @last_completed,
        @next_due_date, @notes)
    `).run(task);
    res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(nextId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const updates = sanitizeTask(req.body);
  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');

  try {
    db.prepare(`UPDATE tasks SET ${fields}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...updates, id: req.params.id });
    res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ deleted: req.params.id });
});

// GET /api/tasks/meta/categories — distinct categories for dropdowns
router.get('/meta/categories', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

function generateNextId(db) {
  const last = db.prepare("SELECT id FROM tasks WHERE id LIKE 'T-%' ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'T-001';
  const num = parseInt(last.id.replace('T-', ''), 10) + 1;
  return `T-${String(num).padStart(3, '0')}`;
}

function generateNextLogId(db) {
  const last = db.prepare("SELECT id FROM activity_log ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'L-001';
  const num = parseInt(last.id.replace('L-', ''), 10) + 1;
  return `L-${String(num).padStart(3, '0')}`;
}

function calculateNextDueDate(task, fromDate) {
  if (task.cadence_type === 'One-off') return null;

  const interval = Number.parseInt(task.cadence_interval, 10) || 1;
  const date = new Date(`${fromDate}T00:00:00Z`);

  if (task.cadence_type === 'Weekly') {
    date.setUTCDate(date.getUTCDate() + (7 * interval));
    return toDateString(date);
  }

  if (task.cadence_type === 'Biweekly') {
    date.setUTCDate(date.getUTCDate() + (14 * interval));
    return toDateString(date);
  }

  if (task.cadence_type === 'Monthly') {
    date.setUTCMonth(date.getUTCMonth() + interval);
    return toDateString(date);
  }

  if (task.cadence_type === 'Quarterly') {
    date.setUTCMonth(date.getUTCMonth() + (3 * interval));
    return toDateString(date);
  }

  if (task.cadence_type === 'Yearly') {
    date.setUTCFullYear(date.getUTCFullYear() + interval);
    return toDateString(date);
  }

  return task.next_due_date || task.target_date || null;
}

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

function sanitizeTask(body) {
  const allowed = [
    'parent_task_id', 'task_name', 'category', 'area', 'location_type',
    'cadence_type', 'cadence_interval', 'season', 'is_active', 'est_minutes',
    'difficulty', 'points', 'default_owner', 'tools_needed', 'products_needed',
    'safety_notes', 'product_record_required', 'split_into_subtasks',
    'target_date', 'last_completed', 'next_due_date', 'notes'
  ];
  const out = {};
  for (const key of allowed) {
    out[key] = body[key] ?? null;
  }
  return out;
}

module.exports = router;
