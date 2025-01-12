const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateHash() {
  const hash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  const filePath = path.join(__dirname, 'encryptionKey.txt');
  fs.writeFileSync(filePath, hash);
  console.log(`Encryption key generated and saved to ${filePath}`);
  return hash;
}

module.exports = { generateHash };
