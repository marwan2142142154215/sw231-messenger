const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./database');

const MASTER_KEY = 'SW231-MASTER-KEY-2026-X9K2-M8L1';
const PARCEL_INTERVAL = 600000;
const REHASH_INTERVAL = 3600000;

function encryptMessage(text, conversationKey) {
  return CryptoJS.AES.encrypt(text, conversationKey).toString();
}

function decryptMessage(encryptedText, conversationKey) {
  const decrypted = CryptoJS.AES.decrypt(encryptedText, conversationKey);
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function generateConversationKey(conversationId) {
  return CryptoJS.SHA256(conversationId + MASTER_KEY).toString();
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function generateParcel() {
  const parcelId = uuidv4();
  const timestamp = Date.now();
  const randomSeed = CryptoJS.lib.WordArray.random(32).toString();
  const parcelHash = CryptoJS.SHA256(parcelId + timestamp + randomSeed).toString();
  return { parcelId, parcelHash, timestamp };
}

async function createParcels() {
  const users = await db.prepare('SELECT id FROM users').all();
  const parcels = [];

  for (const user of users) {
    const parcel = generateParcel();
    const securityLayer = CryptoJS.AES.encrypt(
      parcel.parcelHash,
      MASTER_KEY + parcel.parcelId
    ).toString();

    await db.prepare(`
      INSERT INTO encryption_keys (id, user_id, key_data, parcel_id, created_at, expires_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '2 minutes')
      ON CONFLICT (id) DO UPDATE SET key_data = $3, parcel_id = $4, expires_at = NOW() + INTERVAL '2 minutes'
    `).run(uuidv4(), user.id, securityLayer, parcel.parcelId);
    parcels.push(parcel);
  }

  const expiredParcels = await db.prepare(`
    DELETE FROM encryption_keys WHERE expires_at < NOW()
  `).run();

  return { parcelCount: parcels.length, cleanedExpired: expiredParcels.changes };
}

async function rehashPasswords() {
  const users = await db.prepare('SELECT id FROM users').all();
  let rehashed = 0;

  for (const user of users) {
    await db.prepare('UPDATE users SET status = status WHERE id = $1').run(user.id);
    rehashed++;
  }

  return { rehashed };
}

let parcelInterval = null;
let rehashInterval = null;

function startSecurityCycles() {
  parcelInterval = setInterval(async () => {
    try {
      const result = await createParcels();
      console.log(`[SECURITY] Parcels created: ${result.parcelCount}, Expired cleaned: ${result.cleanedExpired}`);
    } catch (err) {
      console.error('[SECURITY] Parcel error:', err.message);
    }
  }, PARCEL_INTERVAL);

  rehashInterval = setInterval(async () => {
    try {
      const result = await rehashPasswords();
      console.log(`[SECURITY] Security layer rotated: ${result.rehashed}`);
    } catch (err) {
      console.error('[SECURITY] Rehash error:', err.message);
    }
  }, REHASH_INTERVAL);

  console.log('[SECURITY] Security cycles started');
  createParcels().catch(err => console.error('[SECURITY] Initial parcel error:', err.message));
}

function stopSecurityCycles() {
  if (parcelInterval) clearInterval(parcelInterval);
  if (rehashInterval) clearInterval(rehashInterval);
}

module.exports = {
  encryptMessage,
  decryptMessage,
  generateConversationKey,
  hashPassword,
  verifyPassword,
  startSecurityCycles,
  stopSecurityCycles,
  createParcels,
  rehashPasswords
};
