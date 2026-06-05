/**
 * Simple in-memory rate limiter per IP (sliding window)
 * Not suitable for multi-instance production; use Redis or external store.
 */

const config = require('../../../config/environment');

class RateLimiter {
  constructor() {
    this.map = new Map(); // ip -> { count, windowStart }
    this.window = config.RATE_LIMIT_WINDOW || 900; // seconds
    this.max = config.RATE_LIMIT_MAX || 100;
    // periodic cleanup
    setInterval(() => this.cleanup(), this.window * 1000);
  }

  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    for (const [ip, info] of this.map.entries()) {
      if (info.windowStart + this.window < now) this.map.delete(ip);
    }
  }

  check(ip) {
    const now = Math.floor(Date.now() / 1000);
    const info = this.map.get(ip);
    if (!info || info.windowStart + this.window < now) {
      this.map.set(ip, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.max - 1, reset: now + this.window };
    }

    if (info.count >= this.max) {
      return { allowed: false, remaining: 0, reset: info.windowStart + this.window };
    }

    info.count += 1;
    this.map.set(ip, info);
    return { allowed: true, remaining: this.max - info.count, reset: info.windowStart + this.window };
  }
}

module.exports = new RateLimiter();
