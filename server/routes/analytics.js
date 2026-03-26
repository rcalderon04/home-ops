const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/analytics?months=6
// Returns all analytics data in one shot
router.get('/', (req, res) => {
  const db = getDb();
  const months = parseInt(req.query.months) || 6;
  const since = monthsAgo(months);

  // ── Per-owner summary ─────────────────────────────────────────────────────
  const ownerSummary = db.prepare(`
    SELECT
      owner,
      COUNT(*) as tasks_completed,
      COALESCE(SUM(minutes_spent), 0) as total_minutes,
      COALESCE(SUM(points), 0) as total_points
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY owner
    ORDER BY total_points DESC
  `).all(since);

  // ── Tasks by category ─────────────────────────────────────────────────────
  const byCategory = db.prepare(`
    SELECT t.category, COUNT(*) as count, COALESCE(SUM(a.minutes_spent), 0) as minutes
    FROM activity_log a
    LEFT JOIN tasks t ON a.task_id = t.id
    WHERE a.log_date >= ? AND a.action LIKE '%Completed%'
    GROUP BY t.category
    ORDER BY count DESC
  `).all(since);

  // ── Monthly trend (tasks + hours + points) ────────────────────────────────
  const monthlyTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', log_date) as month,
      COUNT(*) as tasks,
      COALESCE(SUM(minutes_spent), 0) as minutes,
      COALESCE(SUM(points), 0) as points
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY month
    ORDER BY month ASC
  `).all(since);

  // ── Monthly by owner (for stacked chart) ─────────────────────────────────
  const monthlyByOwner = db.prepare(`
    SELECT
      strftime('%Y-%m', log_date) as month,
      owner,
      COUNT(*) as tasks,
      COALESCE(SUM(points), 0) as points,
      COALESCE(SUM(minutes_spent), 0) as minutes
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY month, owner
    ORDER BY month ASC
  `).all(since);

  // ── Points this week (for reward progress) ────────────────────────────────
  const weekStart = getMondayOfWeek();
  const weekPoints = db.prepare(`
    SELECT owner, COALESCE(SUM(points), 0) as points
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY owner
  `).all(weekStart);

  // ── Points this month ─────────────────────────────────────────────────────
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const monthPoints = db.prepare(`
    SELECT owner, COALESCE(SUM(points), 0) as points
    FROM activity_log
    WHERE log_date >= ? AND action LIKE '%Completed%'
    GROUP BY owner
  `).all(monthStart);

  // ── Recent activity (last 20 entries) ────────────────────────────────────
  const recentActivity = db.prepare(`
    SELECT a.*, t.task_name as resolved_task_name, t.category
    FROM activity_log a
    LEFT JOIN tasks t ON a.task_id = t.id
    ORDER BY a.log_date DESC, a.id DESC
    LIMIT 20
  `).all();

  // ── All-time totals ───────────────────────────────────────────────────────
  const totals = db.prepare(`
    SELECT
      COUNT(*) as tasks_completed,
      COALESCE(SUM(minutes_spent), 0) as total_minutes,
      COALESCE(SUM(points), 0) as total_points
    FROM activity_log
    WHERE action LIKE '%Completed%'
  `).get();

  res.json({
    ownerSummary,
    byCategory,
    monthlyTrend,
    monthlyByOwner,
    weekPoints,
    monthPoints,
    recentActivity,
    totals,
    since,
    months
  });
});

function getMondayOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

module.exports = router;
