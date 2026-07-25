const { getSupabase } = require('../db');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const suspiciousPatterns = /(<script|javascript:|on\w+\s*=|union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*set|exec\s*\(|execute\s*\(|--;|\bexec\b|\.exe|\.bat|\.cmd|<iframe|<object|<embed|<applet|data:text\/html|vbscript:|expression\s*\()/i;
const sqlInjection = /(\b(union|select|insert|update|delete|drop|alter|create|truncate|exec|execute|xp_|sp_|0x)\b.*\b(from|into|where|table|database)\b)/i;
const pathTraversal = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|%2e%2e\\)/i;
const blockedUserAgents = /sqlmap|nikto|nessus|openvas|masscan|nmap|dirbuster|gobuster|wfuzz|hydra|medusa|burpsuite/i;

const ipBlacklist = new Set();
const ipRequestCounts = new Map();
const requestCounts = new Map();
const blockedPatterns = new Map();
let lastAuditHash = 'genesis';

function firewallMiddleware(req, res, next) {
  if (req.path.startsWith('/uploads') || req.path.includes('.js') || req.path.includes('.css') || req.path.includes('.ico') || req.path.includes('.png') || req.path.includes('.svg')) {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress || '';
  const userId = req.user?.id;

  if (ipBlacklist.has(ip)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const ua = req.headers['user-agent'] || '';
  if (blockedUserAgents.test(ua)) {
    logFirewallEvent(userId, ip, 'scanner_detected', `UA: ${ua.substring(0, 100)}`, 'high');
    ipBlacklist.add(ip);
    return res.status(403).json({ error: 'Access denied' });
  }

  const fullUrl = (req.url + JSON.stringify(req.body || {})).toLowerCase();
  if (suspiciousPatterns.test(fullUrl) || sqlInjection.test(fullUrl)) {
    const pattern = fullUrl.match(suspiciousPatterns)?.[0] || 'unknown';
    const count = (blockedPatterns.get(pattern) || 0) + 1;
    blockedPatterns.set(pattern, count);
    logFirewallEvent(userId, ip, 'suspicious_input', `Pattern: ${pattern} on ${req.method} ${req.path}`, 'high');
    return res.status(403).json({ error: 'Request blocked by security' });
  }

  if (pathTraversal.test(req.url)) {
    logFirewallEvent(userId, ip, 'path_traversal', req.url, 'high');
    return res.status(403).json({ error: 'Request blocked' });
  }

  const key = userId || ip;
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now - entry.start > 60000) {
    requestCounts.set(key, { start: now, count: 1 });
  } else {
    entry.count++;
    if (entry.count > 200) {
      logFirewallEvent(userId, ip, 'rate_exceeded', `Count: ${entry.count}`, 'medium');
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
  }

  const ipKey = 'ip:' + ip;
  const ipEntry = ipRequestCounts.get(ipKey);
  if (!ipEntry || now - ipEntry.start > 60000) {
    ipRequestCounts.set(ipKey, { start: now, count: 1 });
  } else {
    ipEntry.count++;
    if (ipEntry.count > 500) {
      ipBlacklist.add(ip);
      logFirewallEvent(userId, ip, 'ip_auto_blocked', `Count: ${ipEntry.count}`, 'high');
      return res.status(429).json({ error: 'Too many requests' });
    }
  }

  res.on('finish', () => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logFirewallEvent(userId, ip, 'client_error', `${req.method} ${req.path} → ${res.statusCode}`, 'low');
    } else if (res.statusCode >= 500) {
      logFirewallEvent(userId, ip, 'server_error', `${req.method} ${req.path} → ${res.statusCode}`, 'high');
    }
  });

  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now - entry.start > 120000) requestCounts.delete(key);
  }
  for (const [key, entry] of ipRequestCounts.entries()) {
    if (now - entry.start > 120000) ipRequestCounts.delete(key);
  }
  for (const [pattern, count] of blockedPatterns.entries()) {
    if (count > 100) blockedPatterns.delete(pattern);
  }
}, 60000);

async function logFirewallEvent(userId, ip, type, details, severity) {
  try {
    const sb = getSupabase();
    const prevHash = lastAuditHash;
    const blockHash = require('crypto').createHash('sha256')
      .update(prevHash + type + details + Date.now()).digest('hex');
    lastAuditHash = blockHash;

    await sb.from('firewall_logs').insert([{
      id: uuidv4(), user_id: userId, ip_address: ip,
      event_type: type, details: details, severity: severity
    }]);
  } catch {}
}

async function logAdminAction(adminId, action, targetType, targetId, details) {
  try {
    const sb = getSupabase();
    const prevHash = lastAuditHash;
    const blockHash = require('crypto').createHash('sha256')
      .update(prevHash + adminId + action + details + Date.now()).digest('hex');
    lastAuditHash = blockHash;

    await sb.from('admin_logs').insert([{
      id: uuidv4(), admin_id: adminId, action, target_type: targetType,
      target_id: targetId, details, prev_hash: prevHash, block_hash: blockHash
    }]);
  } catch {}
}

module.exports = { firewallMiddleware, logAdminAction, logFirewallEvent };
