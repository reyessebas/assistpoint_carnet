/**
 * Simple validation and sanitization utilities for Person data
 */

const allowedStatuses = ['Activo', 'Inactivo', 'Retirado', 'Suspendido'];

function sanitizeString(value) {
  if (value == null) return '';
  let s = String(value).trim();
  // remove HTML tags
  s = s.replace(/<[^>]*>/g, '');
  // basic encode of angle brackets and ampersand
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return s;
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

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString().slice(0, 10);
  }
  const s = sanitizeString(value || '');
  if (!s) return '';
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const slashDate = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (slashDate) {
    const first = Number(slashDate[1]);
    const second = Number(slashDate[2]);
    const year = slashDate[3];
    const month = second > 12 ? first : second;
    const day = second > 12 ? second : first;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return s;
}

function isValidDateValue(value) {
  if (!value) return true;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidPhone(value) {
  if (!value) return true;
  return /^[0-9+\-\s()]{7,20}$/.test(String(value));
}

function validatePersonData(input = {}) {
  const errors = [];
  const normalizedStatus = sanitizeString(input.status || 'Activo') || 'Activo';
  const data = {
    fullName: sanitizeString(input.fullName),
    documentNumber: sanitizeString(input.documentNumber),
    department: sanitizeString(input.department),
    role: sanitizeString(input.role),
    site: sanitizeString(input.site || 'Colina') || 'Colina',
    status: normalizedStatus === 'Vacaciones' ? 'Suspendido' : normalizedStatus,
    mode: sanitizeString(input.mode || 'Presencial') || 'Presencial',
    employeeCode: sanitizeString(input.employeeCode || ''),
    phone: sanitizeString(input.phone || ''),
    bloodType: sanitizeString(input.bloodType || ''),
    emergencyContact: sanitizeString(input.emergencyContact || ''),
    startDate: normalizeDate(input.startDate || ''),
    observations: sanitizeString(input.observations || ''),
    avatar: sanitizeString(input.avatar || 'img/defecto_perfil.jpeg') || 'img/defecto_perfil.jpeg'
  };

  // required fields
  ['fullName', 'documentNumber', 'department', 'role'].forEach((f) => {
    if (!data[f]) errors.push(`${f} is required`);
    if (data[f] && data[f].length > 255) errors.push(`${f} must be <= 255 chars`);
  });

  if (data.fullName && data.fullName.length < 1) errors.push('fullName too short');

  if (!data.department) errors.push('department is required');
  if (!data.role) errors.push('role is required');
  if (!data.documentNumber) errors.push('documentNumber is required');
  if (!data.site) errors.push('site is required');
  if (data.status && !allowedStatuses.includes(data.status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (data.mode && data.mode.length > 80) errors.push('mode must be <= 80 chars');
  if (data.bloodType && data.bloodType.length > 10) errors.push('bloodType must be <= 10 chars');
  if (data.emergencyContact && data.emergencyContact.length > 180) errors.push('emergencyContact must be <= 180 chars');

  if (!isValidDateValue(data.startDate)) {
    errors.push('startDate must use YYYY-MM-DD format');
  }

  if (!isValidPhone(data.phone)) {
    errors.push('phone has invalid format');
  }

  // avatar URL optional but if present should look like URL/path
  if (input.avatar && input.avatar.length > 0 && !isValidUrl(input.avatar) && !input.avatar.startsWith('img/')) {
    errors.push('avatar must be a valid URL, data image, or start with img/');
  }

  return { valid: errors.length === 0, errors, data };
}

module.exports = { validatePersonData, sanitizeString };
