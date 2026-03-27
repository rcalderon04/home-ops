import React, { useEffect, useState } from 'react';
import { api, getAuthToken, getMondayOfWeek, setAuthToken } from './api.js';
import WeeklyPlanner from './pages/WeeklyPlanner.jsx';
import TaskLibrary from './pages/TaskLibrary.jsx';
import TaskForm from './pages/TaskForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Rewards from './pages/Rewards.jsx';

const NAV = [
  { key: 'weekly', icon: 'Planner', label: 'Weekly Planner' },
  { key: 'tasks', icon: 'Tasks', label: 'Task Library' },
  { key: 'new-task', icon: 'New', label: 'New Task' },
  { key: 'dashboard', icon: 'Stats', label: 'Analytics' },
  { key: 'rewards', icon: 'Rewards', label: 'Rewards' }
];

export default function App() {
  const [page, setPage] = useState('weekly');
  const [editingTask, setEditingTask] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(getMondayOfWeek());
  const [authState, setAuthState] = useState({
    loading: true,
    authRequired: false,
    authenticated: false
  });

  useEffect(() => {
    loadAuthStatus();

    function handleUnauthorized() {
      setAuthToken(null);
      setAuthState({ loading: false, authRequired: true, authenticated: false });
    }

    window.addEventListener('home-ops-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('home-ops-unauthorized', handleUnauthorized);
  }, []);

  async function loadAuthStatus() {
    try {
      const result = await api.getAuthStatus();
      setAuthState({
        loading: false,
        authRequired: result.authRequired,
        authenticated: result.authenticated
      });
    } catch {
      const hasToken = Boolean(getAuthToken());
      setAuthState({
        loading: false,
        authRequired: hasToken,
        authenticated: false
      });
    }
  }

  function navigate(key, state = null) {
    if (key === 'edit-task') {
      setEditingTask(state);
      setPage('new-task');
      return;
    }

    setEditingTask(null);
    setPage(key);
  }

  function handleLogin(token) {
    setAuthToken(token);
    setAuthState({ loading: false, authRequired: true, authenticated: true });
  }

  function handleLogout() {
    setAuthToken(null);
    setAuthState({ loading: false, authRequired: true, authenticated: false });
  }

  if (authState.loading) {
    return <div className="loading-shell">Checking access…</div>;
  }

  if (authState.authRequired && !authState.authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppErrorBoundary onLogout={handleLogout}>
      <div id="root">
        <aside className="sidebar">
          <div className="sidebar-logo">Home Ops</div>
          <nav className="sidebar-nav">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={`sidebar-link${page === n.key ? ' active' : ''}`}
                onClick={() => navigate(n.key)}
              >
                <span className="sidebar-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
              Log Out
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>
              Shared home dashboard
            </div>
          </div>
        </aside>
        <main className="main">
          {page === 'weekly' && <WeeklyPlanner currentWeek={currentWeek} setCurrentWeek={setCurrentWeek} navigate={navigate} />}
          {page === 'tasks' && <TaskLibrary navigate={navigate} />}
          {page === 'new-task' && <TaskForm editingTask={editingTask} navigate={navigate} />}
          {page === 'dashboard' && <Dashboard />}
          {page === 'rewards' && <Rewards />}
        </main>
      </div>
    </AppErrorBoundary>
  );
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login(password);
      if (result.token) {
        onLogin(result.token);
      } else {
        onLogin(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to log in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-eyebrow">Private Home App</div>
        <h1 className="auth-title">Home Ops</h1>
        <p className="auth-copy">Enter the shared household password to access the planner, tasks, and rewards.</p>
        <form onSubmit={submit} className="auth-form">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-input auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shared password"
            autoComplete="current-password"
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary" disabled={loading || !password.trim()} type="submit">
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('App render error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-shell">
          <div className="auth-card">
            <div className="auth-eyebrow">Something went wrong</div>
            <h1 className="auth-title">App Error</h1>
            <p className="auth-copy">
              The app hit a runtime error after sign-in. The message below will help us pinpoint it.
            </p>
            <div className="auth-error-box">{this.state.error.message || 'Unknown error'}</div>
            <button className="btn btn-secondary" onClick={this.props.onLogout}>Back To Login</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
