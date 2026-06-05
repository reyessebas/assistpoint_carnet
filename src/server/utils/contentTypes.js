/**
 * Content Type Utilities
 * Mapea extensiones de archivos a tipos MIME
 */

const contentTypeMap = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const contentTypes = {
  /**
   * Obtiene el tipo MIME de una ruta de archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {string} Tipo MIME
   */
  getForFile: (filePath) => {
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return contentTypeMap[ext] || 'application/octet-stream';
  }
};

module.exports = contentTypes;
