const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/weekly?week=2026-03-16
// Returns: planned items for the week + suggested tasks
router.get('/', (req, res) => {
  const db = getDb();
  const { week } = req.query;
  if (!week) return res.status(400).json({ error: 'week param required (YYYY-MM-DD Monday)' });

  const weekStart = toMonday(week);
  const weekEnd = addDays(weekStart, 6);

  // 1. All planned items for this week
  const planned = db.prepare(`
    SELECT wp.*, t.cadence_type, t.split_into_subtasks, t.tools_needed,
           t.products_needed, t.safety_notes, t.difficulty
    FROM weekly_plan_items wp
    LEFT JOIN tasks t ON wp.task_id = t.id
    WHERE wp.week_start = ?
    ORDER BY wp.sort_order ASC, wp.planned_day ASC
  `).all(weekStart);

  const plannedTaskIds = new Set(planned.map(p => p.task_id).filter(Boolean));

  // 2. Suggested: tasks whose next_due_date falls this week and not already planned
  const suggestions = db.prepare(`
    SELECT * FROM tasks
    WHERE is_active = 1
      AND next_due_date BETWEEN ? AND ?
      AND id NOT IN (${plannedTaskIds.size > 0 ? [...plannedTaskIds].map(() => '?').join(',') : 'NULL'})
    ORDER BY next_due_date ASC
  `).all(weekStart, weekEnd, ...[...plannedTaskIds]);

  // 3. Advance notice: multi-week tasks (split_into_subtasks='Yes' or est_minutes>=120)
  //    whose target_date is within 4 weeks from this week's start and not already planned
  const fourWeeksOut = addDays(weekStart, 28);
  const advanceTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE is_active = 1
      AND (split_into_subtasks = 'Yes' OR est_minutes >= 120)
      AND target_date IS NOT NULL
      AND target_date > ? AND target_date <= ?
      AND id NOT IN (${plannedTaskIds.size > 0 ? [...plannedTaskIds].map(() => '?').join(',') : 'NULL'})
      AND id NOT IN (${suggestions.length > 0 ? suggestions.map(() => '?').join(',') : 'NULL'})
    ORDER BY target_date ASC
  `).all(weekEnd, fourWeeksOut, ...[...plannedTaskIds], ...suggestions.map(s => s.id));

  // 4. Week stats
  const stats = {
    total: planned.length,
    completed: planned.filter(p => p.status === 'Completed').length,
    inProgress: planned.filter(p => p.status === 'In Progress').length,
    notStarted: planned.filter(p => p.status === 'Not Started').length,
    deferred: planned.filter(p => p.status === 'Deferred').length,
    totalMinutes: planned.reduce((sum, p) => sum + (p.est_minutes || 0), 0),
    totalPoints: planned.filter(p => p.status === 'Completed').reduce((sum, p) => sum + (p.points_earned || 0), 0)
  };

  res.json({
    weekStart,
    weekEnd,
    planned,
    suggestions,
    advanceTasks,
    stats
  });
});

// POST /api/weekly — add task to weekly plan
router.post('/', (req, res) => {
  const db = getDb();
  const { week_start, task_id, planned_day, owner, notes, sort_order } = req.body;

  if (!week_start) return res.status(400).json({ error: 'week_start required' });

  let taskData = {};
  if (task_id) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (task) {
      taskData = {
        task_name: task.task_name,
        category: task.category,
        est_minutes: task.est_minutes,
        points_earned: task.points
      };
    }
  }

  // Allow override from body
  const newItem = {
    id: generateNextId(db),
    week_start: toMonday(week_start),
    task_id: task_id || null,
    task_name: req.body.task_name || taskData.task_name || 'Unnamed Task',
    category: req.body.category || taskData.category || null,
    est_minutes: req.body.est_minutes || taskData.est_minutes || null,
    owner: owner || req.body.default_owner || 'Either',
    planned_day: planned_day || null,
    status: 'Not Started',
    actual_date: null,
    points_earned: taskData.points_earned || req.body.points_earned || null,
    notes: notes || null,
    sort_order: sort_order || getNextSortOrder(db, toMonday(week_start))
  };

  db.prepare(`
    INSERT INTO weekly_plan_items (id, week_start, task_id, task_name, category,
      est_minutes, owner, planned_day, status, actual_date, points_earned, notes, sort_order)
    VALUES (@id, @week_start, @task_id, @task_name, @category,
      @est_minutes, @owner, @planned_day, @status, @actual_date, @points_earned, @notes, @sort_order)
  `).run(newItem);

  res.status(201).json(db.prepare('SELECT * FROM weekly_plan_items WHERE id = ?').get(newItem.id));
});

// PUT /api/weekly/:id — update status, day, owner, notes
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM weekly_plan_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plan item not found' });

  const allowed = ['status', 'planned_day', 'owner', 'notes', 'actual_date',
    'points_earned', 'sort_order', 'est_minutes', 'task_name', 'category'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Auto-set actual_date when marking completed
  if (updates.status === 'Completed' && !updates.actual_date && !existing.actual_date) {
    updates.actual_date = new Date().toISOString().split('T')[0];
  }

  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE weekly_plan_items SET ${fields}, updated_at = datetime('now') WHERE id = @id`)
    .run({ ...updates, id: req.params.id });

  // If completed and has a task_id, log to activity_log
  if (updates.status === 'Completed' && existing.task_id) {
    logActivity(db, existing, updates);
  }

  res.json(db.prepare('SELECT * FROM weekly_plan_items WHERE id = ?').get(req.params.id));
});

// DELETE /api/weekly/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM weekly_plan_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Plan item not found' });
  res.json({ deleted: req.params.id });
});

function logActivity(db, item, updates) {
  const lastLog = db.prepare("SELECT id FROM activity_log ORDER BY id DESC LIMIT 1").get();
  const num = lastLog ? parseInt(lastLog.id.replace('L-', ''), 10) + 1 : 1;
  const logId = `L-${String(num).padStart(3, '0')}`;

  db.prepare(`
    INSERT OR IGNORE INTO activity_log (id, log_date, task_id, plan_item_id, action, minutes_spent, points, owner)
    VALUES (?, ?, ?, ?, 'Completed task', ?, ?, ?)
  `).run(logId, updates.actual_date || new Date().toISOString().split('T')[0],
    item.task_id, item.id, item.est_minutes, item.points_earned, item.owner);
}

function generateNextId(db) {
  const last = db.prepare("SELECT id FROM weekly_plan_items ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'WP-001';
  const num = parseInt(last.id.replace('WP-', ''), 10) + 1;
  return `WP-${String(num).padStart(3, '0')}`;
}

function getNextSortOrder(db, weekStart) {
  const max = db.prepare('SELECT MAX(sort_order) as m FROM weekly_plan_items WHERE week_start = ?').get(weekStart);
  return (max?.m || 0) + 1;
}

function toMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

module.exports = router;
