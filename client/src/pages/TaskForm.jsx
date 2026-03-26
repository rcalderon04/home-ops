import React, { useState, useEffect } from 'react';
import { api, CATEGORY_OPTIONS, AREA_OPTIONS, CADENCE_OPTIONS, SEASON_OPTIONS, DIFFICULTY_OPTIONS, OWNER_OPTIONS } from '../api.js';

const LOCATION_TYPES = ['Interior', 'Exterior'];

const EMPTY = {
  task_name: '', category: 'Weekly Chore', area: 'Kitchen', location_type: 'Interior',
  cadence_type: 'Weekly', cadence_interval: 1, season: 'Any', is_active: 1,
  est_minutes: '', difficulty: 'Easy', points: '', default_owner: 'Either',
  tools_needed: '', products_needed: '', safety_notes: '',
  product_record_required: 'No', split_into_subtasks: 'No',
  target_date: '', last_completed: '', next_due_date: '', notes: ''
};

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSubtaskItem({ sub, i, removeSubtask }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sub.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} style={{ cursor: 'grab', color: 'var(--text-3)', padding: '0 8px' }}>⠿</span>
      <span style={{ color: 'var(--text-3)', fontSize: 12, width: 20 }}>{i + 1}.</span>
      <span style={{ flex: 1, fontSize: 13 }}>{sub.subtask_name}</span>
      {sub.est_minutes && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub.est_minutes}m</span>}
      {sub.due_date && <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{new Date(sub.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
      <span style={{ fontSize: 11, padding: '2px 6px', background: sub.status === 'Done' ? '#dcfce7' : '#f1f5f9', color: sub.status === 'Done' ? '#15803d' : '#64748b', borderRadius: 8 }}>{sub.status}</span>
      <button className="btn btn-ghost btn-sm" onClick={() => removeSubtask(sub.id)} style={{ color: 'var(--text-3)' }}>✕</button>
    </div>
  );
}

export default function TaskForm({ editingTask, navigate }) {
  const isEdit = !!editingTask;
  const [form, setForm] = useState(isEdit ? { ...EMPTY, ...editingTask } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Subtask management for tasks with split_into_subtasks='Yes'
  const [subtasks, setSubtasks] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [newSub, setNewSub] = useState({ subtask_name: '', est_minutes: '', due_date: '', owner: 'Either' });

  useEffect(() => {
    if (isEdit && editingTask.split_into_subtasks === 'Yes' && editingTask.id) {
      loadSubs(editingTask.id);
    }
  }, []);

  async function loadSubs(taskId) {
    setLoadingSubs(true);
    const subs = await api.getSubtasks(taskId);
    setSubtasks(subs);
    setLoadingSubs(false);
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.task_name.trim()) { setError('Task name is required'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { ...form };
      // Coerce numeric fields
      payload.est_minutes = payload.est_minutes ? parseInt(payload.est_minutes) : null;
      payload.points = payload.points ? parseInt(payload.points) : null;
      payload.cadence_interval = parseInt(payload.cadence_interval) || 1;
      // Empty strings → null for date fields
      ['target_date', 'last_completed', 'next_due_date'].forEach(f => {
        if (!payload[f]) payload[f] = null;
      });

      if (isEdit) {
        await api.updateTask(editingTask.id, payload);
      } else {
        await api.createTask({ ...payload, parent_task_id: null });
      }
      setSaved(true);
      setTimeout(() => navigate('tasks'), 800);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  async function addSubtask() {
    if (!newSub.subtask_name.trim()) return;
    const sub = await api.createSubtask({
      parent_task_id: editingTask.id,
      subtask_name: newSub.subtask_name,
      est_minutes: newSub.est_minutes ? parseInt(newSub.est_minutes) : null,
      due_date: newSub.due_date || null,
      owner: newSub.owner
    });
    setSubtasks(p => [...p, sub]);
    setNewSub({ subtask_name: '', est_minutes: '', due_date: '', owner: 'Either' });
  }

  async function removeSubtask(subId) {
    await api.deleteSubtask(subId);
    setSubtasks(p => p.filter(s => s.id !== subId));
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = subtasks.findIndex(s => s.id === active.id);
      const newIndex = subtasks.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(subtasks, oldIndex, newIndex);
      setSubtasks(newOrder);
      await api.reorderSubtasks(newOrder.map(s => s.id));
    }
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{isEdit ? 'Edit Task' : 'New Task'}</div>
          <div className="page-subtitle">{isEdit ? `Editing ${editingTask.id}` : 'Add a task to your library'}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('tasks')}>← Back</button>
      </div>

      <form onSubmit={handleSave}>
        {/* Core identity */}
        <Section title="Task Details">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Task Name *</label>
            <input className="form-input" value={form.task_name} onChange={e => set('task_name', e.target.value)}
              placeholder="e.g. Clean kitchen vent hood" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Area</label>
            <select className="form-select" value={form.area} onChange={e => set('area', e.target.value)}>
              {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Location Type</label>
            <select className="form-select" value={form.location_type} onChange={e => set('location_type', e.target.value)}>
              {LOCATION_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Season</label>
            <select className="form-select" value={form.season} onChange={e => set('season', e.target.value)}>
              {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Section>

        {/* Scheduling */}
        <Section title="Scheduling">
          <div className="form-group">
            <label className="form-label">Cadence</label>
            <select className="form-select" value={form.cadence_type} onChange={e => set('cadence_type', e.target.value)}>
              {CADENCE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cadence Interval</label>
            <input className="form-input" type="number" min="1" value={form.cadence_interval}
              onChange={e => set('cadence_interval', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Target / Due Date</label>
            <input className="form-input" type="date" value={form.target_date || ''}
              onChange={e => set('target_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Next Due Date</label>
            <input className="form-input" type="date" value={form.next_due_date || ''}
              onChange={e => set('next_due_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Completed</label>
            <input className="form-input" type="date" value={form.last_completed || ''}
              onChange={e => set('last_completed', e.target.value)} />
          </div>
        </Section>

        {/* Effort + rewards */}
        <Section title="Effort & Assignment">
          <div className="form-group">
            <label className="form-label">Est. Minutes</label>
            <input className="form-input" type="number" min="1" value={form.est_minutes || ''}
              onChange={e => set('est_minutes', e.target.value)} placeholder="e.g. 45" />
          </div>
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Points</label>
            <input className="form-input" type="number" min="0" value={form.points || ''}
              onChange={e => set('points', e.target.value)} placeholder="e.g. 5" />
          </div>
          <div className="form-group">
            <label className="form-label">Default Owner</label>
            <select className="form-select" value={form.default_owner} onChange={e => set('default_owner', e.target.value)}>
              {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </Section>

        {/* Tools & safety */}
        <Section title="Tools, Products & Safety">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Tools Needed</label>
            <input className="form-input" value={form.tools_needed || ''} onChange={e => set('tools_needed', e.target.value)}
              placeholder="e.g. Vacuum, crevice tool" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Products Needed</label>
            <input className="form-input" value={form.products_needed || ''} onChange={e => set('products_needed', e.target.value)}
              placeholder="e.g. Bathroom cleaner, glass cleaner" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Safety Notes</label>
            <input className="form-input" value={form.safety_notes || ''} onChange={e => set('safety_notes', e.target.value)}
              placeholder="Any safety considerations…" />
          </div>
        </Section>

        {/* Options */}
        <Section title="Options">
          <div className="form-group">
            <label className="form-label">Product Record Required?</label>
            <select className="form-select" value={form.product_record_required} onChange={e => set('product_record_required', e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Split Into Subtasks?</label>
            <select className="form-select" value={form.split_into_subtasks} onChange={e => set('split_into_subtasks', e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Active?</label>
            <select className="form-select" value={form.is_active} onChange={e => set('is_active', parseInt(e.target.value))}>
              <option value={1}>Yes</option>
              <option value={0}>No</option>
            </select>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Any extra context or instructions…" rows={3} />
          </div>
        </Section>

        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>⚠ {error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('tasks')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>

      {/* Subtask manager — only for saved tasks with split_into_subtasks='Yes' */}
      {isEdit && form.split_into_subtasks === 'Yes' && (
        <div className="card" style={{ marginBottom: 40 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Subtasks</div>

          {loadingSubs ? <div className="loading">Loading…</div> : (
            <>
              {subtasks.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>No subtasks yet.</div>}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={subtasks} strategy={verticalListSortingStrategy}>
                  {subtasks.map((sub, i) => (
                    <SortableSubtaskItem key={sub.id} sub={sub} i={i} removeSubtask={removeSubtask} />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add subtask inline */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <input className="form-input" placeholder="Subtask name…" value={newSub.subtask_name}
                  onChange={e => setNewSub(p => ({ ...p, subtask_name: e.target.value }))}
                  style={{ flex: 2, minWidth: 180 }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} />
                <input className="form-input" type="number" placeholder="Min" value={newSub.est_minutes}
                  onChange={e => setNewSub(p => ({ ...p, est_minutes: e.target.value }))} style={{ width: 70 }} />
                <input className="form-input" type="date" value={newSub.due_date}
                  onChange={e => setNewSub(p => ({ ...p, due_date: e.target.value }))} style={{ width: 140 }} />
                <select className="form-select" value={newSub.owner}
                  onChange={e => setNewSub(p => ({ ...p, owner: e.target.value }))} style={{ width: 100 }}>
                  {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button type="button" className="btn btn-secondary" onClick={addSubtask}>+ Add</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-label">{title}</div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
