const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let pool = null;

function convertSql(sql) {
  let idx = 0;
  let converted = sql
    .replace(/\?/g, () => `$${++idx}`)
    .replace(/datetime\('now'\)/g, 'NOW()')
    .replace(/datetime\('now', '\+(\d+) minutes'\)/g, "NOW() + INTERVAL '$1 minutes'")
    .replace(/datetime\('now', '\+(\d+) hours'\)/g, "NOW() + INTERVAL '$1 hours'")
    .replace(/json_group_array\(DISTINCT json_object\(/g, 'json_agg(DISTINCT json_build_object(')
    .replace(/json_group_array\(json_object\(/g, 'json_agg(json_build_object(')
    .replace(/json_object\(/g, 'json_build_object(');

  const ignoreMatch = converted.match(/^INSERT OR IGNORE INTO\s+/i);
  if (ignoreMatch) {
    converted = converted.replace(/^INSERT OR IGNORE INTO\s+/i, 'INSERT INTO ');
    if (!converted.match(/ON CONFLICT/i)) {
      converted += ' ON CONFLICT DO NOTHING';
    }
  }

  const replaceMatch = converted.match(/^INSERT OR REPLACE INTO\s+/i);
  if (replaceMatch) {
    converted = converted.replace(/^INSERT OR REPLACE INTO\s+/i, 'INSERT INTO ');
    if (!converted.match(/ON CONFLICT/i)) {
      converted += ' ON CONFLICT DO NOTHING';
    }
  }

  return { sql: converted, paramCount: idx };
}

const db = {
  prepare(sql) {
    const { sql: pgSql } = convertSql(sql);

    return {
      async get(...params) {
        const result = await pool.query(pgSql, params);
        return result.rows[0] || undefined;
      },
      async all(...params) {
        const result = await pool.query(pgSql, params);
        return result.rows;
      },
      async run(...params) {
        const result = await pool.query(pgSql, params);
        return { changes: result.rowCount };
      }
    };
  },

  async exec(sql) {
    const { sql: pgSql } = convertSql(sql);
    await pool.query(pgSql);
  }
};

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('[DB] DATABASE_URL environment variable is required. Set it to your Supabase PostgreSQL connection string.');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err.message);
  });

  console.log('[DB] Connecting to PostgreSQL...');
  const client = await pool.connect();
  try {
    console.log('[DB] Connected to PostgreSQL');
  } finally {
    client.release();
  }

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL, avatar_url TEXT DEFAULT '/img/default-avatar.png',
      role TEXT DEFAULT 'user', status TEXT DEFAULT 'offline',
      last_seen TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW(),
      is_approved INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'private', name TEXT,
      created_by TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL,
      content TEXT NOT NULL, type TEXT DEFAULT 'text', reply_to TEXT,
      is_edited INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY, message_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS read_receipts (
      message_id TEXT NOT NULL, user_id TEXT NOT NULL, read_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS encryption_keys (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, key_data TEXT NOT NULL, parcel_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS admin_logs (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, target_user TEXT, admin_id TEXT NOT NULL,
      details TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS blocked_users (
      blocker_id TEXT NOT NULL, blocked_id TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL,
      ip_address TEXT, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS typing_indicators (
      conversation_id TEXT NOT NULL, user_id TEXT NOT NULL, is_typing INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (conversation_id, user_id)
    )`
  ];

  for (const t of tables) {
    await db.exec(t);
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = $1').get('oktagram');
  if (!existing) {
    const hash = bcrypt.hashSync('P@ipet2026', 12);
    await db.prepare(`INSERT INTO users (id, username, password_hash, display_name, role, is_approved) VALUES ($1, $2, $3, $4, $5, $6)`)
      .run(uuidv4(), 'oktagram', hash, 'Master Admin', 'master', 1);
    console.log('[DB] Admin account created: oktagram');
  }

  console.log('[DB] Database initialized');
}

module.exports = { db, initDatabase };
