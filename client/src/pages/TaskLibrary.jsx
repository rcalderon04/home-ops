import React, { useState, useEffect } from 'react';
import { api, formatDate, CATEGORY_OPTIONS, AREA_OPTIONS, OWNER_OPTIONS } from '../api.js';

export default function TaskLibrary({ navigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [sortBy, setSortBy] = useState('due');
  const [completeModalTask, setCompleteModalTask] = useState(null);
  const [completeOwner, setCompleteOwner] = useState('Ryan');

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await api.getTasks({ active: filterActive ? 'true' : '' });
      setTasks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function toggleActive(task) {
    await api.updateTask(task.id, { is_active: task.is_active ? 0 : 1 });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_active: t.is_active ? 0 : 1 } : t));
  }

  async function deleteTask(task) {
    if (!confirm(`Delete "${task.task_name}"? This cannot be undone.`)) return;
    await api.deleteTask(task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  }

  async function completeNow(task, owner) {
    const updated = await api.completeTaskNow(task.id, { owner });
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
  }

  const filtered = tasks
    .filter(t => {
      if (filterCat && t.category !== filterCat) return false;
      if (filterArea && t.area !== filterArea) return false;
      if (search && !t.task_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due') return (a.next_due_date || a.target_date || '9999') > (b.next_due_date || b.target_date || '9999') ? 1 : -1;
      if (sortBy === 'name') return a.task_name.localeCompare(b.task_name);
      if (sortBy === 'cat') return (a.category || '').localeCompare(b.category || '');
      if (sortBy === 'area') return (a.area || '').localeCompare(b.area || '');
      return 0;
    });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Task Library</div>
          <div className="page-subtitle">{filtered.length} of {tasks.length} tasks</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('new-task')}>+ New Task</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-input" style={{ maxWidth: 240, marginBottom: 0 }}
            placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ maxWidth: 200 }}
            value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: 200 }}
            value={filterArea} onChange={e => setFilterArea(e.target.value)}>
            <option value="">All Areas</option>
            {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: 160 }}
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="due">Sort: Next Due</option>
            <option value="name">Sort: Name</option>
            <option value="cat">Sort: Category</option>
            <option value="area">Sort: Area</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={filterActive} onChange={e => setFilterActive(e.target.checked)} />
            Active only
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-sub">Try adjusting your filters or create a new task</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next Due</th>
                  <th>Est.</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => {
                  const dueDate = task.next_due_date || task.target_date;
                  const isOverdue = dueDate && dueDate < new Date().toISOString().split('T')[0];
                  return (
                    <tr key={task.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{task.task_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{task.id} · {task.area}</div>
                        {task.split_into_subtasks === 'Yes' && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: 8, marginTop: 2, display: 'inline-block' }}>has subtasks</span>}
                      </td>
                      <td><span className="category-pill">{task.category}</span></td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                        {task.cadence_type}
                        {task.season && task.season !== 'Any' && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{task.season}</div>}
                      </td>
                      <td>
                        <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text)', fontWeight: isOverdue ? 600 : 400, fontSize: 12 }}>
                          {isOverdue && '⚠ '}{formatDate(dueDate)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{task.est_minutes ? `${task.est_minutes}m` : '—'}</td>
                      <td style={{ fontSize: 12 }}>{task.default_owner || '—'}</td>
                      <td>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10,
                          background: task.is_active ? '#dcfce7' : '#f1f5f9',
                          color: task.is_active ? '#15803d' : '#64748b' }}>
                          {task.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setCompleteModalTask(task);
                            setCompleteOwner(task.default_owner && task.default_owner !== 'Either' ? task.default_owner : 'Ryan');
                          }} title="Complete now"
                            style={{ color: 'var(--success)' }}>Done</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate('edit-task', task)} title="Edit">✏</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(task)} title={task.is_active ? 'Deactivate' : 'Activate'}
                            style={{ color: task.is_active ? 'var(--text-3)' : 'var(--success)' }}>
                            {task.is_active ? '⏸' : '▶'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => deleteTask(task)} title="Delete"
                            style={{ color: 'var(--text-3)' }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {completeModalTask && (
        <div className="modal-overlay" onClick={() => setCompleteModalTask(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Complete Now</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCompleteModalTask(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 14 }}>
                Who completed <strong>{completeModalTask.task_name}</strong>?
              </div>
              <div className="form-group">
                <label className="form-label">Completed By</label>
                <select
                  className="form-select"
                  value={completeOwner}
                  onChange={e => setCompleteOwner(e.target.value)}
                >
                  {OWNER_OPTIONS.filter(owner => owner !== 'Either').map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCompleteModalTask(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await completeNow(completeModalTask, completeOwner);
                  setCompleteModalTask(null);
                }}
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
