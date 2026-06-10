/**
 * Database Schema Initializer
 * Reads db/mysql/schema.sql and executes it against the configured MySQL instance.
 * Safe to call on every startup — all statements use CREATE TABLE IF NOT EXISTS.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../../../config/environment');
const logger = require('./logger');

const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'db', 'mysql', 'schema.sql');

async function initDb() {
  let schemaSql;
  try {
    schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  } catch (err) {
    throw new Error(`[initDb] Could not read schema file at ${SCHEMA_PATH}: ${err.message}`);
  }

  // Use a single connection (not a pool) so multipleStatements works cleanly
  const connection = await mysql.createConnection({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD,
    // No database selected — schema.sql creates it with CREATE DATABASE IF NOT EXISTS
    multipleStatements: true,
  });

  try {
    logger.info(`[initDb] Executing schema from ${SCHEMA_PATH}`);
    await connection.query(schemaSql);
    logger.info('[initDb] Schema executed successfully.');
  } finally {
    await connection.end();
  }
}

module.exports = initDb;
