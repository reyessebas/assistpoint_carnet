/**
 * Auth Routes
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 */

const BodyParser = require('../utils/BodyParser');
const responseHandler = require('../utils/responseHandler');
const jwt = require('../utils/jwt');
const authStore = require('../utils/authStore');
const config = require('../../../config/environment');

class AuthRoutes {
  constructor() {}

  async route(request, response, pathname) {
    const method = request.method;

    // POST /api/auth/login
    if (method === 'POST' && pathname === '/api/auth/login') {
      try {
        const body = await BodyParser.parse(request);
        const { email, password } = body || {};
        if (!email || !password) return responseHandler.badRequest(response, 'Email and password required', request);

        const user = await authStore.findUserByCredentials(email, password);
        if (!user) {
          return responseHandler.unauthorized(response, 'Invalid credentials', request);
        }

        const accessToken = jwt.generateAccessToken(user);
        const refreshToken = jwt.generateRefreshToken(user);
        const now = Math.floor(Date.now() / 1000);
        const refreshPayload = jwt.verifyToken(refreshToken);
        const expiresAt = refreshPayload.exp || now + config.REFRESH_TOKEN_EXPIRES;
        await authStore.add(refreshToken, user.email, expiresAt);

        responseHandler.ok(response, {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: config.ACCESS_TOKEN_EXPIRES
        }, request);
      } catch (err) {
        responseHandler.badRequest(response, err.message, request);
      }
      return;
    }

    // POST /api/auth/refresh
    if (method === 'POST' && pathname === '/api/auth/refresh') {
      try {
        const body = await BodyParser.parse(request);
        const { refreshToken } = body || {};
        if (!refreshToken) return responseHandler.badRequest(response, 'refreshToken required', request);
        // verify signature and expiry
        try {
          const payload = jwt.verifyToken(refreshToken);
          const stored = await authStore.exists(refreshToken);
          if (!stored) return responseHandler.unauthorized(response, 'Invalid refresh token', request);

          const user = await authStore.findUserByEmail(payload.sub);
          if (!user) return responseHandler.unauthorized(response, 'Invalid refresh token', request);

          const accessToken = jwt.generateAccessToken(user);
          responseHandler.ok(response, { accessToken, expiresIn: config.ACCESS_TOKEN_EXPIRES }, request);
        } catch (err) {
          return responseHandler.unauthorized(response, err.message, request);
        }
      } catch (err) {
        responseHandler.badRequest(response, err.message, request);
      }
      return;
    }

    // POST /api/auth/logout
    if (method === 'POST' && pathname === '/api/auth/logout') {
      try {
        const body = await BodyParser.parse(request);
        const { refreshToken } = body || {};
        if (!refreshToken) return responseHandler.badRequest(response, 'refreshToken required', request);
        await authStore.remove(refreshToken);
        responseHandler.ok(response, { message: 'Logged out' }, request);
      } catch (err) {
        responseHandler.badRequest(response, err.message, request);
      }
      return;
    }

    responseHandler.notFound(response, 'Auth endpoint not found', request);
  }
}

module.exports = AuthRoutes;
