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
        display_name: 'Oktagram Admin', totp_enabled: 0
      }]);
      console.log('[ADMIN] Default admin created: oktagram / P@ipet2026');
    }
  } catch (e) {
    console.error('[ADMIN] Auto-create admin failed (table may not exist yet):', e.message);
  }

  try {
    const sb = getSupabase();
    const { error } = await sb.rpc('get_messages_fast', { p_conv_id: '00000000-0000-0000-0000-000000000000', p_limit: 1 });
    if (!error || !error.message?.includes('function')) {
      console.log('[DB] RPC functions detected - ultra-fast mode enabled');
    } else {
      console.log('[DB] RPC not found - run migrations/003_rpc_functions.sql in Supabase SQL editor for 20x speed boost');
    }
  } catch (e) {
    console.log('[DB] RPC check skipped');
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
  const gifRoutes = require('./routes/gifs');

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
  const isProd = config.nodeEnv === 'production';
  app.use(cors({
    origin: isProd ? true : [config.clientUrl, 'http://localhost:5173'],
    credentials: true
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(firewallMiddleware);
  app.use(globalLimiter);

  app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
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
  app.use('/api/media', gifRoutes);

  app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0-fkfix', timestamp: new Date().toISOString() }));

  app.get('/api/debug', async (req, res) => {
    try {
      const sb = getSupabase();
      const tables = ['users','admins','sessions','admin_sessions','conversations','conversation_members','messages','read_receipts','reactions','friends','qr_tokens','message_requests','posts','post_likes','post_comments','stories','story_views','listings','follows','blocked_users','admin_logs','feature_flags','firewall_logs','encryption_keys'];
      const results = {};
      for (const t of tables) {
        const { error } = await sb.from(t).select('*').limit(1);
        results[t] = error ? error.message : 'OK';
      }
      res.json({ tables: results, env: { supabaseUrl: !!config.supabase.url, anonKey: !!config.supabase.anonKey, serviceKey: !!config.supabase.serviceKey, jwt: !!config.jwt.secret } });
    } catch (e) {
      res.json({ error: e.message });
    }
  });

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

  const WEEKLY_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;
  async function weeklyCleanup() {
    try {
      const sb = getSupabase();
      const weekAgo = new Date(Date.now() - WEEKLY_CLEANUP_INTERVAL).toISOString();
      console.log(`[CLEANUP] Running weekly cleanup, deleting data older than ${weekAgo}`);
      const tables = ['messages', 'read_receipts', 'reactions', 'firewall_logs', 'admin_logs', 'story_views', 'sessions', 'admin_sessions', 'qr_tokens'];
      for (const t of tables) {
        const { error } = await sb.from(t).delete().lt('created_at', weekAgo);
        if (error) console.warn(`[CLEANUP] ${t}: ${error.message}`);
        else console.log(`[CLEANUP] ${t}: deleted old records`);
      }
      const { error: storiesErr } = await sb.from('stories').delete().lt('expires_at', new Date().toISOString());
      if (storiesErr) console.warn(`[CLEANUP] stories: ${storiesErr.message}`);
      else console.log('[CLEANUP] stories: deleted expired');
      console.log('[CLEANUP] Weekly cleanup done');
    } catch (e) {
      console.error('[CLEANUP] Error:', e.message);
    }
  }
  setInterval(weeklyCleanup, WEEKLY_CLEANUP_INTERVAL);
  setTimeout(weeklyCleanup, 30000);

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
