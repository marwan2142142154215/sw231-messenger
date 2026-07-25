const { getSupabase } = require('../db');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const suspiciousPatterns = /(<script|javascript:|on\w+\s*=|union\s+select|drop\s+table|insert\s+into|--;|\bexec\b)/i;
const requestCounts = new Map();
let lastAuditHash = 'genesis';

function firewallMiddleware(req, res, next) {
  if (req.path.startsWith('/uploads') || req.path.includes('.js') || req.path.includes('.css') || req.path.includes('.ico')) {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user?.id;
  
  if (suspiciousPatterns.test(req.url) || suspiciousPatterns.test(JSON.stringify(req.body || {}))) {
    logFirewallEvent(userId, ip, 'suspicious_input', req.url, 'high');
    return res.status(403).json({ error: 'Request blocked by security' });
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
  
  res.on('finish', () => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logFirewallEvent(userId, ip, 'client_error', `${req.method} ${req.path} → ${res.statusCode}`, 'low');
    } else if (res.statusCode >= 500) {
      logFirewallEvent(userId, ip, 'server_error', `${req.method} ${req.path} → ${res.statusCode}`, 'high');
    }
  });
  
  next();
}

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
