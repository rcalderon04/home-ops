import React, { useState, useEffect } from 'react';
import { api, formatDate, OWNER_OPTIONS } from '../api.js';

const LEVEL_COLORS = {
  Bronze:   { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', badge: '#f59e0b' },
  Silver:   { bg: '#f1f5f9', border: '#94a3b8', text: '#475569', badge: '#64748b' },
  Gold:     { bg: '#fefce8', border: '#eab308', text: '#713f12', badge: '#ca8a04' },
  Platinum: { bg: '#f0fdf4', border: '#22c55e', text: '#14532d', badge: '#16a34a' },
  Custom:   { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', badge: '#3b82f6' },
};

const CADENCE_OPTIONS = ['Weekly', 'Monthly', 'Quarterly', 'Any time'];

export default function Rewards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewRule, setShowNewRule] = useState(false);
  const [cashinModal, setCashinModal] = useState(null); // rule being cashed in
  const [activeTab, setActiveTab] = useState('rewards'); // 'rewards' | 'history'

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setData(await api.getRewards()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function cashin(rule, owner) {
    await api.cashinReward({ rule_id: rule.id, owner });
    setCashinModal(null);
    load();
  }

  async function undoCashin(id) {
    if (!confirm('Undo this cash-in?')) return;
    await api.undoCashin(id);
    load();
  }

  async function deleteRule(id) {
    if (!confirm('Delete this reward option?')) return;
    await api.deleteRewardRule(id);
    load();
  }

  async function toggleRule(rule) {
    await api.updateRewardRule(rule.id, { is_active: rule.is_active ? 0 : 1 });
    load();
  }

  if (loading) return <div className="loading">🎁 Loading rewards…</div>;
  if (!data) return null;

  const { rules, cashins, weekPoints, monthPoints, weekSpent, monthSpent, totalBalances } = data;

  // Build balance map: earned - spent, per owner, per cadence window
  const owners = OWNER_OPTIONS;
  function getBalance(owner, pointsArr, spentArr) {
    const earned = pointsArr.find(p => p.owner === owner)?.earned || 0;
    const spent = spentArr.find(p => p.owner === owner)?.spent || 0;
    return Math.max(0, earned - spent);
  }

  const activeRules = rules.filter(r => r.is_active);
  const inactiveRules = rules.filter(r => !r.is_active);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Rewards</div>
          <div className="page-subtitle">Track earned points and cash in rewards</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewRule(true)}>+ Add Reward</button>
      </div>

      {/* Current balances */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-label">Current Balances</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {OWNER_OPTIONS.slice(0, 2).map(owner => {
            const weekBal = getBalance(owner, weekPoints, weekSpent);
            const monthBal = getBalance(owner, monthPoints, monthSpent);
            const totalBal = totalBalances[owner]?.balance || 0;
            // Find highest eligible reward
            const eligible = activeRules.filter(r => r.cadence === 'Weekly' ? weekBal >= r.min_points : monthBal >= r.min_points)
              .sort((a, b) => b.min_points - a.min_points)[0];
            return (
              <div key={owner} className="card" style={{ borderTop: `3px solid ${owner === 'Ryan' ? '#3b82f6' : '#ec4899'}` }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{owner}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{weekBal}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>This Week</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{monthBal}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>This Month</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--surface-3)', borderRadius: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{totalBal}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Total Avail</div>
                  </div>
                </div>
                {eligible ? (
                  <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, background: '#dcfce7', borderRadius: 6, padding: '6px 10px' }}>
                    🎉 Eligible: {eligible.reward}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', borderRadius: 6, padding: '6px 10px' }}>
                    {activeRules.length > 0
                      ? `Need ${activeRules[0].min_points - weekBal} more pts for ${activeRules[0].reward}`
                      : 'No rewards configured'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[['rewards', '🎁 Reward Options'], ['history', '📜 Cash-In History']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            color: activeTab === key ? 'var(--primary)' : 'var(--text-2)',
            borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1
          }}>{label}</button>
        ))}
      </div>

      {activeTab === 'rewards' && (
        <div>
          {/* Active rewards */}
          {activeRules.length === 0
            ? <div className="empty"><div className="empty-icon">🎁</div><div className="empty-title">No rewards yet</div><div className="empty-sub">Add your first reward option above</div></div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
                {activeRules.map(rule => <RewardCard key={rule.id} rule={rule} onCashin={() => setCashinModal(rule)} onDelete={() => deleteRule(rule.id)} onToggle={() => toggleRule(rule)} />)}
              </div>
            )}

          {/* Inactive */}
          {inactiveRules.length > 0 && (
            <>
              <div className="section-label">Archived Rewards</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {inactiveRules.map(rule => <RewardCard key={rule.id} rule={rule} onCashin={null} onDelete={() => deleteRule(rule.id)} onToggle={() => toggleRule(rule)} inactive />)}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0 }}>
          {cashins.length === 0
            ? <div className="empty"><div className="empty-icon">📜</div><div className="empty-title">No cash-ins yet</div></div>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reward</th>
                      <th>Level</th>
                      <th>Owner</th>
                      <th>Points</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashins.map(c => {
                      const colors = LEVEL_COLORS[c.reward_level] || LEVEL_COLORS.Custom;
                      return (
                        <tr key={c.id}>
                          <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(c.cashed_in_date)}</td>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>{c.reward_name}</td>
                          <td>
                            {c.reward_level && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                                {c.reward_level}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 13 }}>{c.owner}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{c.points_spent}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.notes || '—'}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)', fontSize: 11 }}
                              onClick={() => undoCashin(c.id)}>Undo</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* New reward modal */}
      {showNewRule && <NewRewardModal onClose={() => setShowNewRule(false)} onSave={async (data) => { await api.createRewardRule(data); setShowNewRule(false); load(); }} />}

      {/* Cash-in modal */}
      {cashinModal && <CashinModal rule={cashinModal} onClose={() => setCashinModal(null)} onConfirm={cashin} />}
    </div>
  );
}

