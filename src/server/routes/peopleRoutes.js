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

    const requireAuth = () => {
      const authHeader = request.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || null;
      const payload = jwt.verifyToken(token);
      if (payload.role && payload.role !== 'admin') {
        throw new Error('Forbidden');
      }
      return payload;
    };
    const isAuthError = (error) => ['No token', 'Malformed token', 'Invalid signature', 'Token expired', 'Forbidden'].includes(error.message);

    // GET /api/catalogs
    if (method === 'GET' && pathname === '/api/catalogs') {
      await this.controller.getCatalogs(request, response);
      return;
    }

    const catalogCreateMatch = pathname.match(/^\/api\/catalogs\/(areas|cargos|sedes|modalidades|tiposPersona)$/);
    const catalogItemMatch = pathname.match(/^\/api\/catalogs\/(areas|cargos|sedes|modalidades|tiposPersona)\/(\d+)$/);
    if (method === 'POST' && catalogCreateMatch) {
      try {
        requireAuth();
        const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
        await this.controller.createCatalogItem(request, response, catalogCreateMatch[1], body);
      } catch (error) {
        if (isAuthError(error)) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    if ((method === 'PUT' || method === 'DELETE') && catalogItemMatch) {
      try {
        requireAuth();
        if (method === 'PUT') {
          const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
          await this.controller.updateCatalogItem(request, response, catalogItemMatch[1], Number(catalogItemMatch[2]), body);
        } else {
          await this.controller.deleteCatalogItem(request, response, catalogItemMatch[1], Number(catalogItemMatch[2]));
        }
      } catch (error) {
        if (isAuthError(error)) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    const validationMatch = pathname.match(/^\/api\/carnets\/validate\/([A-Za-z0-9._:-]+)$/);
    if (method === 'GET' && validationMatch) {
      await this.controller.validateCarnet(request, response, validationMatch[1]);
      return;
    }

    const publicCardMatch = pathname.match(/^\/api\/carnets\/share\/([A-Za-z0-9._:-]+)$/);
    if (method === 'GET' && publicCardMatch) {
      await this.controller.getPublicCard(request, response, publicCardMatch[1]);
      return;
    }
    
    // GET /api/people
    if (method === 'GET' && pathname === '/api/people') {
      try {
        requireAuth();
      } catch (err) {
        return responseHandler.unauthorized(response, 'Unauthorized', request);
      }
      await this.controller.getAll(request, response);
      return;
    }

    // GET /api/people/export
    if (method === 'GET' && pathname === '/api/people/export') {
      try {
        requireAuth();
      } catch (err) {
        return responseHandler.unauthorized(response, 'Unauthorized', request);
      }
      await this.controller.exportCsv(request, response);
      return;
    }

    // Match /api/people/:id
    const personIdMatch = pathname.match(/^\/api\/people\/(\d+)$/);
    const carnetGenerateMatch = pathname.match(/^\/api\/people\/(\d+)\/carnets$/);
    const carnetDeliveryMatch = pathname.match(/^\/api\/people\/(\d+)\/carnets\/deliver$/);

    // GET /api/people/:id
    if (method === 'GET' && personIdMatch) {
      const personId = Number(personIdMatch[1]);
      try {
        requireAuth();
      } catch (err) {
        return responseHandler.unauthorized(response, 'Unauthorized', request);
      }
      await this.controller.getById(request, response, personId);
      return;
    }

    // POST /api/people
    if (method === 'POST' && pathname === '/api/people') {
      try {
        // Require auth for creating
        try {
          requireAuth();
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

    // POST /api/people/import
    if (method === 'POST' && pathname === '/api/people/import') {
      try {
        requireAuth();
        const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
        await this.controller.bulkCreate(request, response, body);
      } catch (error) {
        if (isAuthError(error)) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    // POST /api/people/bulk-delete
    if (method === 'POST' && pathname === '/api/people/bulk-delete') {
      try {
        requireAuth();
        const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
        await this.controller.bulkDelete(request, response, body);
      } catch (error) {
        if (isAuthError(error)) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    // POST /api/people/:id/carnets
    if (method === 'POST' && carnetGenerateMatch) {
      try {
        requireAuth();
      } catch (err) {
        return responseHandler.unauthorized(response, 'Unauthorized', request);
      }
      await this.controller.generateCarnet(request, response, Number(carnetGenerateMatch[1]));
      return;
    }

    // POST /api/people/:id/carnets/deliver
    if (method === 'POST' && carnetDeliveryMatch) {
      try {
        requireAuth();
        const body = await BodyParser.parse(request, PEOPLE_BODY_LIMIT);
        await this.controller.markCarnetDelivered(request, response, Number(carnetDeliveryMatch[1]), body);
      } catch (error) {
        if (isAuthError(error)) {
          return responseHandler.unauthorized(response, 'Unauthorized', request);
        }
        responseHandler.badRequest(response, error.message, request);
      }
      return;
    }

    // PUT /api/people/:id
    if (method === 'PUT' && personIdMatch) {
      const personId = Number(personIdMatch[1]);
      try {
        // Require auth for updating
        try {
          requireAuth();
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
      try {
        requireAuth();
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
