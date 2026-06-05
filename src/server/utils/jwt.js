const crypto = require('crypto');
const config = require('../../../config/environment');

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const jwt = {
  generateToken: (payload, expiresInSeconds) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = Object.assign({}, payload, { iat: now, exp: now + Number(expiresInSeconds) });

    const headerB64 = base64url(JSON.stringify(header));
    const bodyB64 = base64url(JSON.stringify(body));
    const signature = sign(`${headerB64}.${bodyB64}`, config.JWT_SECRET);
    return `${headerB64}.${bodyB64}.${signature}`;
  },

  verifyToken: (token) => {
    if (!token) throw new Error('No token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed token');
    const [headerB64, bodyB64, signature] = parts;
    const expected = sign(`${headerB64}.${bodyB64}`, config.JWT_SECRET);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new Error('Invalid signature');
    }
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) throw new Error('Token expired');
    return payload;
  },

  generateAccessToken: (user) => jwt.generateToken({ sub: user.email, role: user.role || 'user' }, config.ACCESS_TOKEN_EXPIRES),
  generateRefreshToken: (user) => jwt.generateToken({ sub: user.email }, config.REFRESH_TOKEN_EXPIRES),
};

module.exports = jwt;
