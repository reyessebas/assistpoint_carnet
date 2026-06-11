/**
 * Admin User Initializer
 *
 * Ensures the admin user exists in the database with the correct hashed
 * password. Uses the same scrypt hashing scheme as password.js.
 *
 * Called once during server startup, after the database schema is ready.
 * Safe to run on every startup — it upserts rather than failing on duplicates.
 */

'use strict';

const mysql = require('mysql2/promise');
const config = require('../../../config/environment');
const { hashPassword } = require('./password');
const logger = require('./logger');

const ADMIN_EMAIL = 'admin@assistpoint.co';
const ADMIN_PASSWORD = 'Admin123456!';

async function initAdmin() {
  const connection = await mysql.createConnection({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD,
    database: config.MYSQL_DATABASE,
  });

  try {
    const passwordHash = hashPassword(ADMIN_PASSWORD);

    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [ADMIN_EMAIL]
    );

    if (rows.length === 0) {
      await connection.execute(
        'INSERT INTO users (email, passwordHash, role, isActive) VALUES (?, ?, ?, 1)',
        [ADMIN_EMAIL, passwordHash, 'admin']
      );
      logger.info(`[initAdmin] Admin user created: ${ADMIN_EMAIL}`);
    } else {
      await connection.execute(
        'UPDATE users SET passwordHash = ?, role = ?, isActive = 1 WHERE email = ?',
        [passwordHash, 'admin', ADMIN_EMAIL]
      );
      logger.info(`[initAdmin] Admin user updated: ${ADMIN_EMAIL}`);
    }
  } finally {
    await connection.end();
  }
}

module.exports = initAdmin;
