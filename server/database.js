const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'messenger.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'messenger.backup.db');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let _db = null;
let _sql = null;

function saveDb() {
  if (!_db) return;
  try {
    const data = _db.export();
    const buf = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buf);
    fs.writeFileSync(BACKUP_PATH, buf);
  } catch(e) { console.error('[DB] Save error:', e.message); }
}

function exportDbBase64() {
  if (!_db) return null;
  const data = _db.export();
  return Buffer.from(data).toString('base64');
}

function importDbBase64(b64) {
  if (!_db || !_sql) return false;
  try {
    const buf = Buffer.from(b64, 'base64');
    _db = new _sql.Database(buf);
    saveDb();
    return true;
  } catch(e) {
    console.error('[DB] Import error:', e.message);
    return false;
  }
}

const db = {
  prepare(sql) {
    return {
      get(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          results.push(row);
        }
        stmt.free();
        return results;
      },
      run(...params) {
        _db.run(sql, params);
        saveDb();
        return { changes: _db.getRowsModified() };
      }
    };
  },
  exec(sql) {
    _db.exec(sql);
    saveDb();
  }
};

async function initDatabase() {
  _sql = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new _sql.Database(fileBuffer);
    console.log('[DB] Loaded from main database file');
  } else if (fs.existsSync(BACKUP_PATH)) {
    const fileBuffer = fs.readFileSync(BACKUP_PATH);
    _db = new _sql.Database(fileBuffer);
    console.log('[DB] Restored from backup file');
    saveDb();
  } else {
    _db = new _sql.Database();
    console.log('[DB] Created new empty database');
  }

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL, avatar_url TEXT DEFAULT '/img/default-avatar.png',
      role TEXT DEFAULT 'user', status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_approved INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'private', name TEXT,
      created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL,
      content TEXT NOT NULL, type TEXT DEFAULT 'text', reply_to TEXT,
      is_edited INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY, message_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS read_receipts (
      message_id TEXT NOT NULL, user_id TEXT NOT NULL, read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS encryption_keys (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, key_data TEXT NOT NULL, parcel_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, target_user TEXT, admin_id TEXT NOT NULL,
      details TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS blocked_users (
      blocker_id TEXT NOT NULL, blocked_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_id, blocked_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL,
      ip_address TEXT, user_agent TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS typing_indicators (
      conversation_id TEXT NOT NULL, user_id TEXT NOT NULL, is_typing INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (conversation_id, user_id)
    )`
  ];

  for (const t of tables) { db.exec(t); }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('oktagram');
  if (!existing) {
    const hash = bcrypt.hashSync('P@ipet2026', 12);
    db.prepare(`INSERT INTO users (id, username, password_hash, display_name, role, is_approved) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uuidv4(), 'oktagram', hash, 'Master Admin', 'master', 1);
    console.log('[DB] Admin account created: oktagram');
  }

  saveDb();
  setInterval(saveDb, 30000);
  console.log('[DB] Database initialized');
}

module.exports = { db, initDatabase, exportDbBase64, importDbBase64 };
