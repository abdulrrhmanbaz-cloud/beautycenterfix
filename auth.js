const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verify(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verify(token, process.env.TOKEN_SECRET || 'dev-secret');
  if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'Admin login required' });
  req.admin = payload;
  next();
}

module.exports = { sign, requireAdmin };
