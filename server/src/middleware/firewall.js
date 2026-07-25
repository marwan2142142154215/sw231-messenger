const { getSupabase } = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const suspiciousPatterns = /(<script|javascript:|on\w+\s*=|union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*set|exec\s*\(|execute\s*\(|--;|\bexec\b|\.exe|\.bat|\.cmd|<iframe|<object|<embed|<applet|data:text\/html|vbscript:|expression\s*\(|<\?php|<%|eval\s*\(|require\s*\(|import\s*\(|fetch\s*\(|XMLHttpRequest|ActiveXObject)/i;
const sqlInjection = /(\b(union|select|insert|update|delete|drop|alter|create|truncate|exec|execute|xp_|sp_|0x)\b.*\b(from|into|where|table|database)\b)|(\b(or|and)\b\s+\d+\s*=\s*\d+)|(';\s*(drop|delete|update|insert|alter)\s)/i;
const pathTraversal = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|%2e%2e\\|%2f\.\.|\.\.%2f|%5c\.\.|\.\.%5c|\.%2e|\.%2e%2f|%00)/i;
const blockedUserAgents = /sqlmap|nikto|nessus|openvas|masscan|nmap|dirbuster|gobuster|wfuzz|hydra|medusa|burpsuite|acunetix|appscan|w3af|skipfish|arachni|whatweb|zmeu|masscan|zgrab|censys|shodan/i;
const xssPatterns = /<img[^>]+onerror|<svg[^>]+onload|<body[^>]+onload|<input[^>]+onfocus|<marquee[^>]+onstart|document\.cookie|document\.write|window\.location|\.innerHTML|\.outerHTML|eval\(|setTimeout\s*\(|setInterval\s*\(/i;

const ipBlacklist = new Set();
const ipRequestCounts = new Map();
const requestCounts = new Map();
const blockedPatterns = new Map();
const ipBlockTimestamps = new Map();
let lastAuditHash = 'genesis';

const MAX_URL_LENGTH = 2048;
const MAX_BODY_SIZE = 5 * 1024 * 1024;
const MAX_HEADER_LENGTH = 8192;

function firewallMiddleware(req, res, next) {
  if (req.path.startsWith('/uploads') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.ico') || req.path.endsWith('.png') || req.path.endsWith('.svg') || req.path.endsWith('.woff2') || req.path.endsWith('.woff') || req.path.endsWith('.ttf')) {
    return next();
  }

  const ip = req.ip || req.connection?.remoteAddress || '';
  const userId = req.user?.id;
  const now = Date.now();

  if (ipBlacklist.has(ip)) {
    const blockTime = ipBlockTimestamps.get(ip);
    if (blockTime && now - blockTime > 3600000) {
      ipBlacklist.delete(ip);
      ipBlockTimestamps.delete(ip);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  if (req.url.length > MAX_URL_LENGTH) {
    logFirewallEvent(userId, ip, 'url_too_long', `Length: ${req.url.length}`, 'medium');
    return res.status(413).json({ error: 'Request too long' });
  }

  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_BODY_SIZE) {
    logFirewallEvent(userId, ip, 'body_too_large', `Size: ${contentLength}`, 'medium');
    return res.status(413).json({ error: 'Request body too large' });
  }

  const ua = req.headers['user-agent'] || '';
  if (ua.length > MAX_HEADER_LENGTH) {
    logFirewallEvent(userId, ip, 'header_too_long', 'User-Agent oversized', 'medium');
    return res.status(431).json({ error: 'Request header too large' });
  }
  if (!ua || ua.length < 5) {
    logFirewallEvent(userId, ip, 'missing_ua', 'No or minimal User-Agent', 'low');
  }
  if (blockedUserAgents.test(ua)) {
    logFirewallEvent(userId, ip, 'scanner_detected', `UA: ${ua.substring(0, 100)}`, 'high');
    ipBlacklist.add(ip);
    ipBlockTimestamps.set(ip, now);
    return res.status(403).json({ error: 'Access denied' });
  }

  const fullUrl = (req.url + JSON.stringify(req.body || {})).toLowerCase();
  if (suspiciousPatterns.test(fullUrl) || sqlInjection.test(fullUrl) || xssPatterns.test(fullUrl)) {
    const pattern = fullUrl.match(suspiciousPatterns)?.[0] || fullUrl.match(sqlInjection)?.[0] || fullUrl.match(xssPatterns)?.[0] || 'unknown';
    const count = (blockedPatterns.get(pattern) || 0) + 1;
    blockedPatterns.set(pattern, count);
    logFirewallEvent(userId, ip, 'suspicious_input', `Pattern: ${pattern} on ${req.method} ${req.path}`, 'high');
    return res.status(403).json({ error: 'Request blocked by security' });
  }

  if (pathTraversal.test(req.url)) {
    logFirewallEvent(userId, ip, 'path_traversal', req.url.substring(0, 200), 'high');
    ipBlacklist.add(ip);
    ipBlockTimestamps.set(ip, now);
    return res.status(403).json({ error: 'Request blocked' });
  }

  const key = userId || ip;
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
      ipBlockTimestamps.set(ip, now);
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
    if (count > 100 || now > 600000) blockedPatterns.delete(pattern);
  }
  for (const [ip, ts] of ipBlockTimestamps.entries()) {
    if (now - ts > 3600000) { ipBlacklist.delete(ip); ipBlockTimestamps.delete(ip); }
  }
}, 60000);

async function logFirewallEvent(userId, ip, type, details, severity) {
  try {
    const sb = getSupabase();
    const prevHash = lastAuditHash;
    const blockHash = crypto.createHash('sha256')
      .update(prevHash + type + details + Date.now()).digest('hex');
    lastAuditHash = blockHash;

    await sb.from('firewall_logs').insert([{
      id: uuidv4(), user_id: userId, ip_address: ip,
      event_type: type, details: details.substring(0, 500), severity: severity
    }]);
  } catch {}
}

async function logAdminAction(adminId, action, targetType, targetId, details) {
  try {
    const sb = getSupabase();
    const prevHash = lastAuditHash;
    const blockHash = crypto.createHash('sha256')
      .update(prevHash + adminId + action + details + Date.now()).digest('hex');
    lastAuditHash = blockHash;

    await sb.from('admin_logs').insert([{
      id: uuidv4(), admin_id: adminId, action, target_type: targetType,
      target_id: targetId, details, prev_hash: prevHash, block_hash: blockHash
    }]);
  } catch {}
}

module.exports = { firewallMiddleware, logAdminAction, logFirewallEvent };
