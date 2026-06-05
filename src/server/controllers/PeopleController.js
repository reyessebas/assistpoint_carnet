/**
 * People API Controller
 * Maneja la lógica de negocio para endpoints de personas
 */

const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');
const { validatePersonData } = require('../utils/validator');

class PeopleController {
  constructor(peopleModel) {
    this.model = peopleModel;
  }

  /**
   * GET /api/people
   * Obtiene todas las personas
   */
  async getAll(request, response) {
    try {
      const people = await this.model.getAll();
      responseHandler.json(response, 200, people, request);
    } catch (error) {
      logger.error('Error getting all people', error);
      responseHandler.serverError(response);
    }
  }

  /**
   * GET /api/people/:id
   * Obtiene una persona por ID
   */
  async getById(request, response, id) {
    try {
      const person = await this.model.getById(id);
      
      if (!person) {
        responseHandler.notFound(response, 'Person not found', request);
        return;
      }

      responseHandler.json(response, 200, person, request);
    } catch (error) {
      logger.error('Error getting person by ID', error);
      responseHandler.serverError(response);
    }
  }

  /**
   * POST /api/people
   * Crea una nueva persona
   */
  async create(request, response, body) {
    try {
      logger.info(`[PeopleController] create ${new Date().toISOString()}`);
      logger.debug && logger.debug(`create body: ${JSON.stringify(body)}`);
      const { valid, errors, data } = validatePersonData(body);
      if (!valid) {
        logger.warn('Validation failed for create', errors);
        return responseHandler.badRequest(response, errors.join('; '), request);
      }
      const person = await this.model.create(data);
      responseHandler.json(response, 201, person, request);
    } catch (error) {
      logger.warn('Error creating person', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  /**
   * PUT /api/people/:id
   * Actualiza una persona
   */
  async update(request, response, id, body) {
    try {
      const { valid, errors, data } = validatePersonData(body);
      if (!valid) {
        logger.warn('Validation failed for update', errors);
        return responseHandler.badRequest(response, errors.join('; '), request);
      }
      const person = await this.model.update(id, data);
      
      if (!person) {
        responseHandler.notFound(response, 'Person not found', request);
        return;
      }

      responseHandler.json(response, 200, person, request);
    } catch (error) {
      logger.warn('Error updating person', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  /**
   * DELETE /api/people/:id
   * Elimina una persona
   */
  async delete(request, response, id) {
    try {
      const deleted = await this.model.delete(id);
      
      if (!deleted) {
        responseHandler.notFound(response, 'Person not found', request);
        return;
      }

      responseHandler.json(response, 200, { id }, request);
    } catch (error) {
      logger.error('Error deleting person', error);
      responseHandler.serverError(response, 'Internal server error', request);
    }
  }
}

module.exports = PeopleController;
