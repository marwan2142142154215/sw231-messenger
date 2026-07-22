const rateLimit = require('express-rate-limit');

const ipRequestCounts = new Map();
const blockedIPs = new Map();
const suspiciousPatterns = [
  /(<script[\s>])/i,
  /(union\s+select)/i,
  /(drop\s+table)/i,
  /(insert\s+into)/i,
  /(delete\s+from)/i,
  /(eval\s*\()/i,
  /(document\.cookie)/i,
  /(window\.location)/i,
  /(\.\.\/)/,
  /(\/etc\/passwd)/i,
  /(\/bin\/bash)/i,
  /(cmd\.exe)/i,
  /(powershell)/i,
];

const MAX_REQUESTS_PER_MINUTE = 100;
const BLOCK_DURATION = 300000;
const SUSPICIOUS_THRESHOLD = 20;

function getIP(req) {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
}

function firewallMiddleware(req, res, next) {
  const ip = getIP(req);
  const now = Date.now();

  if (blockedIPs.has(ip)) {
    const blockExpiry = blockedIPs.get(ip);
    if (now < blockExpiry) {
      console.log(`[FIREWALL] Blocked request from ${ip}`);
      return res.status(403).json({
        error: 'Akses diblokir oleh firewall.',
        retryAfter: Math.ceil((blockExpiry - now) / 1000)
      });
    } else {
      blockedIPs.delete(ip);
      ipRequestCounts.delete(ip);
    }
  }

  const requestData = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      console.log(`[FIREWALL] Suspicious pattern detected from ${ip}: ${pattern}`);

      const count = (ipRequestCounts.get(ip) || { count: 0, suspicious: 0 });
      count.suspicious = (count.suspicious || 0) + 1;
      ipRequestCounts.set(ip, count);

      if (count.suspicious >= 3) {
        blockedIPs.set(ip, now + BLOCK_DURATION);
        console.log(`[FIREWALL] IP ${ip} blocked for ${BLOCK_DURATION/1000}s due to suspicious activity`);
        return res.status(403).json({ error: 'Akses diblokir karena aktivitas mencurigakan.' });
      }

      return res.status(400).json({ error: 'Request ditolak oleh firewall.' });
    }
  }

  const reqCount = ipRequestCounts.get(ip) || { count: 0, suspicious: 0, windowStart: now };

  if (now - reqCount.windowStart > 60000) {
    reqCount.count = 1;
    reqCount.windowStart = now;
  } else {
    reqCount.count++;
  }

  ipRequestCounts.set(ip, reqCount);

  if (reqCount.count > MAX_REQUESTS_PER_MINUTE) {
    blockedIPs.set(ip, now + BLOCK_DURATION);
    console.log(`[FIREWALL] IP ${ip} blocked for rate limiting`);
    return res.status(429).json({ error: 'Terlalu banyak request. Coba lagi nanti.' });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
}

function getFirewallStats() {
  return {
    blockedIPs: Array.from(blockedIPs.entries()).map(([ip, expiry]) => ({
      ip,
      expiresAt: new Date(expiry).toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
    })),
    activeIPs: ipRequestCounts.size,
    totalBlocked: blockedIPs.size
  };
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Terlalu banyak request. Silakan coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  firewallMiddleware,
  getFirewallStats,
  apiLimiter,
  authLimiter
};
