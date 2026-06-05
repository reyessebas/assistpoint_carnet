const crypto = require('crypto');

const SCRYPT_KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEY_LENGTH).toString('hex');

  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('scrypt$')) {
    return false;
  }

  const [, salt, hash] = storedHash.split('$');
  if (!salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(String(password), salt, SCRYPT_KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');

  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

module.exports = {
  hashPassword,
  verifyPassword
};
