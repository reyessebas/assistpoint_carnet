#!/usr/bin/env node
/**
 * Database Initialization Script
 * Reads db/mysql/schema.sql and executes it against the configured MySQL instance.
 *
 * Usage:
 *   node scripts/init-db.js
 *   npm run init-db
 *
 * Required environment variables (or .env file):
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'mysql', 'schema.sql');

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  // Connect without a default database so we can run CREATE DATABASE IF NOT EXISTS
  multipleStatements: true,
};

async function initDb() {
  console.log('[init-db] Reading schema from', SCHEMA_PATH);

  let schemaSql;
  try {
    schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  } catch (err) {
    console.error('[init-db] Failed to read schema file:', err.message);
    process.exit(1);
  }

  console.log(`[init-db] Connecting to MySQL at ${config.host}:${config.port} as ${config.user}`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    console.error('[init-db] Could not connect to MySQL:', err.message);
    process.exit(1);
  }

  try {
    console.log('[init-db] Executing schema...');
    await connection.query(schemaSql);
    console.log('[init-db] ✅ Database schema initialized successfully.');
  } catch (err) {
    console.error('[init-db] ❌ Failed to execute schema:', err.message);
    await connection.end();
    process.exit(1);
  }

  await connection.end();
  console.log('[init-db] Connection closed. Done.');
}

initDb();
