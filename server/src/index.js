require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { initDB } = require('./db');
const { initSodium } = require('./utils/crypto');
const { firewallMiddleware } = require('./middleware/firewall');
const { globalLimiter } = require('./middleware/rateLimiter');
const { initSocket } = require('./socket/handler');

async function startServer() {
  await initDB();
  await initSodium();

  const { getSupabase } = require('./db');
  const { hashPassword } = require('./utils/crypto');
  const { v4: uuidv4 } = require('uuid');
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('admins').select('id').limit(1);
    if (!existing || existing.length === 0) {
      const hash = await hashPassword('P@ipet2026');
      await sb.from('admins').insert([{
        id: uuidv4(), username: 'oktagram', password_hash: hash,
        display_name: 'Oktagram Admin', totp_enabled: false
      }]);
      console.log('[ADMIN] Default admin created: oktagram / P@ipet2026');
    }
  } catch (e) {
    console.error('[ADMIN] Auto-create admin failed (table may not exist yet):', e.message);
  }

  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const friendRoutes = require('./routes/friends');
  const conversationRoutes = require('./routes/conversations');
  const messageRoutes = require('./routes/messages');
  const socialRoutes = require('./routes/social');
  const marketplaceRoutes = require('./routes/marketplace');
  const mediaRoutes = require('./routes/media');
  const adminRoutes = require('./routes/admin');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 10e6
  });

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(firewallMiddleware);
  app.use(globalLimiter);

  app.use(express.static(path.join(__dirname, '../../uploads'), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist, {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error('[SERVER] Error:', err.message);
    if (err.message === 'File type not allowed') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  });

  initSocket(io);

  const PORT = config.port;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NYXORA] Server running on port ${PORT}`);
    console.log(`[NYXORA] Environment: ${config.nodeEnv}`);
  });

  process.on('SIGTERM', () => {
    console.log('[NYXORA] Shutting down...');
    io.close();
    server.close(() => process.exit(0));
  });

  return { app, server, io };
}

startServer().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
