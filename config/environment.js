/**
 * Environment Configuration
 * Centraliza la configuración de variables de entorno
 */

require('dotenv').config();

const crypto = require('crypto');

const NODE_ENV = process.env.NODE_ENV || 'development';
const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'assist_point';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

console.log(`[CONFIG] Loading environment configuration (NODE_ENV=${NODE_ENV})`);

function assertProductionSafety() {
  if (NODE_ENV !== 'production') {
    console.log('[CONFIG] Non-production environment — skipping strict variable checks.');
    return;
  }

  console.log('[CONFIG] Production environment detected — validating required variables...');

  const errors = [];

  if (!process.env.JWT_SECRET) {
    errors.push(
      'JWT_SECRET is missing. ' +
      'Set a strong random string (min 32 chars) via the JWT_SECRET environment variable.'
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    errors.push(
      'ADMIN_PASSWORD is missing. ' +
      'Set a strong password via the ADMIN_PASSWORD environment variable.'
    );
  }

  const missingMySql = [];
  if (!process.env.MYSQL_HOST) missingMySql.push('MYSQL_HOST');
  if (!process.env.MYSQL_USER) missingMySql.push('MYSQL_USER');
  if (!process.env.MYSQL_PASSWORD) missingMySql.push('MYSQL_PASSWORD');
  if (!process.env.MYSQL_DATABASE) missingMySql.push('MYSQL_DATABASE');

  if (missingMySql.length > 0) {
    errors.push(
      `Missing required MySQL environment variable(s): ${missingMySql.join(', ')}. ` +
      'All four MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE must be set in production. ' +
      'See .env.example for the full list of required variables.'
    );
  }

  if (!missingMySql.includes('MYSQL_HOST') && (MYSQL_HOST === '127.0.0.1' || MYSQL_HOST === 'localhost')) {
    errors.push(
      `MYSQL_HOST is set to "${MYSQL_HOST}", which points to localhost. ` +
      'In production, MYSQL_HOST must point to a persistent remote database (e.g. your Railway MySQL service host).'
    );
  }

  if (errors.length > 0) {
    console.error('[CONFIG] ❌ Production configuration errors detected:');
    errors.forEach((msg, i) => console.error(`  [${i + 1}] ${msg}`));
    console.error('[CONFIG] Refer to .env.example for a complete list of required environment variables.');
    throw new Error(
      `Server cannot start: ${errors.length} configuration error(s) found in production. ` +
      'See the logs above for details.'
    );
  }

  console.log('[CONFIG] ✅ All required production variables are present.');
}

assertProductionSafety();

const config = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV,

  // MySQL data store
  MYSQL_HOST,
  MYSQL_PORT: Number(process.env.MYSQL_PORT) || 3306,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_CONNECTION_LIMIT: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
  // Rate limiting (window in seconds, max requests per window)
  RATE_LIMIT_WINDOW: Number(process.env.RATE_LIMIT_WINDOW) || 900, // 15 minutes
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,

  // API
  API_PREFIX: '/api',
  PUBLIC_APP_URL,
  // Serve Angular/static frontend from backend (false for separated architecture)
  SERVE_FRONTEND: process.env.SERVE_FRONTEND === 'true' || false,

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:4200', 'http://localhost:3000'],
  // Auth / Tokens
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRES: Number(process.env.ACCESS_TOKEN_EXPIRES) || 900, // seconds (15m)
  REFRESH_TOKEN_EXPIRES: Number(process.env.REFRESH_TOKEN_EXPIRES) || 604800, // seconds (7d)
  // Default admin credentials (for demo only)
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@assistpoint.co',
  ADMIN_PASSWORD,
  // HTTPS
  USE_HTTPS: process.env.USE_HTTPS === 'true' || false,
  TLS_KEY_PATH: process.env.TLS_KEY_PATH || './certs/key.pem',
  TLS_CERT_PATH: process.env.TLS_CERT_PATH || './certs/cert.pem',
};

/**
 * Logs all loaded configuration values at startup.
 * Secrets (JWT_SECRET, ADMIN_PASSWORD, MYSQL_PASSWORD) are never exposed.
 */
function logStartupConfig() {
  console.log('[CONFIG] ── Loaded configuration ──────────────────────────');
  console.log(`[CONFIG]   NODE_ENV              : ${config.NODE_ENV}`);
  console.log(`[CONFIG]   PORT                  : ${config.PORT}`);
  console.log(`[CONFIG]   PUBLIC_APP_URL         : ${config.PUBLIC_APP_URL}`);
  console.log(`[CONFIG]   SERVE_FRONTEND         : ${config.SERVE_FRONTEND}`);
  console.log(`[CONFIG]   USE_HTTPS              : ${config.USE_HTTPS}`);
  console.log(`[CONFIG]   MYSQL_HOST             : ${config.MYSQL_HOST}`);
  console.log(`[CONFIG]   MYSQL_PORT             : ${config.MYSQL_PORT}`);
  console.log(`[CONFIG]   MYSQL_USER             : ${config.MYSQL_USER}`);
  console.log(`[CONFIG]   MYSQL_DATABASE         : ${config.MYSQL_DATABASE}`);
  console.log(`[CONFIG]   MYSQL_CONNECTION_LIMIT : ${config.MYSQL_CONNECTION_LIMIT}`);
  console.log(`[CONFIG]   ADMIN_EMAIL            : ${config.ADMIN_EMAIL}`);
  console.log(`[CONFIG]   CORS_ORIGINS           : ${Array.isArray(config.CORS_ORIGINS) ? config.CORS_ORIGINS.join(', ') : config.CORS_ORIGINS}`);
  console.log(`[CONFIG]   RATE_LIMIT_WINDOW      : ${config.RATE_LIMIT_WINDOW}s`);
  console.log(`[CONFIG]   RATE_LIMIT_MAX         : ${config.RATE_LIMIT_MAX} req/window`);
  console.log(`[CONFIG]   ACCESS_TOKEN_EXPIRES   : ${config.ACCESS_TOKEN_EXPIRES}s`);
  console.log(`[CONFIG]   REFRESH_TOKEN_EXPIRES  : ${config.REFRESH_TOKEN_EXPIRES}s`);
  console.log(`[CONFIG]   JWT_SECRET             : ${'*'.repeat(12)} (set=${!!process.env.JWT_SECRET})`);
  console.log(`[CONFIG]   ADMIN_PASSWORD         : ${'*'.repeat(12)} (set=${!!process.env.ADMIN_PASSWORD})`);
  console.log(`[CONFIG]   MYSQL_PASSWORD         : ${'*'.repeat(12)} (set=${!!process.env.MYSQL_PASSWORD})`);
  console.log('[CONFIG] ───────────────────────────────────────────────────');
}

config.logStartupConfig = logStartupConfig;

module.exports = config;
