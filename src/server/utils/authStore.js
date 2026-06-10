const crypto = require('crypto');
const mysql = require('mysql2/promise');
const config = require('../../../config/environment');
const { hashPassword, verifyPassword } = require('./password');

let pool;
let ready;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: config.MYSQL_CONNECTION_LIMIT,
      queueLimit: 0
    });
  }

  return pool;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function toMySqlDateTime(epochSeconds) {
  return new Date(Number(epochSeconds) * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function initializeMySqlAuth() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      email VARCHAR(200) NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'admin',
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY ux_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BIGINT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      tokenHash VARCHAR(255) NOT NULL,
      expiresAt DATETIME NOT NULL,
      revokedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY ux_refresh_token_hash (tokenHash),
      KEY ix_refresh_user_id (userId),
      CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [rows] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [config.ADMIN_EMAIL]);
  if (rows.length === 0) {
    await db.execute(
      'INSERT INTO users (email, passwordHash, role, isActive) VALUES (?, ?, ?, 1)',
      [config.ADMIN_EMAIL, hashPassword(config.ADMIN_PASSWORD), 'admin']
    );
  }
}

function ensureReady() {
  if (!ready) {
    ready = initializeMySqlAuth();
  }

  return ready;
}

const authStore = {
  findUserByCredentials: async (email, password) => {
    await ensureReady();
    const [rows] = await getPool().execute(
      'SELECT id, email, passwordHash, role, isActive FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const user = rows[0];

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return null;
    }

    return { id: user.id, email: user.email, role: user.role };
  },

  findUserByEmail: async (email) => {
    await ensureReady();
    const [rows] = await getPool().execute(
      'SELECT id, email, role, isActive FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const user = rows[0];

    if (!user || !user.isActive) {
      return null;
    }

    return { id: user.id, email: user.email, role: user.role };
  },

  add: async (token, email, expiresAt) => {
    await ensureReady();
    const user = await authStore.findUserByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    await getPool().execute(
      'INSERT INTO refresh_tokens (userId, tokenHash, expiresAt) VALUES (?, ?, ?)',
      [user.id, hashToken(token), toMySqlDateTime(expiresAt)]
    );
  },

  remove: async (token) => {
    await ensureReady();
    await getPool().execute(
      'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE tokenHash = ? AND revokedAt IS NULL',
      [hashToken(token)]
    );
  },

  exists: async (token) => {
    await ensureReady();
    const [rows] = await getPool().execute(
      `SELECT rt.id, u.email, u.role
       FROM refresh_tokens rt
       INNER JOIN users u ON u.id = rt.userId
       WHERE rt.tokenHash = ?
         AND rt.revokedAt IS NULL
         AND rt.expiresAt > CURRENT_TIMESTAMP
         AND u.isActive = 1
       LIMIT 1`,
      [hashToken(token)]
    );

    return rows[0] || null;
  }
};

module.exports = authStore;
