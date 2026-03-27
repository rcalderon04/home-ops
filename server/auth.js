const crypto = require('crypto');

const TOKEN_TTL_DAYS = 30;

function isAuthEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

function getSecret() {
  return process.env.AUTH_SECRET || 'dev-only-auth-secret-change-me';
}

function getPasswordBuffer() {
  return Buffer.from(process.env.APP_PASSWORD || '', 'utf8');
}

function safeEqual(input, expected) {
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input || '', 'utf8');
  const expectedBuffer = Buffer.isBuffer(expected) ? expected : Buffer.from(expected || '', 'utf8');
  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

function verifyPassword(password) {
  if (!isAuthEnabled()) return true;
  return safeEqual(password, getPasswordBuffer());
}

function encodeBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
}

function createToken() {
  const payload = JSON.stringify({
    scope: 'home-ops',
    exp: Date.now() + (TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  });
  const encoded = encodeBase64Url(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return false;

  const [encoded, providedSignature] = token.split('.');
  const expectedSignature = sign(encoded);
  if (!safeEqual(providedSignature, Buffer.from(expectedSignature, 'utf8'))) {
    return false;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    return payload.scope === 'home-ops' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length);
}

function requireAuth(req, res, next) {
  if (!isAuthEnabled()) {
    next();
    return;
  }

  const token = getBearerToken(req);
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

module.exports = {
  createToken,
  isAuthEnabled,
  requireAuth,
  verifyPassword,
  verifyToken
};
