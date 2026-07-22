const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

async function startServer() {
  const { initDatabase } = require('./database');
  await initDatabase();

  const { firewallMiddleware } = require('./middleware/firewall');
  const { startSecurityCycles } = require('./encryption');
  const { initSocket } = require('./socket/socketHandler');

  const authRoutes = require('./routes/authRoutes');
  const messageRoutes = require('./routes/messageRoutes');
  const userRoutes = require('./routes/userRoutes');
  const adminRoutes = require('./routes/adminRoutes');
  const mediaRoutes = require('./routes/mediaRoutes');
  const conversationRoutes = require('./routes/conversationRoutes');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(firewallMiddleware);

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/conversations', conversationRoutes);

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.get('/sw231', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  app.use((err, req, res, next) => {
    console.error('[SERVER] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  initSocket(io);
  startSecurityCycles();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     SW231 Messenger Server Running          ║
║     Port: ${PORT}                              ║
║     Chat:  http://localhost:${PORT}             ║
║     Admin: http://localhost:${PORT}/sw231       ║
╚══════════════════════════════════════════════╝
    `);
  });

  return { app, server, io };
}

startServer().catch(err => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});
