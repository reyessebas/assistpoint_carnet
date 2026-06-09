/**
 * Environment Configuration
 * Centraliza la configuración de variables de entorno
 */

require('dotenv').config();

const DEFAULT_JWT_SECRET = 'change_this_secret_in_production';
const DEFAULT_ADMIN_PASSWORD = 'Admin123';
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATA_DB = process.env.DATA_DB || 'json';
const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'assist_point';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

function assertProductionSafety() {
  if (NODE_ENV !== 'production') {
    return;
  }

  if (!process.env.JWT_SECRET || JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a strong value in production.');
  }

  if (!process.env.ADMIN_PASSWORD || ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD must be set to a strong value in production.');
  }

  if (DATA_DB === 'mysql') {
    const missingMySql = [];

    if (!process.env.MYSQL_HOST) missingMySql.push('MYSQL_HOST');
    if (!process.env.MYSQL_USER) missingMySql.push('MYSQL_USER');
    if (!process.env.MYSQL_PASSWORD) missingMySql.push('MYSQL_PASSWORD');
    if (!process.env.MYSQL_DATABASE) missingMySql.push('MYSQL_DATABASE');

    if (missingMySql.length > 0) {
      throw new Error(`Missing required MySQL env vars in production: ${missingMySql.join(', ')}`);
    }

    if (MYSQL_HOST === '127.0.0.1' || MYSQL_HOST === 'localhost') {
      throw new Error('MYSQL_HOST must point to a persistent remote database in production.');
    }
  }
}

assertProductionSafety();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV,

  // Data
  DATA_DIR: process.env.DATA_DIR || './data',
  // Data backend: 'json' (default), 'sqlite', or 'mysql'
  DATA_DB,
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
