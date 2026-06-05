/**
 * HTTP Response Utilities
 * Maneja respuestas HTTP estándar con soporte opcional de gzip
 */
const zlib = require('zlib');

const responseHandler = {
  /**
   * Envía una respuesta JSON
   * @param {object} response - Objeto response de Node
   * @param {number} statusCode - Código HTTP
   * @param {object} payload - Datos a enviar
   */
  json: (response, statusCode, payload, request) => {
    const body = Buffer.from(JSON.stringify(payload));
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    };

    const accept = request && request.headers && request.headers['accept-encoding'] || '';
    if (accept.includes('gzip') && body.length > 100) {
      const gz = zlib.gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = String(gz.length);
      response.writeHead(statusCode, headers);
      response.end(gz);
      return;
    }

    headers['Content-Length'] = String(body.length);
    response.writeHead(statusCode, headers);
    response.end(body);
  },

  ok: (response, payload, request) => {
    responseHandler.json(response, 200, payload, request);
  },

  created: (response, payload, request) => {
    responseHandler.json(response, 201, payload, request);
  },

  /**
   * Envía texto o HTML
   * @param {object} response - Objeto response de Node
   * @param {number} statusCode - Código HTTP
   * @param {string} content - Contenido a enviar
   * @param {string} contentType - Tipo de contenido
   */
  send: (response, statusCode, content, contentType = 'text/plain; charset=utf-8', request) => {
    const headers = { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' };
    const accept = request && request.headers && request.headers['accept-encoding'] || '';
    const body = Buffer.isBuffer(content) ? content : Buffer.from(String(content));
    if (accept.includes('gzip') && (/^(text\/|application\/json|application\/javascript)/).test(contentType)) {
      const gz = zlib.gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = String(gz.length);
      response.writeHead(statusCode, headers);
      response.end(gz);
      return;
    }
    headers['Content-Length'] = String(body.length);
    response.writeHead(statusCode, headers);
    response.end(body);
  },

  /**
   * Envía un archivo estático
   * @param {object} response - Objeto response de Node
   * @param {Buffer} fileContent - Contenido del archivo
   * @param {string} contentType - Tipo de contenido
   */
  file: (response, fileContent, contentType, request) => {
    const headers = { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' };
    const accept = request && request.headers && request.headers['accept-encoding'] || '';
    if (accept.includes('gzip') && (/^(text\/|application\/json|application\/javascript)/).test(contentType)) {
      const gz = zlib.gzipSync(fileContent);
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = String(gz.length);
      response.writeHead(200, headers);
      response.end(gz);
      return;
    }
    headers['Content-Length'] = String(fileContent.length);
    response.writeHead(200, headers);
    response.end(fileContent);
  },

  /**
   * Error responses
   */
  notFound: (response, message = 'Not found', request) => {
    responseHandler.json(response, 404, { error: message }, request);
  },

  badRequest: (response, message = 'Bad request', request) => {
    responseHandler.json(response, 400, { error: message }, request);
  },

  unauthorized: (response, message = 'Unauthorized', request) => {
    responseHandler.json(response, 401, { error: message }, request);
  },

  serverError: (response, message = 'Internal server error', request) => {
    responseHandler.json(response, 500, { error: message }, request);
  }
};

module.exports = responseHandler;