function RewardCard({ rule, onCashin, onDelete, onToggle, inactive }) {
  const colors = LEVEL_COLORS[rule.reward_level] || LEVEL_COLORS.Custom;
  return (
    <div style={{
      border: `1px solid ${inactive ? 'var(--border)' : colors.border}`,
      borderRadius: 8, padding: '16px',
      background: inactive ? 'var(--surface-2)' : colors.bg,
      opacity: inactive ? 0.7 : 1,
      display: 'flex', flexDirection: 'column', gap: 10
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: colors.badge, color: '#fff'
        }}>{rule.reward_level}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onToggle} title={inactive ? 'Restore' : 'Archive'}
            style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 6px' }}>
            {inactive ? '▶' : '⏸'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete}
            style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 6px' }}>🗑</button>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, lineHeight: 1.3 }}>{rule.reward}</div>

      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: colors.text, opacity: 0.8 }}>
        <span>⭐ {rule.min_points}{rule.max_points < 999 ? `–${rule.max_points}` : '+'} pts</span>
        <span>·</span>
        <span>🔄 {rule.cadence}</span>
        <span>·</span>
        <span>{rule.shared_or_individual}</span>
      </div>

      {rule.notes && <div style={{ fontSize: 12, color: colors.text, opacity: 0.7 }}>{rule.notes}</div>}

      {!inactive && onCashin && (
        <button
          onClick={onCashin}
          style={{
            padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 6,
            background: '#fff', color: colors.text, fontWeight: 600, fontSize: 13,
            cursor: 'pointer', marginTop: 4
          }}
        >🎉 Cash In</button>
      )}
    </div>
  );
}

function CashinModal({ rule, onClose, onConfirm }) {
  const [owner, setOwner] = useState('Shared');
  const [notes, setNotes] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Cash In Reward</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{rule.reward}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
            {rule.min_points} pts · {rule.cadence} · {rule.reward_level}
          </div>
          <div className="form-group">
            <label className="form-label">Who is cashing in?</label>
            <select className="form-select" value={owner} onChange={e => setOwner(e.target.value)}>
              <option value="Shared">Shared</option>
              {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Thai takeout on Friday" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(rule, owner)}>✓ Confirm Cash-In</button>
        </div>
      </div>
    </div>
  );
}

function NewRewardModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    reward: '', reward_level: 'Custom', min_points: '', max_points: '',
    cadence: 'Weekly', shared_or_individual: 'Shared', notes: ''
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.reward.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      min_points: parseInt(form.min_points) || 0,
      max_points: parseInt(form.max_points) || 999,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">New Reward Option</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Reward Name *</label>
            <input className="form-input" value={form.reward} onChange={e => set('reward', e.target.value)}
              placeholder="e.g. Choose takeout night" autoFocus />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-select" value={form.reward_level} onChange={e => set('reward_level', e.target.value)}>
                {['Bronze', 'Silver', 'Gold', 'Platinum', 'Custom'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cadence</label>
              <select className="form-select" value={form.cadence} onChange={e => set('cadence', e.target.value)}>
                {CADENCE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Min Points</label>
              <input className="form-input" type="number" min="0" value={form.min_points} onChange={e => set('min_points', e.target.value)} placeholder="e.g. 25" />
            </div>
            <div className="form-group">
              <label className="form-label">Max Points</label>
              <input className="form-input" type="number" min="0" value={form.max_points} onChange={e => set('max_points', e.target.value)} placeholder="e.g. 49 (or blank for ∞)" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Shared or Individual</label>
            <select className="form-select" value={form.shared_or_individual} onChange={e => set('shared_or_individual', e.target.value)}>
              <option value="Shared">Shared</option>
              <option value="Individual">Individual</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional description…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.reward.trim() || saving}>
            {saving ? 'Saving…' : 'Create Reward'}
          </button>
        </div>
      </div>
    </div>
  );
}
