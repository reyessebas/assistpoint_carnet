/**
 * File System Utilities
 * Maneja lectura/escritura de archivos de datos
 */

const fs = require('fs');
const path = require('path');

const fileSystem = {
  /**
   * Asegura que el directorio existe
   * @param {string} dirPath - Ruta del directorio
   */
  ensureDir: (dirPath) => {
    try {
      const start = Date.now();
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const duration = Date.now() - start;
      console.log(`[fileSystem] ensureDir ${dirPath} (${duration}ms)`);
    } catch (err) {
      console.error(`[fileSystem] ensureDir error ${dirPath}`, err);
      throw err;
    }
  },

  /**
   * Lee un archivo JSON
   * @param {string} filePath - Ruta del archivo
   * @returns {object|null} Contenido parseado o null
   */
  readJSON: (filePath) => {
    try {
      const start = Date.now();
      if (!fs.existsSync(filePath)) {
        console.log(`[fileSystem] readJSON missing ${filePath}`);
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      const duration = Date.now() - start;
      console.log(`[fileSystem] readJSON ${filePath} (${duration}ms)`);
      return parsed;
    } catch (error) {
      console.error(`Error reading file: ${filePath}`, error);
      return null;
    }
  },

  /**
   * Escribe un archivo JSON
   * @param {string} filePath - Ruta del archivo
   * @param {object} data - Datos a escribir
   * @returns {boolean} Éxito o fallo
   */
  writeJSON: (filePath, data) => {
    try {
      const start = Date.now();
      const dir = path.dirname(filePath);
      fileSystem.ensureDir(dir);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      const duration = Date.now() - start;
      console.log(`[fileSystem] writeJSON ${filePath} (${duration}ms)`);
      return true;
    } catch (error) {
      console.error(`Error writing file: ${filePath}`, error);
      return false;
    }
  },

  /**
   * Lee un archivo estático
   * @param {string} filePath - Ruta del archivo
   * @returns {Buffer|null} Contenido del archivo
   */
  readFile: (filePath) => {
    try {
      const start = Date.now();
      if (!fs.existsSync(filePath)) {
        console.log(`[fileSystem] readFile missing ${filePath}`);
        return null;
      }
      const content = fs.readFileSync(filePath);
      const duration = Date.now() - start;
      console.log(`[fileSystem] readFile ${filePath} (${duration}ms)`);
      return content;
    } catch (error) {
      console.error(`Error reading file: ${filePath}`, error);
      return null;
    }
  }
};

module.exports = fileSystem;
