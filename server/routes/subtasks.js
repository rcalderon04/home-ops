const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/subtasks?task_id=T-007
router.get('/', (req, res) => {
  const db = getDb();
  const { task_id } = req.query;
  if (!task_id) return res.status(400).json({ error: 'task_id required' });
  const subtasks = db.prepare(
    'SELECT * FROM subtasks WHERE parent_task_id = ? ORDER BY sequence ASC'
  ).all(task_id);
  res.json(subtasks);
});

// POST /api/subtasks
router.post('/', (req, res) => {
  const db = getDb();
  const id = generateNextId(db);
  const item = {
    id,
    project_id: req.body.project_id || generateProjectId(db, req.body.parent_task_id),
    parent_task_id: req.body.parent_task_id,
    subtask_name: req.body.subtask_name,
    sequence: req.body.sequence || getNextSequence(db, req.body.parent_task_id),
    est_minutes: req.body.est_minutes || null,
    owner: req.body.owner || 'Either',
    status: req.body.status || 'Not Started',
    due_date: req.body.due_date || null,
    completed_date: null,
    tools: req.body.tools || null,
    products: req.body.products || null,
    notes: req.body.notes || null
  };
  db.prepare(`
    INSERT INTO subtasks (id, project_id, parent_task_id, subtask_name, sequence,
      est_minutes, owner, status, due_date, completed_date, tools, products, notes)
    VALUES (@id, @project_id, @parent_task_id, @subtask_name, @sequence,
      @est_minutes, @owner, @status, @due_date, @completed_date, @tools, @products, @notes)
  `).run(item);
  res.status(201).json(db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id));
});

// PUT /api/subtasks/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Subtask not found' });

  const allowed = ['subtask_name', 'status', 'due_date', 'completed_date',
    'est_minutes', 'owner', 'tools', 'products', 'notes', 'sequence'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.status === 'Done' && !updates.completed_date) {
    updates.completed_date = new Date().toISOString().split('T')[0];
  }

  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE subtasks SET ${fields} WHERE id = @id`).run({ ...updates, id: req.params.id });
  res.json(db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id));
});

// DELETE /api/subtasks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Subtask not found' });
  res.json({ deleted: req.params.id });
});

// POST /api/subtasks/reorder
router.post('/reorder', (req, res) => {
  const db = getDb();
  const { subtaskIds } = req.body;
  if (!Array.isArray(subtaskIds)) {
    return res.status(400).json({ error: 'subtaskIds must be an array' });
  }

  const stmt = db.prepare('UPDATE subtasks SET sequence = ? WHERE id = ?');
  db.transaction((ids) => {
    for (let i = 0; i < ids.length; i++) {
      stmt.run(i + 1, ids[i]);
    }
  })(subtaskIds);

  res.json({ success: true, reordered: subtaskIds });
});

function generateNextId(db) {
  const last = db.prepare("SELECT id FROM subtasks ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'ST-001';
  const num = parseInt(last.id.replace('ST-', ''), 10) + 1;
  return `ST-${String(num).padStart(3, '0')}`;
}

function generateProjectId(db, taskId) {
  const existing = db.prepare('SELECT project_id FROM subtasks WHERE parent_task_id = ? LIMIT 1').get(taskId);
  if (existing) return existing.project_id;
  const last = db.prepare("SELECT project_id FROM subtasks ORDER BY project_id DESC LIMIT 1").get();
  if (!last) return 'P-001';
  const num = parseInt(last.project_id.replace('P-', ''), 10) + 1;
  return `P-${String(num).padStart(3, '0')}`;
}

function getNextSequence(db, taskId) {
  const max = db.prepare('SELECT MAX(sequence) as m FROM subtasks WHERE parent_task_id = ?').get(taskId);
  return (max?.m || 0) + 1;
}

module.exports = router;
