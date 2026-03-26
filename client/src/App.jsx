import React, { useState } from 'react';
import { getMondayOfWeek } from './api.js';
import WeeklyPlanner from './pages/WeeklyPlanner.jsx';
import TaskLibrary from './pages/TaskLibrary.jsx';
import TaskForm from './pages/TaskForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Rewards from './pages/Rewards.jsx';

const NAV = [
  { key: 'weekly',    icon: '📅', label: 'Weekly Planner' },
  { key: 'tasks',     icon: '📋', label: 'Task Library' },
  { key: 'new-task',  icon: '➕', label: 'New Task' },
  { key: 'dashboard', icon: '📊', label: 'Analytics' },
  { key: 'rewards',   icon: '🎁', label: 'Rewards' },
];

export default function App() {
  const [page, setPage] = useState('weekly');
  const [editingTask, setEditingTask] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(getMondayOfWeek());

  function navigate(key, state = null) {
    if (key === 'edit-task') { setEditingTask(state); setPage('new-task'); }
    else { setEditingTask(null); setPage(key); }
  }

  return (
    <div id="root">
      <aside className="sidebar">
        <div className="sidebar-logo">🏠 Home Ops</div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.key} className={`sidebar-link${page === n.key ? ' active' : ''}`}
              onClick={() => navigate(n.key)}>
              <span className="sidebar-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#475569' }}>
          Local dev · SQLite
        </div>
      </aside>
      <main className="main">
        {page === 'weekly' && (
          <WeeklyPlanner currentWeek={currentWeek} setCurrentWeek={setCurrentWeek} navigate={navigate} />
        )}
        {page === 'tasks' && (
          <TaskLibrary navigate={navigate} />
        )}
        {page === 'new-task' && (
          <TaskForm editingTask={editingTask} navigate={navigate} />
        )}
        {page === 'dashboard' && (
          <Dashboard />
        )}
        {page === 'rewards' && (
          <Rewards />
        )}
      </main>
    </div>
  );
}
