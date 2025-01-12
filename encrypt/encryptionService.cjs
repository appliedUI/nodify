const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
let encryptionKey = null;

// Add key storage path
function getKeyStoragePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'encryption.key');
}

function loadStoredKey() {
  try {
    const keyPath = getKeyStoragePath();
    if (fs.existsSync(keyPath)) {
      encryptionKey = fs.readFileSync(keyPath, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading stored key:', error);
    return false;
  }
}

function saveKeyToDisk(key) {
  try {
    const keyPath = getKeyStoragePath();
    fs.writeFileSync(keyPath, key, 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving key:', error);
    return false;
  }
}

function setEncryptionKey(key) {
  if (!key) throw new Error('Invalid encryption key');
  encryptionKey = key;
  saveKeyToDisk(key);
  return true;
}

function getOrCreateEncryptionKey() {
  if (encryptionKey) return encryptionKey;
  if (loadStoredKey()) return encryptionKey;
  
  const newKey = crypto.randomBytes(32).toString('hex');
  setEncryptionKey(newKey);
  return newKey;
}

function encryptData(data) {
  if (!encryptionKey) throw new Error('Encryption key not set');
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptData(data) {
  if (!encryptionKey) throw new Error('Encryption key not set');
  if (!data || typeof data !== 'string') {
    throw new Error('Invalid encrypted data format: data must be a string');
  }

  const textParts = data.split(':');
  if (textParts.length !== 2) {
    throw new Error('Invalid encrypted data format: missing IV or encrypted data');
  }

  const [ivHex, encryptedHex] = textParts;
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format: empty IV or encrypted data');
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = { 
  encryptData, 
  decryptData, 
  setEncryptionKey,
  getOrCreateEncryptionKey
};
