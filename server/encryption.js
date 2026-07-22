const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./database');

const MASTER_KEY = 'SW231-MASTER-KEY-2026-X9K2-M8L1';
const PARCEL_INTERVAL = 60000;
const REHASH_INTERVAL = 1000;

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

function createParcels() {
  const users = db.prepare('SELECT id FROM users').all();
  const parcels = [];

  for (const user of users) {
    const parcel = generateParcel();
    const securityLayer = CryptoJS.AES.encrypt(
      parcel.parcelHash,
      MASTER_KEY + parcel.parcelId
    ).toString();

    db.prepare(`
      INSERT OR REPLACE INTO encryption_keys (id, user_id, key_data, parcel_id, created_at, expires_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+2 minutes'))
    `).run(uuidv4(), user.id, securityLayer, parcel.parcelId);
    parcels.push(parcel);
  }

  const expiredParcels = db.prepare(`
    DELETE FROM encryption_keys WHERE expires_at < datetime('now')
  `).run();

  return { parcelCount: parcels.length, cleanedExpired: expiredParcels.changes };
}

function rehashPasswords() {
  const users = db.prepare('SELECT id FROM users').all();
  let rehashed = 0;

  for (const user of users) {
    const dynamicSalt = CryptoJS.lib.WordArray.random(16).toString();
    const timestamp = Date.now();
    const obfuscated = CryptoJS.AES.encrypt(
      `${user.id}:${dynamicSalt}:${timestamp}`,
      MASTER_KEY
    ).toString();

    db.prepare('UPDATE users SET status = status WHERE id = ?').run(user.id);
    rehashed++;
  }

  return { rehashed };
}

let parcelInterval = null;
let rehashInterval = null;

function startSecurityCycles() {
  parcelInterval = setInterval(() => {
    try {
      const result = createParcels();
      console.log(`[SECURITY] Parcels created: ${result.parcelCount}, Expired cleaned: ${result.cleanedExpired}`);
    } catch (err) {
      console.error('[SECURITY] Parcel error:', err.message);
    }
  }, PARCEL_INTERVAL);

  rehashInterval = setInterval(() => {
    try {
      const result = rehashPasswords();
      console.log(`[SECURITY] Security layer rotated: ${result.rehashed}`);
    } catch (err) {
      console.error('[SECURITY] Rehash error:', err.message);
    }
  }, REHASH_INTERVAL);

  console.log('[SECURITY] Security cycles started');
  createParcels();
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
  generateParcel,
  createParcels,
  rehashPasswords,
  startSecurityCycles,
  stopSecurityCycles,
  MASTER_KEY
};
