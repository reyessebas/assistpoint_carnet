/**
 * People Data Model
 * Gestiona la persistencia y lógica de negocio de personas
 */

const fs = require('fs');
const path = require('path');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

const DEFAULT_PEOPLE = [
  {
    id: 1,
    fullName: 'John Doe',
    email: 'john.doe@assistpoint.com',
    department: 'Tecnología',
    role: 'Desarrollador Front End',
    site: 'Colina',
    status: 'Activo',
    mode: 'Híbrido',
    avatar: 'img/1.png'
  },
  {
    id: 2,
    fullName: 'María Pérez',
    email: 'maria.perez@assistpoint.com',
    department: 'Recursos Humanos',
    role: 'Analista de talento',
    site: '123',
    status: 'Activo',
    mode: 'Presencial',
    avatar: 'img/2.png'
  },
  {
    id: 3,
    fullName: 'Camilo Rojas',
    email: 'camilo.rojas@assistpoint.com',
    department: 'Operaciones',
    role: 'Coordinador logístico',
    site: 'Medellin',
    status: 'Vacaciones',
    mode: 'Remoto',
    avatar: 'img/carnet.png'
  },
  {
    id: 4,
    fullName: 'Laura Gómez',
    email: 'laura.gomez@assistpoint.com',
    department: 'Finanzas',
    role: 'Auxiliar contable',
    site: 'Colina',
    status: 'Activo',
    mode: 'Presencial',
    avatar: 'img/1.png'
  },
  {
    id: 5,
    fullName: 'Santiago Ruiz',
    email: 'santiago.ruiz@assistpoint.com',
    department: 'Comercial',
    role: 'Ejecutivo comercial',
    site: 'Uruguay',
    status: 'Inactivo',
    mode: 'Híbrido',
    avatar: 'img/2.png'
  },
  {
    id: 6,
    fullName: 'Paula Méndez',
    email: 'paula.mendez@assistpoint.com',
    department: 'Tecnología',
    role: 'QA Analyst',
    site: 'Medellin',
    status: 'Activo',
    mode: 'Remoto',
    avatar: 'img/carnet.png'
  }
];

class PeopleModel {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.dataFile = path.join(dataDir, 'people.json');
    this.initialize();
  }

  /**
   * Inicializa el directorio de datos
   */
  initialize() {
    fileSystem.ensureDir(this.dataDir);
    logger.info(`[PeopleModel] initialize dataDir=${this.dataDir}`);
    this.ensureSeed();
  }

  /**
   * Asegura que existe el archivo de datos con datos iniciales
   */
  ensureSeed() {
    logger.info(`[PeopleModel] ensureSeed dataFile=${this.dataFile}`);
    if (!fs.existsSync(this.dataFile)) {
      fileSystem.writeJSON(this.dataFile, DEFAULT_PEOPLE);
      logger.info('Database initialized with default people');
      return;
    }

    try {
      const data = fileSystem.readJSON(this.dataFile);
      if (!Array.isArray(data) || data.length === 0) {
        fileSystem.writeJSON(this.dataFile, DEFAULT_PEOPLE);
        logger.warn('Database was empty, reseeding with default data');
      }
    } catch (error) {
      logger.error('Error reading database', error);
      fileSystem.writeJSON(this.dataFile, DEFAULT_PEOPLE);
    }
  }

  /**
   * Obtiene todas las personas
   * @returns {array} Lista de personas
   */
  getAll() {
    return fileSystem.readJSON(this.dataFile) || DEFAULT_PEOPLE;
  }

  /**
   * Obtiene una persona por ID
   * @param {number} id - ID de la persona
   * @returns {object|null} Persona encontrada o null
   */
  getById(id) {
    const people = this.getAll();
    return people.find(person => Number(person.id) === Number(id)) || null;
  }

  /**
   * Crea una nueva persona
   * @param {object} personData - Datos de la persona
   * @returns {object} Persona creada
   */
  create(personData) {
    logger.info(`[PeopleModel] create start ${new Date().toISOString()}`);
    logger.debug && logger.debug(`create payload: ${JSON.stringify(personData)}`);
    const people = this.getAll();
    const newPerson = {
      id: this.getNextId(people),
      fullName: String(personData.fullName || '').trim(),
      email: String(personData.email || '').trim(),
      department: String(personData.department || '').trim(),
      role: String(personData.role || '').trim(),
      site: String(personData.site || 'Colina').trim(),
      status: String(personData.status || 'Activo').trim(),
      mode: String(personData.mode || 'Presencial').trim(),
      avatar: String(personData.avatar || 'img/carnet.png').trim() || 'img/carnet.png'
    };

    // Validar campos requeridos
    const requiredFields = ['fullName', 'email', 'department', 'role', 'site'];
    const missingFields = requiredFields.filter(field => !newPerson[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const updatedPeople = [newPerson, ...people];
    fileSystem.writeJSON(this.dataFile, updatedPeople);
    logger.info(`Person created: ${newPerson.fullName} (ID: ${newPerson.id})`);
    
    return newPerson;
  }

  /**
   * Actualiza una persona existente
   * @param {number} id - ID de la persona
   * @param {object} personData - Datos a actualizar
   * @returns {object|null} Persona actualizada o null
   */
  update(id, personData) {
    const people = this.getAll();
    const index = people.findIndex(p => Number(p.id) === Number(id));

    if (index === -1) {
      return null;
    }

    const updatedPerson = {
      ...people[index],
      fullName: String(personData.fullName || '').trim(),
      email: String(personData.email || '').trim(),
      department: String(personData.department || '').trim(),
      role: String(personData.role || '').trim(),
      site: String(personData.site || 'Colina').trim(),
      status: String(personData.status || 'Activo').trim(),
      mode: String(personData.mode || 'Presencial').trim(),
      avatar: String(personData.avatar || 'img/carnet.png').trim() || 'img/carnet.png'
    };

    // Validar campos requeridos
    const requiredFields = ['fullName', 'email', 'department', 'role', 'site'];
    const missingFields = requiredFields.filter(field => !updatedPerson[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    people[index] = updatedPerson;
    fileSystem.writeJSON(this.dataFile, people);
    logger.info(`Person updated: ${updatedPerson.fullName} (ID: ${updatedPerson.id})`);
    
    return updatedPerson;
  }

  /**
   * Elimina una persona
   * @param {number} id - ID de la persona
   * @returns {boolean} Éxito o fallo
   */
  delete(id) {
    const people = this.getAll();
    const person = people.find(p => Number(p.id) === Number(id));

    if (!person) {
      return false;
    }

    const filtered = people.filter(p => Number(p.id) !== Number(id));
    fileSystem.writeJSON(this.dataFile, filtered);
    logger.info(`Person deleted: ${person.fullName} (ID: ${id})`);
    
    return true;
  }

  /**
   * Obtiene el siguiente ID disponible
   * @private
   * @param {array} people - Lista de personas
   * @returns {number} Siguiente ID
   */
  getNextId(people) {
    return people.reduce((maxId, person) => Math.max(maxId, Number(person.id) || 0), 0) + 1;
  }
}

module.exports = PeopleModel;
