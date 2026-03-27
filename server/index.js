const express = require('express');
const cors = require('cors');
const path = require('path');

const { seed } = require('./seed');
const { requireAuth } = require('./auth');

const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const weeklyRouter = require('./routes/weekly');
const subtasksRouter = require('./routes/subtasks');
const analyticsRouter = require('./routes/analytics');
const rewardsRouter = require('./routes/rewards');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';
const AUTO_SEED = process.env.AUTO_SEED === 'true';

if (AUTO_SEED) {
  seed();
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || NODE_ENV === 'production') {
      callback(null, true);
      return;
    }

    callback(null, origin === APP_ORIGIN);
  }
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/weekly', requireAuth, weeklyRouter);
app.use('/api/subtasks', requireAuth, subtasksRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/rewards', requireAuth, rewardsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Home Ops server running at http://localhost:${PORT}`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
  console.log(`NODE_ENV=${NODE_ENV} AUTO_SEED=${AUTO_SEED}`);
});
