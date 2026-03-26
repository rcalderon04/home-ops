import React, { useState, useEffect } from 'react';
import { api, formatDate } from '../api.js';

const OWNER_COLORS = { Ryan: '#3b82f6', Bayley: '#ec4899', Either: '#8b5cf6', null: '#94a3b8' };
const CATEGORY_COLORS = [
  '#3b82f6','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#84cc16'
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => { load(); }, [months]);

  async function load() {
    setLoading(true);
    try { setData(await api.getAnalytics(months)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="loading">📊 Loading analytics…</div>;
  if (!data) return null;

  const { ownerSummary, byCategory, monthlyTrend, monthlyByOwner, recentActivity, totals } = data;

  // Build months list for x-axis
  const allMonths = [...new Set(monthlyTrend.map(r => r.month))];

  // Pivot monthly data by owner
  const owners = [...new Set(monthlyByOwner.map(r => r.owner))];
  const byOwnerMonth = {};
  for (const r of monthlyByOwner) {
    if (!byOwnerMonth[r.owner]) byOwnerMonth[r.owner] = {};
    byOwnerMonth[r.owner][r.month] = r;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Analytics Dashboard</div>
          <div className="page-subtitle">Work performed across all owners</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Show:</span>
          {[3, 6, 12].map(m => (
            <button key={m} className={`btn btn-sm ${months === m ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMonths(m)}>{m}mo</button>
          ))}
        </div>
      </div>

      {/* All-time KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <KPICard label="Tasks Completed" value={totals.tasks_completed} icon="✅" />
        <KPICard label="Hours Logged" value={(totals.total_minutes / 60).toFixed(1)} icon="⏱" />
        <KPICard label="Points Earned" value={totals.total_points} icon="⭐" />
        <KPICard label="Active Owners" value={ownerSummary.length} icon="👥" />
      </div>

      {/* Owner breakdown + category breakdown side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Owner summary */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>By Owner — Last {months} Months</div>
          {ownerSummary.length === 0
            ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No data yet</div>
            : ownerSummary.map(o => {
              const maxPts = Math.max(...ownerSummary.map(x => x.total_points), 1);
              return (
                <div key={o.owner} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: OWNER_COLORS[o.owner] || '#94a3b8', marginRight: 7 }} />
                      {o.owner}
                    </span>
                    <span style={{ color: 'var(--text-2)' }}>{o.tasks_completed} tasks · {(o.total_minutes / 60).toFixed(1)}h · {o.total_points} pts</span>
                  </div>
                  <ProgressBar value={o.total_points} max={maxPts} color={OWNER_COLORS[o.owner] || '#94a3b8'} />
                </div>
              );
            })}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>By Category — Last {months} Months</div>
          {byCategory.length === 0
            ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No data yet</div>
            : byCategory.map((c, i) => {
              const maxCount = Math.max(...byCategory.map(x => x.count), 1);
              return (
                <div key={c.category || 'Unknown'} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                    <span style={{ fontWeight: 500 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], marginRight: 7 }} />
                      {c.category || 'Unknown'}
                    </span>
                    <span style={{ color: 'var(--text-2)' }}>{c.count} · {(c.minutes / 60).toFixed(1)}h</span>
                  </div>
                  <ProgressBar value={c.count} max={maxCount} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} height={6} />
                </div>
              );
            })}
        </div>
      </div>

      {/* Monthly trend chart */}
      {monthlyTrend.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Monthly Activity Trend</div>
          <MonthlyBarChart months={allMonths} data={monthlyTrend} byOwner={monthlyByOwner} owners={owners} />
        </div>
      )}

      {/* Monthly points by owner line chart */}
      {monthlyByOwner.length > 0 && owners.length > 1 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Points Accrual by Owner</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {owners.map(o => (
              <span key={o} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ width: 24, height: 3, background: OWNER_COLORS[o] || '#94a3b8', display: 'inline-block', borderRadius: 2 }} />
                {o}
              </span>
            ))}
          </div>
          <PointsLineChart months={allMonths} byOwnerMonth={byOwnerMonth} owners={owners} />
        </div>
      )}

      {/* Recent activity */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Recent Activity</div>
        {recentActivity.length === 0
          ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No activity logged yet</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Action</th>
                    <th>Owner</th>
                    <th>Min</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(r.log_date)}</td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.resolved_task_name || r.task_id || '—'}
                        </div>
                        {r.outcome && <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.outcome}</div>}
                      </td>
                      <td><span className="category-pill">{r.category || '—'}</span></td>
                      <td style={{ fontSize: 12 }}>{r.action}</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: OWNER_COLORS[r.owner] || 'var(--text-2)' }}>{r.owner}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.minutes_spent ?? '—'}</td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{r.points ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function KPICard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label" style={{ marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ value, max, color, height = 8 }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 4, height, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function MonthlyBarChart({ months, data, byOwner, owners }) {
  const W = 680, H = 200, PAD = { top: 10, right: 16, bottom: 30, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxTasks = Math.max(...data.map(d => d.tasks), 1);
  const barW = Math.min(40, (chartW / months.length) - 8);
  const xStep = chartW / months.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD.top + chartH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-3)">
              {Math.round(f * maxTasks)}
            </text>
          </g>
        );
      })}

      {/* Bars grouped by owner */}
      {months.map((m, mi) => {
        const cx = PAD.left + (mi + 0.5) * xStep;
        const monthData = data.find(d => d.month === m);
        const tasks = monthData?.tasks || 0;
        const barH = chartH * (tasks / maxTasks);

        return (
          <g key={m}>
            <rect
              x={cx - barW / 2} y={PAD.top + chartH - barH}
              width={barW} height={barH}
              fill="var(--primary)" opacity={0.85} rx={3}
            />
            {tasks > 0 && (
              <text x={cx} y={PAD.top + chartH - barH - 4} textAnchor="middle" fontSize={9} fill="var(--text-2)">{tasks}</text>
            )}
            <text x={cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-3)">
              {m.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PointsLineChart({ months, byOwnerMonth, owners }) {
  const W = 680, H = 180, PAD = { top: 10, right: 16, bottom: 30, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allPts = Object.values(byOwnerMonth).flatMap(om => Object.values(om).map(d => d.points));
  const maxPts = Math.max(...allPts, 1);
  const xStep = chartW / Math.max(months.length - 1, 1);

  function x(mi) { return PAD.left + mi * xStep; }
  function y(pts) { return PAD.top + chartH * (1 - pts / maxPts); }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map(f => {
        const yv = PAD.top + chartH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yv} y2={yv} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 4} y={yv + 4} textAnchor="end" fontSize={9} fill="var(--text-3)">
              {Math.round(f * maxPts)}
            </text>
          </g>
        );
      })}

      {/* Lines per owner */}
      {owners.map(owner => {
        const color = OWNER_COLORS[owner] || '#94a3b8';
        const pts = months.map(m => byOwnerMonth[owner]?.[m]?.points || 0);
        if (pts.every(p => p === 0)) return null;

        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p)}`).join(' ');
        return (
          <g key={owner}>
            <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p)} r={3} fill={color} />
            ))}
          </g>
        );
      })}

      {/* X labels */}
      {months.map((m, mi) => (
        <text key={m} x={x(mi)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-3)">
          {m.slice(5)}
        </text>
      ))}
    </svg>
  );
}
