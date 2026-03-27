const express = require('express');
const { createToken, isAuthEnabled, verifyPassword, verifyToken } = require('../auth');

const router = express.Router();

router.get('/status', (req, res) => {
  const authRequired = isAuthEnabled();
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  res.json({
    authRequired,
    authenticated: authRequired ? verifyToken(token) : true
  });
});

router.post('/login', (req, res) => {
  const authRequired = isAuthEnabled();
  if (!authRequired) {
    res.json({ token: null, authRequired: false });
    return;
  }

  if (!verifyPassword(req.body.password || '')) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  res.json({
    token: createToken(),
    authRequired: true
  });
});

module.exports = router;
