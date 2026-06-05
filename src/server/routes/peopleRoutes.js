/**
 * People API Routes
 * Define las rutas API para personas
 */

const responseHandler = require('../utils/responseHandler');
const BodyParser = require('../utils/BodyParser');
const jwt = require('../utils/jwt');
const PEOPLE_BODY_LIMIT = 6 * 1024 * 1024;

class PeopleRouter {
  constructor(controller) {
    this.controller = controller;
  }

  /**
   * Enruta las solicitudes de API de personas
   * @param {object} request - Objeto request
   * @param {object} response - Objeto response
   * @param {string} pathname - Ruta de la solicitud
   */
  async route(request, response, pathname) {
    const method = request.method;
    
    // GET /api/people
    if (method === 'GET' && pathname === '/api/people') {
      await this.controller.getAll(request, response);
      return;
    }

    // Match /api/people/:id
    const personIdMatch = pathname.match(/^\/api\/people\/(\d+)$/);

    // GET /api/people/:id
    if (method === 'GET' && personIdMatch) {
      const personId = Number(personIdMatch[1]);
      await this.controller.getById(request, response, personId);
      return;
    }

    // POST /api/people
    if (method === 'POST' && pathname === '/api/people') {
      try {
        // Require auth for creating
        const authHeader = request.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '') || null;
        try {
          jwt.verifyToken(token);
        } catch (err) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
        await this.controller.create(request, response, body);
      } catch (error) {
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    // PUT /api/people/:id
    if (method === 'PUT' && personIdMatch) {
      const personId = Number(personIdMatch[1]);
      try {
        // Require auth for updating
        const authHeader = request.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '') || null;
        try {
          jwt.verifyToken(token);
        } catch (err) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
        await this.controller.update(request, response, personId, body);
      } catch (error) {
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    // DELETE /api/people/:id
    if (method === 'DELETE' && personIdMatch) {
      const personId = Number(personIdMatch[1]);
      // Require auth for deletion
      const authHeader = request.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || null;
      try {
        jwt.verifyToken(token);
      } catch (err) {
        return responseHandler.unauthorized(response, 'Unauthorized', request);
      }
      await this.controller.delete(request, response, personId);
      return;
    }

    // Not found
    responseHandler.notFound(response, 'API endpoint not found', request);
  }
}

module.exports = PeopleRouter;
