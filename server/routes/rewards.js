const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/rewards — rules + cash-in history + current balances
router.get('/', (req, res) => {
  const db = getDb();

  const rules = db.prepare(
    'SELECT * FROM reward_rules ORDER BY min_points ASC'
  ).all();

  const cashins = db.prepare(`
    SELECT rc.*, rr.reward_level, rr.min_points
    FROM reward_cashins rc
    LEFT JOIN reward_rules rr ON rc.rule_id = rr.id
    ORDER BY rc.cashed_in_date DESC
  `).all();

  // Points earned this week per owner
  const weekStart = getMondayOfWeek();
  const weekPoints = db.prepare(`
    SELECT owner, COALESCE(SUM(points), 0) as earned
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY owner
  `).all(weekStart);

  // Points earned this month per owner
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const monthPoints = db.prepare(`
    SELECT owner, COALESCE(SUM(points), 0) as earned
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY owner
  `).all(monthStart);

  // Points spent (cashed in) this week/month per owner
  const weekSpent = db.prepare(`
    SELECT owner, COALESCE(SUM(points_spent), 0) as spent
    FROM reward_cashins
    WHERE cashed_in_date >= ?
    GROUP BY owner
  `).all(weekStart);

  const monthSpent = db.prepare(`
    SELECT owner, COALESCE(SUM(points_spent), 0) as spent
    FROM reward_cashins
    WHERE cashed_in_date >= ?
    GROUP BY owner
  `).all(monthStart);

  // Total points balance per owner
  const totalEarned = db.prepare(`
    SELECT owner, SUM(points) as total_earned
    FROM activity_log
    WHERE owner IS NOT NULL AND owner != 'Either'
    GROUP BY owner
  `).all();

  const totalSpent = db.prepare(`
    SELECT owner, SUM(points_spent) as total_spent
    FROM reward_cashins
    WHERE owner IS NOT NULL AND owner != 'Shared'
    GROUP BY owner
  `).all();

  const totalBalances = {};
  totalEarned.forEach(e => {
    if (!totalBalances[e.owner]) totalBalances[e.owner] = { earned: 0, spent: 0, balance: 0 };
    totalBalances[e.owner].earned = e.total_earned;
    totalBalances[e.owner].balance = e.total_earned;
  });

  totalSpent.forEach(s => {
    if (!totalBalances[s.owner]) totalBalances[s.owner] = { earned: 0, spent: 0, balance: 0 };
    totalBalances[s.owner].spent = s.total_spent;
    totalBalances[s.owner].balance -= s.total_spent;
  });

  res.json({ rules, cashins, weekPoints, monthPoints, weekSpent, monthSpent, totalBalances });
});

// POST /api/rewards/rules — create a new reward rule
router.post('/rules', (req, res) => {
  const db = getDb();
  const id = generateRuleId(db);
  const rule = {
    id,
    reward_level: req.body.reward_level || 'Custom',
    min_points: parseInt(req.body.min_points) || 0,
    max_points: parseInt(req.body.max_points) || 999,
    reward: req.body.reward,
    cadence: req.body.cadence || 'Weekly',
    shared_or_individual: req.body.shared_or_individual || 'Shared',
    notes: req.body.notes || null,
    is_active: 1
  };
  if (!rule.reward) return res.status(400).json({ error: 'reward name required' });

  db.prepare(`
    INSERT INTO reward_rules (id, reward_level, min_points, max_points, reward, cadence, shared_or_individual, notes, is_active)
    VALUES (@id, @reward_level, @min_points, @max_points, @reward, @cadence, @shared_or_individual, @notes, @is_active)
  `).run(rule);

  res.status(201).json(db.prepare('SELECT * FROM reward_rules WHERE id = ?').get(id));
});

// PUT /api/rewards/rules/:id
router.put('/rules/:id', (req, res) => {
  const db = getDb();
  const allowed = ['reward_level', 'min_points', 'max_points', 'reward', 'cadence', 'shared_or_individual', 'notes', 'is_active'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE reward_rules SET ${fields} WHERE id = @id`).run({ ...updates, id: req.params.id });
  res.json(db.prepare('SELECT * FROM reward_rules WHERE id = ?').get(req.params.id));
});

// DELETE /api/rewards/rules/:id
router.delete('/rules/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM reward_rules WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

// POST /api/rewards/cashin — cash in a reward
router.post('/cashin', (req, res) => {
  const db = getDb();
  const { rule_id, owner, notes } = req.body;
  if (!rule_id) return res.status(400).json({ error: 'rule_id required' });

  const rule = db.prepare('SELECT * FROM reward_rules WHERE id = ?').get(rule_id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  const id = generateCashinId(db);
  const cashin = {
    id,
    rule_id,
    reward_name: rule.reward,
    owner: owner || 'Shared',
    points_spent: rule.min_points,
    cashed_in_date: new Date().toISOString().split('T')[0],
    notes: notes || null
  };

  db.prepare(`
    INSERT INTO reward_cashins (id, rule_id, reward_name, owner, points_spent, cashed_in_date, notes)
    VALUES (@id, @rule_id, @reward_name, @owner, @points_spent, @cashed_in_date, @notes)
  `).run(cashin);

  res.status(201).json(cashin);
});

// DELETE /api/rewards/cashin/:id — undo a cash-in
router.delete('/cashin/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM reward_cashins WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

function generateRuleId(db) {
  const last = db.prepare("SELECT id FROM reward_rules ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'R-001';
  const num = parseInt(last.id.replace('R-', ''), 10) + 1;
  return `R-${String(num).padStart(3, '0')}`;
}

function generateCashinId(db) {
  const last = db.prepare("SELECT id FROM reward_cashins ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'C-001';
  const num = parseInt(last.id.replace('C-', ''), 10) + 1;
  return `C-${String(num).padStart(3, '0')}`;
}

function getMondayOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

module.exports = router;
