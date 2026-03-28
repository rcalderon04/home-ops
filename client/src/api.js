const BASE = '/api';
const TOKEN_KEY = 'home_ops_auth_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const token = getAuthToken();
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 401) {
      window.dispatchEvent(new Event('home-ops-unauthorized'));
      const authError = new Error(err.error || 'Unauthorized');
      authError.code = 'UNAUTHORIZED';
      throw authError;
    }
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Auth
  getAuthStatus: () => request('GET', '/auth/status'),
  login: (password) => request('POST', '/auth/login', { password }),

  // Tasks
  getTasks: (params = {}) => request('GET', '/tasks?' + new URLSearchParams(params)),
  getTask: (id) => request('GET', `/tasks/${id}`),
  createTask: (data) => request('POST', '/tasks', data),
  updateTask: (id, data) => request('PUT', `/tasks/${id}`, data),
  deleteTask: (id) => request('DELETE', `/tasks/${id}`),
  completeTaskNow: (id, data = {}) => request('POST', `/tasks/${id}/complete-now`, data),

  // Weekly planner
  getWeekly: (week) => request('GET', `/weekly?week=${week}`),
  addToWeek: (data) => request('POST', '/weekly', data),
  updateWeekItem: (id, data) => request('PUT', `/weekly/${id}`, data),
  removeFromWeek: (id) => request('DELETE', `/weekly/${id}`),

  // Subtasks
  getSubtasks: (task_id) => request('GET', `/subtasks?task_id=${task_id}`),
  createSubtask: (data) => request('POST', '/subtasks', data),
  updateSubtask: (id, data) => request('PUT', `/subtasks/${id}`, data),
  deleteSubtask: (id) => request('DELETE', `/subtasks/${id}`),
  reorderSubtasks: (subtaskIds) => request('POST', '/subtasks/reorder', { subtaskIds }),

  // Analytics
  getAnalytics: (months = 6) => request('GET', `/analytics?months=${months}`),

  // Rewards
  getRewards: () => request('GET', '/rewards'),
  createRewardRule: (data) => request('POST', '/rewards/rules', data),
  updateRewardRule: (id, data) => request('PUT', `/rewards/rules/${id}`, data),
  deleteRewardRule: (id) => request('DELETE', `/rewards/rules/${id}`),
  cashinReward: (data) => request('POST', '/rewards/cashin', data),
  undoCashin: (id) => request('DELETE', `/rewards/cashin/${id}`),
};

// Date helpers
export function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function formatWeekRange(weekStart) {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

export const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Deferred'];
export const STATUS_COLORS = {
  'Not Started': '#6b7280',
  'In Progress': '#d97706',
  'Completed': '#16a34a',
  'Deferred': '#9333ea'
};

export const CATEGORY_OPTIONS = [
  'Weekly Chore', 'Monthly Chore', 'Deep Clean', 'Quarterly Maintenance',
  'Yearly Maintenance', 'Yard', 'Project'
];
export const AREA_OPTIONS = [
  'Kitchen', 'Bathroom', 'Living Areas', 'Bedroom', 'Laundry', 'Utility/HVAC',
  'Roof/Gutters', 'Yard/Lawn', 'Front Yard', 'Driveway/Walkway', 'Patio/Deck',
  'Windows', 'Plumbing', 'Safety'
];
export const CADENCE_OPTIONS = ['One-off', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Yearly'];
export const DAYS_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const OWNER_OPTIONS = ['Ryan', 'Bayley', 'Either'];
export const SEASON_OPTIONS = ['Any', 'Spring', 'Summer', 'Fall', 'Winter'];
export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
