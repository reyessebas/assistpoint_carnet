/**
 * Assist Point Server
 * Servidor Express-like puro de Node.js
 * 
 * Uso: node src/server/index.js
 * Variables de entorno: PORT (default 3000)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Configuración
const config = require('../../config/environment');
const logger = require('./utils/logger');

// Modelos
const MySqlPeopleModel = require('./models/MySqlPeopleModel');

// Controladores
const PeopleController = require('./controllers/PeopleController');

// Routers
const PeopleRouter = require('./routes/peopleRoutes');
const AuthRoutes = require('./routes/authRoutes');

// Handlers
const StaticHandler = require('./handlers/StaticHandler');
const rateLimiter = require('./utils/rateLimiter');

/**
 * Inicializar aplicación
 */
function createServer() {
  // Inicializar modelo de datos
  const peopleModel = new MySqlPeopleModel();
  const peopleController = new PeopleController(peopleModel);
  const peopleRouter = new PeopleRouter(peopleController);
  const staticHandler = config.SERVE_FRONTEND
    ? new StaticHandler(path.join(__dirname, '../../'), {
        production: config.NODE_ENV === 'production'
      })
    : null;

  // Request handler
  const handler = async (request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);
      const { pathname } = requestUrl;

      logger.debug(`${request.method} ${pathname}`);

      // CORS headers
      const reqOrigin = request.headers.origin;
      const allowedOrigins = Array.isArray(config.CORS_ORIGINS) ? config.CORS_ORIGINS : [];
      if (reqOrigin && allowedOrigins.includes(reqOrigin)) {
        response.setHeader('Access-Control-Allow-Origin', reqOrigin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Credentials', 'true');
      } else if (!reqOrigin) {
        response.setHeader('Access-Control-Allow-Origin', '*');
      }
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Security headers
      if (config.USE_HTTPS) {
        response.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
      }
      response.setHeader('X-Frame-Options', 'DENY');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
      response.setHeader('Permissions-Policy', "camera=(), microphone=(), geolocation=()");
      // Content Security Policy - basic default (adjust per frontend needs)
      response.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' data:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:");

      // Rate limiting (by IP)
      const clientIp = request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || 'unknown';
      const rl = rateLimiter.check(clientIp);
      response.setHeader('X-RateLimit-Limit', String(require('../../config/environment').RATE_LIMIT_MAX));
      response.setHeader('X-RateLimit-Remaining', String(rl.remaining));
      response.setHeader('X-RateLimit-Reset', String(rl.reset));
      if (!rl.allowed) {
        response.writeHead(429, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Too many requests' }));
        return;
      }

      // Manejo de OPTIONS
      if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
      }

      // Enrutamiento
      if (pathname.startsWith('/api/auth')) {
        const authRoutes = new AuthRoutes();
        await authRoutes.route(request, response, pathname);
      } else if (pathname.startsWith('/api/people') || pathname.startsWith('/api/catalogs') || pathname.startsWith('/api/carnets')) {
        await peopleRouter.route(request, response, pathname);
      } else {
        if (staticHandler) {
          staticHandler.handle(request, response, pathname);
        } else {
          response.writeHead(404, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'Not found. Frontend is served separately.' }));
        }
      }
    } catch (error) {
      logger.error('Server error', error);
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Internal server error' }));
    }
  };

  // Create HTTP or HTTPS server based on config
  let server;
  if (config.USE_HTTPS) {
    try {
      const key = fs.readFileSync(config.TLS_KEY_PATH);
      const cert = fs.readFileSync(config.TLS_CERT_PATH);
      server = https.createServer({ key, cert }, handler);
      logger.info('HTTPS enabled using TLS cert/key');
    } catch (err) {
      logger.error('Failed to read TLS cert/key, falling back to HTTP', err);
      server = http.createServer(handler);
    }
  } else {
    server = http.createServer(handler);
  }

  return server;
}

/**
 * Iniciar servidor
 */
async function start() {
  try {
    logger.info('🔧 Assist Point Server — starting up...');

    // Log all resolved config values (secrets are masked)
    if (typeof config.logStartupConfig === 'function') {
      config.logStartupConfig();
    }

    logger.info(`📦 Node.js ${process.version} | PID ${process.pid}`);
    logger.info(`🌍 Environment : ${config.NODE_ENV}`);
    logger.info(`🔌 Port        : ${config.PORT}`);

    // Verify database connectivity before accepting traffic
    logger.info(`🗄️  Connecting to MySQL at ${config.MYSQL_HOST}:${config.MYSQL_PORT}/${config.MYSQL_DATABASE}...`);
    const mysql = require('mysql2/promise');
    const probePool = mysql.createPool({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      connectionLimit: 1,
    });
    try {
      const [rows] = await probePool.query('SELECT 1 AS ok');
      if (rows[0]?.ok === 1) {
        logger.info('✅ MySQL connection successful.');
      }
    } catch (dbError) {
      logger.error(
        `❌ MySQL connection failed: ${dbError.message}. ` +
        'Check MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.',
        dbError
      );
      // Do not exit — the model will surface the error on first query and Railway will restart.
    } finally {
      await probePool.end().catch(() => {});
    }

    const server = createServer();
    const port = config.PORT;

    server.listen(port, () => {
      logger.info(`🚀 Assist Point Server listening on port ${port}`);
      logger.info(`🌐 Public URL  : ${config.PUBLIC_APP_URL}`);
      logger.info(`🧩 Frontend    : ${config.SERVE_FRONTEND ? 'served from backend' : 'served separately'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

  } catch (error) {
    // Catch errors thrown during config validation or server creation (e.g. missing env vars)
    console.error('[FATAL] Server failed to start:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  start();
}

module.exports = { createServer };
