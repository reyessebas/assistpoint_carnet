/**
 * Request Body Parser
 * Parsea el cuerpo de las solicitudes HTTP
 */

class BodyParser {
  /**
   * Lee y parsea el cuerpo de una solicitud
   * @param {object} request - Objeto request de Node
   * @param {number} maxSize - Tamaño máximo permitido (bytes)
   * @returns {Promise<object>} Objeto parseado
   */
  static parse(request, maxSize = 1e6) {
    return new Promise((resolve, reject) => {
      let body = '';

      request.on('data', (chunk) => {
        body += chunk;
        
        if (body.length > maxSize) {
          request.destroy();
          reject(new Error('Request body too large'));
        }
      });

      request.on('end', () => {
        if (!body) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Invalid JSON body'));
        }
      });

      request.on('error', reject);
    });
  }
}

module.exports = BodyParser;
