/**
 * People Data Model
 * Gestiona la persistencia y lógica de negocio de personas
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../../config/environment');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

const PERSON_ACTIVE_STATUS = 'Activo';
const ACTIVE_CARD_STATUS = 'Vigente';
const REPLACED_CARD_STATUS = 'Reemplazado';
const DEFAULT_CATALOGS = {
  areas: [
    'Aprendiz', 'B2B', 'Billing', 'CCM', 'CCM/RMP', 'Cardiología', 'Contabilidad',
    'Coordinación Especialista', 'Direccion', 'Finance', 'IT', 'Legal', 'LOP',
    'Marketing', 'Medical Assistant', 'PAP', 'RMP', 'Recursos Humanos', 'Servicios Generales'
  ].map((nombre, index) => ({ id: index + 1, nombre, descripcion: '', activo: true })),
  cargos: [
    'Analista Contable', 'Analista Contable Senior', 'Analista Contable y Reporting',
    'Analista de Facturación y Cobros', 'Analista de Marketing Digital',
    'Analista de Recursos Humanos', 'Aprendiz Marketing', 'Aprendiz Recursos Humanos',
    'Asistente Legal', 'Asistente Médico enfocado en coordinación de Atención al Paciente',
    'Asistente Médico con enfoque en ciclo de Facturación', 'Coordinador de Marketing Junior',
    'Direccion', 'Director de Recursos Humanos', 'Especialista en Generación de Leads B2B',
    'General Manager', 'Gestor Médico con Énfasis Administrativo', 'IT Asistencia Remota Junior',
    'Jefe de Contabilidad', 'Manager Contable y Financiero', 'Médico',
    'Office and Operations Manager', 'Operaria de Limpieza y Servicios Generales',
    'Project Manager', 'Revenue Cycle', 'Servicio de Asistencia Remota'
  ].map((nombre, index) => ({ id: index + 1, nombre, area_id: null, descripcion: '', activo: true })),
  sedes: [
    { id: 1, nombre: 'Colina', direccion: '', ciudad: 'Bogotá', activo: true },
    { id: 2, nombre: '123', direccion: '', ciudad: 'Bogotá', activo: true },
    { id: 3, nombre: 'Medellin', direccion: '', ciudad: 'Medellín', activo: true },
    { id: 4, nombre: 'Uruguay', direccion: '', ciudad: 'Montevideo', activo: true }
  ],
  modalidades: ['Presencial', 'Remoto', 'Híbrido'].map((nombre, index) => ({ id: index + 1, nombre, activo: true })),
  tiposPersona: ['Empleado', 'Contratista', 'Visitante', 'Practicante', 'Proveedor'].map((nombre, index) => ({ id: index + 1, nombre, activo: true })),
  estadosPersona: ['Activo', 'Inactivo', 'Retirado', 'Suspendido'].map((nombre, index) => ({ id: index + 1, nombre, activo: true })),
  estadosCarnet: ['Vigente', 'Vencido', 'Anulado', 'Extraviado', 'Reemplazado', 'Bloqueado'].map((nombre, index) => ({ id: index + 1, nombre, activo: true }))
};

class PeopleModel {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.dataFile = path.join(dataDir, 'people.json');
    this.carnetsFile = path.join(dataDir, 'carnets.json');
    this.catalogsFile = path.join(dataDir, 'catalogs.json');
    this.initialize();
  }

  /**
   * Inicializa el directorio de datos
   */
  initialize() {
    fileSystem.ensureDir(this.dataDir);
    logger.info(`[PeopleModel] initialize dataDir=${this.dataDir}`);
    this.ensureSeed();
    this.ensureCarnetsSeed();
    this.ensureCatalogSeed();
  }

  /**
   * Asegura que existe el archivo de datos con datos iniciales
   */
  ensureSeed() {
    logger.info(`[PeopleModel] ensureSeed dataFile=${this.dataFile}`);
    if (!fs.existsSync(this.dataFile)) {
      fileSystem.writeJSON(this.dataFile, []);
      logger.info('Database initialized with empty people collection');
      return;
    }

    try {
      const data = fileSystem.readJSON(this.dataFile);
      if (!Array.isArray(data)) {
        fileSystem.writeJSON(this.dataFile, []);
        logger.warn('Database had invalid format, resetting to empty array');
      }
    } catch (error) {
      logger.error('Error reading database', error);
      fileSystem.writeJSON(this.dataFile, []);
    }
  }

  /**
   * Obtiene todas las personas
   * @returns {array} Lista de personas
   */
  getAll() {
    const carnets = this.getCarnets();
    return (fileSystem.readJSON(this.dataFile) || []).map((person) => this.withActiveCarnet(person, carnets));
  }

  /**
   * Obtiene una persona por ID
   * @param {number} id - ID de la persona
   * @returns {object|null} Persona encontrada o null
   */
  getById(id) {
    const people = fileSystem.readJSON(this.dataFile) || [];
    const person = people.find(person => Number(person.id) === Number(id)) || null;
    return person ? this.withActiveCarnet(person, this.getCarnets()) : null;
  }

  /**
   * Crea una nueva persona
   * @param {object} personData - Datos de la persona
   * @returns {object} Persona creada
   */
  create(personData) {
    logger.info(`[PeopleModel] create start ${new Date().toISOString()}`);
    logger.debug && logger.debug(`create payload: ${JSON.stringify(personData)}`);
    const people = fileSystem.readJSON(this.dataFile) || [];
    this.ensureUniquePerson(people, personData);
    const newPerson = {
      id: this.getNextId(people),
      fullName: String(personData.fullName || '').trim(),
      email: String(personData.email || '').trim(),
      documentNumber: String(personData.documentNumber || '').trim(),
      department: String(personData.department || '').trim(),
      role: String(personData.role || '').trim(),
      site: String(personData.site || 'Colina').trim(),
      status: String(personData.status || 'Activo').trim(),
      mode: String(personData.mode || 'Presencial').trim(),
      personType: String(personData.personType || 'Empleado').trim(),
      employeeCode: String(personData.employeeCode || '').trim(),
      phone: String(personData.phone || '').trim(),
      startDate: String(personData.startDate || '').trim(),
      observations: String(personData.observations || '').trim(),
      avatar: String(personData.avatar || 'img/defecto_perfil.jpeg').trim() || 'img/defecto_perfil.jpeg'
    };

    // Validar campos requeridos
    const requiredFields = ['fullName', 'email', 'documentNumber', 'department', 'role', 'site'];
    const missingFields = requiredFields.filter(field => !newPerson[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const updatedPeople = [newPerson, ...people];
    fileSystem.writeJSON(this.dataFile, updatedPeople);
    const carnet = this.generateCarnetForPerson(newPerson.id);
    logger.info(`Person created: ${newPerson.fullName} (ID: ${newPerson.id})`);
    
    return { ...newPerson, activeCarnet: carnet };
  }

  bulkCreate(peopleData = []) {
    if (!Array.isArray(peopleData)) {
      throw new Error('people must be an array');
    }
    const created = [];
    const updated = [];
    const skipped = [];
    for (const personData of peopleData) {
      try {
        this.ensureCatalogValues(personData);
        const existing = this.findImportMatch(personData);
        if (existing) {
          updated.push(this.update(existing.id, personData));
        } else {
          created.push(this.create(personData));
        }
      } catch (error) {
        skipped.push({
          documentNumber: personData.documentNumber || '',
          email: personData.email || '',
          error: error.message
        });
      }
    }
    return { created, updated, skipped };
  }

  findImportMatch(personData) {
    const employeeCode = String(personData.employeeCode || '').trim().toLowerCase();
    const documentNumber = String(personData.documentNumber || '').trim().toLowerCase();
    return (fileSystem.readJSON(this.dataFile) || []).find((person) =>
      (employeeCode && String(person.employeeCode || '').trim().toLowerCase() === employeeCode) ||
      (documentNumber && String(person.documentNumber || '').trim().toLowerCase() === documentNumber)
    ) || null;
  }

  ensureCatalogValues(personData) {
    [
      ['areas', personData.department],
      ['cargos', personData.role],
      ['sedes', personData.site]
    ].forEach(([type, nombre]) => {
      if (!String(nombre || '').trim()) return;
      try {
        this.createCatalogItem(type, { nombre });
      } catch (error) {
        if (!/existe/i.test(error.message || '')) throw error;
      }
    });
  }

  /**
   * Actualiza una persona existente
   * @param {number} id - ID de la persona
   * @param {object} personData - Datos a actualizar
   * @returns {object|null} Persona actualizada o null
   */
  update(id, personData) {
    const people = fileSystem.readJSON(this.dataFile) || [];
    const index = people.findIndex(p => Number(p.id) === Number(id));

    if (index === -1) {
      return null;
    }

    this.ensureUniquePerson(people, personData, id);
    const updatedPerson = {
      ...people[index],
      fullName: String(personData.fullName || '').trim(),
      email: String(personData.email || '').trim(),
      documentNumber: String(personData.documentNumber || '').trim(),
      department: String(personData.department || '').trim(),
      role: String(personData.role || '').trim(),
      site: String(personData.site || 'Colina').trim(),
      status: String(personData.status || 'Activo').trim(),
      mode: String(personData.mode || 'Presencial').trim(),
      personType: String(personData.personType || people[index].personType || 'Empleado').trim(),
      employeeCode: String(personData.employeeCode || '').trim(),
      phone: String(personData.phone || '').trim(),
      startDate: String(personData.startDate || '').trim(),
      observations: String(personData.observations || '').trim(),
      avatar: String(personData.avatar || 'img/defecto_perfil.jpeg').trim() || 'img/defecto_perfil.jpeg'
    };

    // Validar campos requeridos
    const requiredFields = ['fullName', 'email', 'documentNumber', 'department', 'role', 'site'];
    const missingFields = requiredFields.filter(field => !updatedPerson[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    people[index] = updatedPerson;
    fileSystem.writeJSON(this.dataFile, people);
    logger.info(`Person updated: ${updatedPerson.fullName} (ID: ${updatedPerson.id})`);
    
    return this.withActiveCarnet(updatedPerson, this.getCarnets());
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

  bulkDelete(ids) {
    const idSet = new Set(ids.map((id) => Number(id)));
    const people = fileSystem.readJSON(this.dataFile) || [];
    const deletedIds = people
      .filter((person) => idSet.has(Number(person.id)))
      .map((person) => Number(person.id));
    const deletedSet = new Set(deletedIds);
    const filtered = people.filter((person) => !deletedSet.has(Number(person.id)));

    fileSystem.writeJSON(this.dataFile, filtered);
    logger.info(`People bulk deleted: ${deletedIds.length}/${ids.length}`);

    return {
      requested: ids.length,
      deleted: deletedIds.length,
      deletedIds,
      missingIds: ids.filter((id) => !deletedSet.has(Number(id)))
    };
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

  ensureCarnetsSeed() {
    if (!fs.existsSync(this.carnetsFile)) {
      fileSystem.writeJSON(this.carnetsFile, []);
    }
    const people = fileSystem.readJSON(this.dataFile) || [];
    const carnets = this.getCarnets();
    let changed = false;
    for (const person of people) {
      if (!carnets.some((card) => Number(card.persona_id) === Number(person.id) && card.estado_carnet === ACTIVE_CARD_STATUS)) {
        carnets.push(this.buildCarnet(person.id, carnets));
        changed = true;
      }
    }
    if (changed) fileSystem.writeJSON(this.carnetsFile, carnets);
  }

  ensureCatalogSeed() {
    if (!fs.existsSync(this.catalogsFile)) {
      fileSystem.writeJSON(this.catalogsFile, DEFAULT_CATALOGS);
    }
  }

  ensureUniquePerson(people, personData, currentId = null) {
    const documentNumber = String(personData.documentNumber || '').trim().toLowerCase();
    const email = String(personData.email || '').trim().toLowerCase();
    const employeeCode = String(personData.employeeCode || '').trim().toLowerCase();
    const duplicate = people.find((person) => {
      if (currentId && Number(person.id) === Number(currentId)) return false;
      return String(person.documentNumber || '').trim().toLowerCase() === documentNumber ||
        (email && String(person.email || '').trim().toLowerCase() === email) ||
        (employeeCode && String(person.employeeCode || '').trim().toLowerCase() === employeeCode);
    });
    if (duplicate) {
      throw new Error('Ya existe una persona con el mismo documento, correo o código de empleado');
    }
  }

  getCarnets() {
    return fileSystem.readJSON(this.carnetsFile) || [];
  }

  withActiveCarnet(person, carnets = this.getCarnets()) {
    const activeCarnet = carnets.find((card) => Number(card.persona_id) === Number(person.id) && card.estado_carnet === ACTIVE_CARD_STATUS) ||
      carnets.filter((card) => Number(card.persona_id) === Number(person.id)).sort((a, b) => Number(b.version) - Number(a.version))[0] ||
      null;
    return { ...person, activeCarnet };
  }

  buildCarnet(personId, existingCarnets = this.getCarnets()) {
    const now = new Date().toISOString();
    const id = existingCarnets.reduce((maxId, carnet) => Math.max(maxId, Number(carnet.id) || 0), 0) + 1;
    const version = existingCarnets.filter((carnet) => Number(carnet.persona_id) === Number(personId)).length + 1;
    const qrToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const qrUrl = `${String(config.PUBLIC_APP_URL).replace(/\/$/, '')}/validar-carnet/${qrToken}`;
    return {
      id,
      persona_id: Number(personId),
      codigo_carnet: `AP-${String(personId).padStart(4, '0')}-V${version}`,
      qr_token: qrToken,
      qr_url: qrUrl,
      fecha_emision: now,
      fecha_vencimiento: '',
      estado_carnet: ACTIVE_CARD_STATUS,
      version,
      archivo_url: '',
      entregado: false,
      metodo_entrega: '',
      fecha_entrega: '',
      entregado_por: '',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
  }

  generateCarnetForPerson(personId) {
    const person = (fileSystem.readJSON(this.dataFile) || []).find((item) => Number(item.id) === Number(personId));
    if (!person) return null;
    const carnets = this.getCarnets().map((card) => {
      if (Number(card.persona_id) === Number(personId) && card.estado_carnet === ACTIVE_CARD_STATUS) {
        return { ...card, estado_carnet: REPLACED_CARD_STATUS, updated_at: new Date().toISOString() };
      }
      return card;
    });
    const carnet = this.buildCarnet(personId, carnets);
    carnets.push(carnet);
    fileSystem.writeJSON(this.carnetsFile, carnets);
    return carnet;
  }

  markCarnetDelivered(personId, deliveryData = {}) {
    const carnets = this.getCarnets();
    const index = carnets.findIndex((card) => Number(card.persona_id) === Number(personId) && card.estado_carnet === ACTIVE_CARD_STATUS);
    if (index === -1) return null;
    carnets[index] = {
      ...carnets[index],
      entregado: true,
      metodo_entrega: String(deliveryData.metodo_entrega || deliveryData.method || 'Correo').trim(),
      fecha_entrega: new Date().toISOString(),
      entregado_por: String(deliveryData.entregado_por || deliveryData.deliveredBy || 'Sistema').trim(),
      updated_at: new Date().toISOString()
    };
    fileSystem.writeJSON(this.carnetsFile, carnets);
    return carnets[index];
  }

  validateCarnetByToken(token) {
    const carnet = this.getCarnets().find((card) => card.qr_token === token && !card.deleted_at);
    if (!carnet) return null;
    const person = this.getById(carnet.persona_id);
    if (!person) return { valid: false, reason: 'Persona no encontrada', carnet, person: null };
    const now = new Date();
    const expired = carnet.fecha_vencimiento ? new Date(carnet.fecha_vencimiento) < now : false;
    const valid = person.status === PERSON_ACTIVE_STATUS && carnet.estado_carnet === ACTIVE_CARD_STATUS && !expired;
    return {
      valid,
      reason: valid ? 'Carnet válido' : 'Carnet no válido',
      carnet: expired ? { ...carnet, estado_carnet: 'Vencido' } : carnet,
      person: this.publicPerson(person)
    };
  }

  publicPerson(person) {
    const doc = String(person.documentNumber || '');
    return {
      fullName: person.fullName,
      documentMasked: doc ? `${'*'.repeat(Math.max(doc.length - 4, 0))}${doc.slice(-4)}` : '',
      department: person.department,
      role: person.role,
      site: person.site,
      mode: person.mode,
      personType: person.personType || 'Empleado',
      status: person.status,
      avatar: person.avatar
    };
  }

  getCatalogs() {
    return fileSystem.readJSON(this.catalogsFile) || DEFAULT_CATALOGS;
  }

  createCatalogItem(type, payload = {}) {
    const map = { areas: 'areas', cargos: 'cargos', sedes: 'sedes', modalidades: 'modalidades', tiposPersona: 'tiposPersona' };
    const key = map[type];
    if (!key) throw new Error('Unsupported catalog');
    const catalogs = this.getCatalogs();
    const nombre = String(payload.nombre || payload.name || '').trim();
    if (!nombre) throw new Error('nombre is required');
    const exists = catalogs[key].some((item) => String(item.nombre).toLowerCase() === nombre.toLowerCase());
    if (exists) throw new Error('Ya existe un elemento con ese nombre');
    const now = new Date().toISOString();
    const item = {
      id: catalogs[key].reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1,
      nombre,
      descripcion: String(payload.descripcion || '').trim(),
      activo: true,
      created_at: now,
      updated_at: now
    };
    if (key === 'sedes') {
      item.direccion = String(payload.direccion || '').trim();
      item.ciudad = String(payload.ciudad || '').trim();
    }
    if (key === 'cargos') {
      item.area_id = payload.area_id ? Number(payload.area_id) : null;
    }
    catalogs[key].push(item);
    fileSystem.writeJSON(this.catalogsFile, catalogs);
    return item;
  }

  updateCatalogItem(type, id, payload = {}) {
    const map = { areas: 'areas', cargos: 'cargos', sedes: 'sedes', modalidades: 'modalidades', tiposPersona: 'tiposPersona' };
    const key = map[type];
    if (!key) throw new Error('Unsupported catalog');
    const catalogs = this.getCatalogs();
    const index = catalogs[key].findIndex((item) => Number(item.id) === Number(id));
    if (index === -1) return null;
    const nombre = String(payload.nombre || payload.name || '').trim();
    if (!nombre) throw new Error('nombre is required');
    const duplicate = catalogs[key].some((item) => Number(item.id) !== Number(id) && String(item.nombre).toLowerCase() === nombre.toLowerCase());
    if (duplicate) throw new Error('Ya existe un elemento con ese nombre');
    catalogs[key][index] = {
      ...catalogs[key][index],
      ...payload,
      nombre,
      activo: payload.activo === false ? false : true,
      updated_at: new Date().toISOString()
    };
    fileSystem.writeJSON(this.catalogsFile, catalogs);
    return catalogs[key][index];
  }

  deleteCatalogItem(type, id) {
    const map = { areas: 'areas', cargos: 'cargos', sedes: 'sedes', modalidades: 'modalidades', tiposPersona: 'tiposPersona' };
    const personField = { areas: 'department', cargos: 'role', sedes: 'site', modalidades: 'mode', tiposPersona: 'personType' };
    const key = map[type];
    if (!key) throw new Error('Unsupported catalog');
    const catalogs = this.getCatalogs();
    const item = catalogs[key].find((entry) => Number(entry.id) === Number(id));
    if (!item) return false;
    const people = fileSystem.readJSON(this.dataFile) || [];
    const inUse = people.some((person) => String(person[personField[type]] || '').toLowerCase() === String(item.nombre || '').toLowerCase());
    if (inUse) throw new Error('No se puede eliminar porque está asociado a personas existentes');
    catalogs[key] = catalogs[key].filter((entry) => Number(entry.id) !== Number(id));
    fileSystem.writeJSON(this.catalogsFile, catalogs);
    return true;
  }
}

module.exports = PeopleModel;
