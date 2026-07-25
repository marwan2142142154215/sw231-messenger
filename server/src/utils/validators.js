const xss = require('xss');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return xss(str.trim());
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = typeof v === 'string' ? sanitize(v) : v;
  }
  return clean;
}

function validateUsername(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(u);
}

function validatePassword(p) {
  return typeof p === 'string' && p.length >= 6 && p.length <= 128;
}

function validateEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

module.exports = { sanitize, sanitizeObject, validateUsername, validatePassword, validateEmail };
