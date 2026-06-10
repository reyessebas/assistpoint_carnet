/**
 * People API Controller
 * Maneja la lógica de negocio para endpoints de personas
 */

const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');
const { validatePersonData } = require('../utils/validator');

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,119}$/;

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

  async getCatalogs(request, response) {
    try {
      const catalogs = await this.model.getCatalogs();
      responseHandler.json(response, 200, catalogs, request);
    } catch (error) {
      logger.error('Error getting catalogs', error);
      responseHandler.serverError(response);
    }
  }

  async createCatalogItem(request, response, type, body) {
    try {
      const item = await this.model.createCatalogItem(type, body);
      responseHandler.json(response, 201, item, request);
    } catch (error) {
      logger.warn('Error creating catalog item', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  async updateCatalogItem(request, response, type, id, body) {
    try {
      const item = await this.model.updateCatalogItem(type, id, body);
      if (!item) {
        responseHandler.notFound(response, 'Catalog item not found', request);
        return;
      }
      responseHandler.json(response, 200, item, request);
    } catch (error) {
      logger.warn('Error updating catalog item', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  async deleteCatalogItem(request, response, type, id) {
    try {
      const deleted = await this.model.deleteCatalogItem(type, id);
      if (!deleted) {
        responseHandler.notFound(response, 'Catalog item not found', request);
        return;
      }
      responseHandler.json(response, 200, { id }, request);
    } catch (error) {
      logger.warn('Error deleting catalog item', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  async exportCsv(request, response) {
    try {
      const people = await this.model.getAll();
      const headers = ['EMPLEADO ID', 'NOMBRE', 'DOCUMENTO', 'FECHA DE INGRESO', 'ÁREA', 'CARGO', 'CELULAR', 'EMAIL', 'SEDE', 'ESTADO'];
      const rows = people.map((person) => [
        person.employeeCode || '',
        person.fullName,
        person.documentNumber,
        person.startDate ? String(person.startDate).slice(0, 10) : '',
        person.department,
        person.role,
        person.phone || '',
        person.email,
        person.site,
        person.status
      ]);
      const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      response.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="assist-point-personas-${new Date().toISOString().slice(0, 10)}.csv"`
      });
      response.end(csv);
    } catch (error) {
      logger.error('Error exporting people', error);
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

  async bulkCreate(request, response, body) {
    try {
      const people = Array.isArray(body) ? body : body.people;
      if (!Array.isArray(people)) {
        return responseHandler.badRequest(response, 'people must be an array', request);
      }
      const validPeople = [];
      const skipped = [];
      for (const item of people) {
        const { valid, errors, data } = validatePersonData(item);
        if (valid) {
          validPeople.push(data);
        } else {
          skipped.push({
            documentNumber: item.documentNumber || '',
            email: item.email || '',
            error: errors.join('; ')
          });
        }
      }
      const result = await this.model.bulkCreate(validPeople);
      responseHandler.json(response, 201, {
        created: result.created,
        updated: result.updated || [],
        skipped: [...skipped, ...result.skipped]
      }, request);
    } catch (error) {
      logger.warn('Error importing people', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  async bulkDelete(request, response, body) {
    try {
      const ids = Array.isArray(body) ? body : body.ids;
      if (!Array.isArray(ids)) {
        return responseHandler.badRequest(response, 'ids must be an array', request);
      }

      const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
      if (uniqueIds.length === 0) {
        return responseHandler.badRequest(response, 'At least one valid id is required', request);
      }

      const result = typeof this.model.bulkDelete === 'function'
        ? await this.model.bulkDelete(uniqueIds)
        : await this.deleteOneByOne(uniqueIds);

      responseHandler.json(response, 200, result, request);
    } catch (error) {
      logger.error('Error bulk deleting people', error);
      responseHandler.serverError(response, 'Internal server error', request);
    }
  }

  async deleteOneByOne(ids) {
    const deletedIds = [];
    const missingIds = [];

    for (const id of ids) {
      const deleted = await this.model.delete(id);
      if (deleted) {
        deletedIds.push(id);
      } else {
        missingIds.push(id);
      }
    }

    return {
      requested: ids.length,
      deleted: deletedIds.length,
      deletedIds,
      missingIds
    };
  }

  async generateCarnet(request, response, id) {
    try {
      const carnet = await this.model.generateCarnetForPerson(id);
      if (!carnet) {
        responseHandler.notFound(response, 'Person not found', request);
        return;
      }
      responseHandler.json(response, 201, carnet, request);
    } catch (error) {
      logger.warn('Error generating carnet', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  async markCarnetDelivered(request, response, id, body) {
    try {
      const carnet = await this.model.markCarnetDelivered(id, body);
      if (!carnet) {
        responseHandler.notFound(response, 'Active carnet not found', request);
        return;
      }
      responseHandler.json(response, 200, carnet, request);
    } catch (error) {
      logger.warn('Error marking carnet delivered', error.message);
      responseHandler.badRequest(response, error.message, request);
    }
  }

  async validateCarnet(request, response, token) {
    try {
      const normalizedToken = String(token || '').trim();
      if (!SHARE_TOKEN_PATTERN.test(normalizedToken)) {
        responseHandler.notFound(response, 'Carnet not found', request);
        return;
      }
      const result = await this.model.validateCarnetByToken(normalizedToken);
      if (!result) {
        responseHandler.notFound(response, 'Carnet not found', request);
        return;
      }
      responseHandler.json(response, 200, result, request);
    } catch (error) {
      logger.error('Error validating carnet', error);
      responseHandler.serverError(response);
    }
  }

  async getPublicCard(request, response, token) {
    try {
      const normalizedToken = String(token || '').trim();
      if (!SHARE_TOKEN_PATTERN.test(normalizedToken)) {
        responseHandler.notFound(response, 'Carnet not found', request);
        return;
      }

      const person = await this.model.getPublicCardByToken(normalizedToken);
      if (!person) {
        responseHandler.notFound(response, 'Carnet not found', request);
        return;
      }

      responseHandler.json(response, 200, person, request);
    } catch (error) {
      logger.error('Error getting public card', error);
      responseHandler.serverError(response);
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
