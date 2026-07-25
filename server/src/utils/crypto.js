const sodium = require('libsodium-wrappers');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const keyCache = new Map();

async function initSodium() {
  await sodium;
}

function generateConversationKey(conversationId) {
  let key = keyCache.get(conversationId);
  if (!key) {
    key = CryptoJS.SHA256(conversationId + config.masterKey).toString();
    keyCache.set(conversationId, key);
  }
  return key;
}

function encryptMessage(text, conversationKey) {
  return CryptoJS.AES.encrypt(text, conversationKey).toString();
}

function decryptMessage(ciphertext, conversationKey) {
  try {
    const dec = CryptoJS.AES.decrypt(ciphertext, conversationKey);
    return dec.toString(CryptoJS.enc.Utf8);
  } catch { return ciphertext; }
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateQRToken(userId) {
  return { token: uuidv4(), expiresAt: new Date(Date.now() + 5 * 60 * 1000) };
}

module.exports = {
  initSodium, generateConversationKey, encryptMessage, decryptMessage,
  hashPassword, verifyPassword, generateQRToken
};
