import React, { useState, useEffect, useCallback } from 'react';
import { api, addDays, formatWeekRange, STATUS_OPTIONS, DAYS_OPTIONS, OWNER_OPTIONS } from '../api.js';

const STATUS_CLASS = {
  'Not Started': 'not-started',
  'In Progress': 'in-progress',
  'Completed': 'completed',
  'Deferred': 'deferred'
};

export default function WeeklyPlanner({ currentWeek, setCurrentWeek, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingTask, setAddingTask] = useState(null); // task from suggestions being added
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [subtaskData, setSubtaskData] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await api.getWeekly(currentWeek);
      setData(result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentWeek]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(itemId, newStatus) {
    try {
      await api.updateWeekItem(itemId, { status: newStatus });
      setData(prev => ({
        ...prev,
        planned: prev.planned.map(p => p.id === itemId ? { ...p, status: newStatus } : p),
        stats: recalcStats(prev.planned.map(p => p.id === itemId ? { ...p, status: newStatus } : p))
      }));
    } catch (e) { alert('Error updating status: ' + e.message); }
  }

  async function updateField(itemId, field, value) {
    try {
      await api.updateWeekItem(itemId, { [field]: value });
      setData(prev => ({
        ...prev,
        planned: prev.planned.map(p => p.id === itemId ? { ...p, [field]: value } : p)
      }));
    } catch (e) { alert('Error: ' + e.message); }
  }

  async function removeItem(itemId) {
    if (!confirm('Remove from this week?')) return;
    try {
      await api.removeFromWeek(itemId);
      setData(prev => ({
        ...prev,
        planned: prev.planned.filter(p => p.id !== itemId),
        stats: recalcStats(prev.planned.filter(p => p.id !== itemId))
      }));
    } catch (e) { alert('Error: ' + e.message); }
  }

  async function addToWeek(task, isAdvance = false) {
    try {
      const item = await api.addToWeek({
        week_start: currentWeek,
        task_id: task.id,
        task_name: task.task_name,
        category: task.category,
        est_minutes: task.est_minutes,
        default_owner: task.default_owner,
        points_earned: task.points
      });
      setData(prev => ({
        ...prev,
        planned: [...prev.planned, item],
        suggestions: prev.suggestions.filter(s => s.id !== task.id),
        advanceTasks: prev.advanceTasks.filter(a => a.id !== task.id),
        stats: recalcStats([...prev.planned, item])
      }));
    } catch (e) { alert('Error: ' + e.message); }
  }

  async function toggleSubtasks(taskId) {
    if (expandedSubtasks[taskId]) {
      setExpandedSubtasks(p => ({ ...p, [taskId]: false }));
      return;
    }
    if (!subtaskData[taskId]) {
      const subs = await api.getSubtasks(taskId);
      setSubtaskData(p => ({ ...p, [taskId]: subs }));
    }
    setExpandedSubtasks(p => ({ ...p, [taskId]: true }));
  }

  async function updateSubtaskStatus(taskId, subId, status) {
    await api.updateSubtask(subId, { status });
    setSubtaskData(p => ({
      ...p,
      [taskId]: p[taskId].map(s => s.id === subId ? { ...s, status } : s)
    }));
  }

  function prevWeek() {
    const d = new Date(currentWeek + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d.toISOString().split('T')[0]);
  }
  function nextWeek() {
    const d = new Date(currentWeek + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d.toISOString().split('T')[0]);
  }
  function goToday() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    setCurrentWeek(d.toISOString().split('T')[0]);
  }

  if (loading) return <div className="loading">⏳ Loading planner…</div>;
  if (error) return <div className="page"><div className="card" style={{color:'var(--danger)'}}>Error: {error}</div></div>;

  const { planned, suggestions, advanceTasks, stats } = data;

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Weekly Planner</div>
          <div className="page-subtitle">{formatWeekRange(currentWeek)}</div>
        </div>
        <div className="week-nav">
          <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={prevWeek}>← Prev</button>
          <span className="week-label" style={{minWidth:120,textAlign:'center',fontSize:13}}>
            Week of {new Date(currentWeek + 'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextWeek}>Next →</button>
        </div>
      </div>

      {/* Stats */}
      <div className="card-grid" style={{gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Not Started" value={stats.notStarted} color="var(--text-2)" />
        <StatCard label="In Progress" value={stats.inProgress} color="var(--warning)" />
        <StatCard label="Completed" value={stats.completed} color="var(--success)" />
        <StatCard label="Est. Hours" value={(stats.totalMinutes/60).toFixed(1)} sub={`${stats.totalPoints} pts`} />
      </div>

      {/* Planned tasks */}
      {planned.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No tasks planned for this week</div>
          <div className="empty-sub">Add tasks from the suggestions below or the Task Library</div>
        </div>
      ) : (
        <>
          <div className="section-label">This Week ({planned.length})</div>
          {planned.map(item => (
            <TaskItem
              key={item.id}
              item={item}
              onStatus={updateStatus}
              onField={updateField}
              onRemove={removeItem}
              onToggleSubs={toggleSubtasks}
              showSubtasks={expandedSubtasks[item.task_id]}
              subtasks={subtaskData[item.task_id] || []}
              onSubStatus={updateSubtaskStatus}
              navigate={navigate}
            />
          ))}
        </>
      )}

      {/* Suggestions: due this week */}
      {suggestions.length > 0 && (
        <>
          <div className="section-label">Due This Week — Add to Plan ({suggestions.length})</div>
          {suggestions.map(task => (
            <SuggestionItem key={task.id} task={task} onAdd={() => addToWeek(task)} navigate={navigate} />
          ))}
        </>
      )}

      {/* Advance notice: multi-week tasks coming up */}
      {advanceTasks.length > 0 && (
        <>
          <div className="section-label">⚠ Advance Notice — Due Within 4 Weeks ({advanceTasks.length})</div>
          {advanceTasks.map(task => (
            <SuggestionItem key={task.id} task={task} onAdd={() => addToWeek(task, true)} advance navigate={navigate} />
          ))}
        </>
      )}
    </div>
  );
}

function TaskItem({ item, onStatus, onField, onRemove, onToggleSubs, showSubtasks, subtasks, onSubStatus, navigate }) {
  const [editing, setEditing] = useState(false);
  const hasSubtasks = item.split_into_subtasks === 'Yes';
  const statusClass = STATUS_CLASS[item.status] || 'not-started';

  return (
    <div className="task-item" style={item.status === 'Completed' ? { opacity: 0.6 } : {}}>
      <div className="task-item-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="task-item-name">{item.task_name}</span>
            {hasSubtasks && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 6px' }}
                onClick={() => onToggleSubs(item.task_id)}>
                {showSubtasks ? '▾ Subtasks' : '▸ Subtasks'}
              </button>
            )}
          </div>
          <div className="task-item-meta">
            <span className="category-pill">{item.category}</span>
            {item.planned_day && <span>📆 {item.planned_day}</span>}
            {item.est_minutes && <span>⏱ {item.est_minutes} min</span>}
            {item.owner && <span>👤 {item.owner}</span>}
            {item.points_earned && <span>⭐ {item.points_earned} pts</span>}
          </div>
          {item.notes && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic' }}>{item.notes}</div>}
        </div>
        <div className="task-item-actions">
          <select
            className={`status-select ${statusClass}`}
            value={item.status}
            onChange={e => onStatus(item.id, e.target.value)}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" title="Edit fields" onClick={() => setEditing(e => !e)}>✏</button>
          <button className="btn btn-ghost btn-sm" title="Remove from week" onClick={() => onRemove(item.id)}
            style={{ color: 'var(--text-3)' }}>✕</button>
        </div>
      </div>

      {/* Inline edit: day + owner */}
      {editing && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 120, flex: 1 }}>
            <label className="form-label">Planned Day</label>
            <select className="form-select" value={item.planned_day || ''}
              onChange={e => onField(item.id, 'planned_day', e.target.value)}>
              <option value="">—</option>
              {DAYS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 120, flex: 1 }}>
            <label className="form-label">Owner</label>
            <select className="form-select" value={item.owner || 'Either'}
              onChange={e => onField(item.id, 'owner', e.target.value)}>
              {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
            <label className="form-label">Notes</label>
            <input className="form-input" defaultValue={item.notes || ''}
              onBlur={e => onField(item.id, 'notes', e.target.value)}
              placeholder="Optional note for this week…" />
          </div>
        </div>
      )}

      {/* Subtasks */}
      {showSubtasks && subtasks.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 8 }}>Subtasks</div>
          {subtasks.map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                <span style={sub.status === 'Done' ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}}>
                  {sub.sequence}. {sub.subtask_name}
                </span>
                {sub.est_minutes && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)' }}>{sub.est_minutes} min</span>}
                {sub.due_date && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-2)' }}>due {new Date(sub.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              </div>
              <select
                className={`status-select ${STATUS_CLASS[sub.status === 'Done' ? 'Completed' : (sub.status || 'Not Started')] || 'not-started'}`}
                value={sub.status}
                onChange={e => onSubStatus(item.task_id, sub.id, e.target.value)}
                style={{ fontSize: 11 }}
              >
                {['Not Started', 'In Progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionItem({ task, onAdd, advance, navigate }) {
  return (
    <div className={`suggestion-item${advance ? ' advance-item' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{task.task_name}</span>
            <span className="category-pill">{task.category}</span>
          </div>
          <div className="task-item-meta">
            {task.next_due_date && <span>📅 Due {new Date(task.next_due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            {task.target_date && task.cadence_type === 'One-off' && <span>🎯 Target {new Date(task.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            {task.est_minutes && <span>⏱ {task.est_minutes} min</span>}
            {task.default_owner && <span>👤 {task.default_owner}</span>}
            {task.difficulty && <span>💪 {task.difficulty}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-primary" onClick={onAdd}>+ Add to Week</button>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('edit-task', task)}>View</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card" style={{ padding: '12px 14px' }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 22, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function recalcStats(planned) {
  return {
    total: planned.length,
    completed: planned.filter(p => p.status === 'Completed').length,
    inProgress: planned.filter(p => p.status === 'In Progress').length,
    notStarted: planned.filter(p => p.status === 'Not Started').length,
    deferred: planned.filter(p => p.status === 'Deferred').length,
    totalMinutes: planned.reduce((s, p) => s + (p.est_minutes || 0), 0),
    totalPoints: planned.filter(p => p.status === 'Completed').reduce((s, p) => s + (p.points_earned || 0), 0)
  };
}
