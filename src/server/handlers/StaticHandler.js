/**
 * Static Files Handler
 * Maneja la entrega de archivos estáticos (HTML, CSS, JS, imágenes)
 */

const fs = require('fs');
const path = require('path');
const responseHandler = require('../utils/responseHandler');
const contentTypes = require('../utils/contentTypes');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

class StaticHandler {
  constructor(rootDir, options = {}) {
    this.rootDir = rootDir;
    this.production = Boolean(options.production);
    this.assetRoots = this.getAssetRoots();
    this.spaIndexPath = this.getSpaIndexPath();
  }

  getAssetRoots() {
    const roots = [];

    const publicDir = path.join(this.rootDir, 'public');
    if (fs.existsSync(publicDir)) {
      roots.push(publicDir);
    }

    const frontendCandidates = [
      path.join(this.rootDir, 'frontend', 'dist', 'frontend', 'browser'),
      path.join(this.rootDir, 'frontend', 'dist', 'frontend'),
      path.join(this.rootDir, 'dist', 'frontend', 'browser'),
      path.join(this.rootDir, 'dist', 'frontend')
    ];

    frontendCandidates.forEach((candidate) => {
      if (fs.existsSync(candidate)) {
        roots.unshift(candidate);
      }
    });

    return roots;
  }

  getSpaIndexPath() {
    for (const root of this.assetRoots) {
      const indexPath = path.join(root, 'index.html');
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  /**
   * Sirve archivos estáticos
   * @param {object} request - Objeto request
   * @param {object} response - Objeto response
   * @param {string} pathname - Ruta solicitada
   */
  handle(request, response, pathname) {
    // Manejo de rutas especiales
    const normalizedPath = pathname === '/' ? '/index.html' : pathname;
    const isAssetRequest = path.extname(normalizedPath) !== '';

    for (const rootDir of this.assetRoots) {
      const filePath = path.normalize(path.join(rootDir, normalizedPath));

      const relativePath = path.relative(rootDir, filePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        continue;
      }

      const fileContent = fileSystem.readFile(filePath);
      if (fileContent) {
        const contentType = contentTypes.getForFile(filePath);
        responseHandler.file(response, fileContent, contentType, request);
        logger.debug(`Served file: ${filePath}`);
        return;
      }
    }

    if (!isAssetRequest && this.spaIndexPath) {
      const fileContent = fileSystem.readFile(this.spaIndexPath);
      if (fileContent) {
        responseHandler.file(response, fileContent, 'text/html; charset=utf-8', request);
        logger.debug(`Served SPA index: ${this.spaIndexPath}`);
        return;
      }
    }

    logger.warn(`File not found: ${normalizedPath}`);
    responseHandler.notFound(response, 'File not found', request);
  }
}

module.exports = StaticHandler;
