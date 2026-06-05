/**
 * Simple validation and sanitization utilities for Person data
 */

const allowedStatuses = ['Activo', 'Inactivo', 'Vacaciones'];
const allowedModes = ['Presencial', 'Remoto', 'Híbrido'];
const allowedSites = ['Colina', '123', 'Medellin', 'Uruguay'];

function sanitizeString(value) {
  if (value == null) return '';
  let s = String(value).trim();
  // remove HTML tags
  s = s.replace(/<[^>]*>/g, '');
  // basic encode of angle brackets and ampersand
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return s;
}

function isValidEmail(email) {
  if (!email) return false;
  // simple RFC-like regex
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(String(email).toLowerCase());
}

function isValidUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url, 'http://localhost');
    return ['http:', 'https:', 'data:'].includes(u.protocol);
  } catch (e) {
    return false;
  }
}

function validatePersonData(input = {}) {
  const errors = [];
  const data = {
    fullName: sanitizeString(input.fullName),
    email: sanitizeString(input.email),
    department: sanitizeString(input.department),
    role: sanitizeString(input.role),
    site: sanitizeString(input.site || 'Colina') || 'Colina',
    status: sanitizeString(input.status || 'Activo') || 'Activo',
    mode: sanitizeString(input.mode || 'Presencial') || 'Presencial',
    avatar: sanitizeString(input.avatar || 'img/carnet.png') || 'img/carnet.png'
  };

  // required fields
  ['fullName', 'email', 'department', 'role'].forEach((f) => {
    if (!data[f]) errors.push(`${f} is required`);
    if (data[f] && data[f].length > 255) errors.push(`${f} must be <= 255 chars`);
  });

  if (data.fullName && data.fullName.length < 1) errors.push('fullName too short');

  if (!isValidEmail(data.email)) errors.push('email is invalid');

  if (!data.department) errors.push('department is required');
  if (!data.role) errors.push('role is required');
  if (!data.site) errors.push('site is required');
  if (data.site && !allowedSites.includes(data.site)) {
    errors.push(`site must be one of: ${allowedSites.join(', ')}`);
  }

  if (data.status && !allowedStatuses.includes(data.status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (data.mode && !allowedModes.includes(data.mode)) {
    errors.push(`mode must be one of: ${allowedModes.join(', ')}`);
  }

  // avatar URL optional but if present should look like URL/path
  if (input.avatar && input.avatar.length > 0 && !isValidUrl(input.avatar) && !input.avatar.startsWith('img/')) {
    errors.push('avatar must be a valid URL, data image, or start with img/');
  }

  return { valid: errors.length === 0, errors, data };
}

module.exports = { validatePersonData, sanitizeString, isValidEmail };
