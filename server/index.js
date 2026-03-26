const express = require('express');
const cors = require('cors');
const path = require('path');

// Auto-seed on startup
require('./seed');

const tasksRouter = require('./routes/tasks');
const weeklyRouter = require('./routes/weekly');
const subtasksRouter = require('./routes/subtasks');
const analyticsRouter = require('./routes/analytics');
const rewardsRouter = require('./routes/rewards');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// API routes
app.use('/api/tasks', tasksRouter);
app.use('/api/weekly', weeklyRouter);
app.use('/api/subtasks', subtasksRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/rewards', rewardsRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// In production: serve the built frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

app.listen(PORT, () => {
  console.log(`\n🏠 Home Ops server running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
});
