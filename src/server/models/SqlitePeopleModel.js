/**
 * Sqlite-backed People Model
 */

const crypto = require('crypto');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const config = require('../../../config/environment');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');

const ACTIVE_CARD_STATUS = 'Vigente';
const REPLACED_CARD_STATUS = 'Reemplazado';
const PERSON_ACTIVE_STATUS = 'Activo';

const AREAS = ['Aprendiz', 'B2B', 'Billing', 'CCM', 'CCM/RMP', 'Cardiología', 'Contabilidad', 'Coordinación Especialista', 'Direccion', 'Finance', 'IT', 'Legal', 'LOP', 'Marketing', 'Medical Assistant', 'PAP', 'RMP', 'Recursos Humanos', 'Servicios Generales'];
const CARGOS = ['Analista Contable', 'Analista Contable Senior', 'Analista Contable y Reporting', 'Analista de Facturación y Cobros', 'Analista de Marketing Digital', 'Analista de Recursos Humanos', 'Aprendiz Marketing', 'Aprendiz Recursos Humanos', 'Asistente Legal', 'Asistente Médico enfocado en coordinación de Atención al Paciente', 'Asistente Médico con enfoque en ciclo de Facturación', 'Coordinador de Marketing Junior', 'Direccion', 'Director de Recursos Humanos', 'Especialista en Generación de Leads B2B', 'General Manager', 'Gestor Médico con Énfasis Administrativo', 'IT Asistencia Remota Junior', 'Jefe de Contabilidad', 'Manager Contable y Financiero', 'Médico', 'Office and Operations Manager', 'Operaria de Limpieza y Servicios Generales', 'Project Manager', 'Revenue Cycle', 'Servicio de Asistencia Remota'];
const SEDES = [['Colina', '', 'Bogotá'], ['123', '', 'Bogotá'], ['Medellin', '', 'Medellín'], ['Uruguay', '', 'Montevideo']];

class SqlitePeopleModel {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    fileSystem.ensureDir(this.dataDir);
    this.dbPath = path.join(this.dataDir, 'people.db');
    this.dbPromise = open({ filename: this.dbPath, driver: sqlite3.Database }).then(async (db) => {
      await db.exec('PRAGMA foreign_keys = ON;');
      await this.initializeSchema(db);
      await this.seedPeople(db);
      await this.seedCatalogs(db);
      await this.ensureCarnets(db);
      return db;
    });
  }

  async initializeSchema(db) {
    await db.exec(`CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      documentNumber TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      site TEXT NOT NULL DEFAULT 'Colina',
      status TEXT NOT NULL DEFAULT 'Activo',
      mode TEXT NOT NULL DEFAULT 'Presencial',
      personType TEXT NOT NULL DEFAULT 'Empleado',
      employeeCode TEXT,
      phone TEXT,
      startDate TEXT,
      observations TEXT,
      avatar TEXT,
      _createdAt TEXT,
      _updatedAt TEXT
    );`);

    const columns = await db.all('PRAGMA table_info(people)');
    const names = new Set(columns.map((column) => column.name));
    const additions = [
      ['documentNumber', "ALTER TABLE people ADD COLUMN documentNumber TEXT NOT NULL DEFAULT ''"],
      ['site', "ALTER TABLE people ADD COLUMN site TEXT NOT NULL DEFAULT 'Colina'"],
      ['personType', "ALTER TABLE people ADD COLUMN personType TEXT NOT NULL DEFAULT 'Empleado'"],
      ['employeeCode', 'ALTER TABLE people ADD COLUMN employeeCode TEXT'],
      ['phone', 'ALTER TABLE people ADD COLUMN phone TEXT'],
      ['startDate', 'ALTER TABLE people ADD COLUMN startDate TEXT'],
      ['observations', 'ALTER TABLE people ADD COLUMN observations TEXT']
    ];
    for (const [name, sql] of additions) {
      if (!names.has(name)) await db.exec(sql);
    }

    await db.exec(`CREATE TABLE IF NOT EXISTS carnets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      persona_id INTEGER NOT NULL,
      codigo_carnet TEXT NOT NULL UNIQUE,
      qr_token TEXT NOT NULL UNIQUE,
      qr_url TEXT NOT NULL,
      fecha_emision TEXT NOT NULL,
      fecha_vencimiento TEXT,
      estado_carnet TEXT NOT NULL DEFAULT 'Vigente',
      version INTEGER NOT NULL DEFAULT 1,
      archivo_url TEXT,
      entregado INTEGER NOT NULL DEFAULT 0,
      metodo_entrega TEXT,
      fecha_entrega TEXT,
      entregado_por TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (persona_id) REFERENCES people(id) ON DELETE CASCADE
    );`);

    await db.exec('CREATE TABLE IF NOT EXISTS areas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, descripcion TEXT, activo INTEGER NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);');
    await db.exec('CREATE TABLE IF NOT EXISTS cargos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, area_id INTEGER, descripcion TEXT, activo INTEGER NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);');
    await db.exec('CREATE TABLE IF NOT EXISTS sedes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, direccion TEXT, ciudad TEXT, activo INTEGER NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);');
    await db.exec('CREATE TABLE IF NOT EXISTS modalidades (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, descripcion TEXT, activo INTEGER NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);');
    await db.exec('CREATE TABLE IF NOT EXISTS tipos_persona (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, descripcion TEXT, activo INTEGER NOT NULL DEFAULT 1, created_at TEXT, updated_at TEXT);');
  }

  async seedPeople(db) {
    const row = await db.get('SELECT COUNT(1) as c FROM people');
    if (!row || row.c !== 0) return;
    const now = new Date().toISOString();
    const defaults = [
      { fullName: 'John Doe', email: 'john.doe@assistpoint.com', documentNumber: '1001', department: 'Tecnología', role: 'Desarrollador Front End', site: 'Colina', status: 'Activo', mode: 'Híbrido', avatar: 'img/1.png' },
      { fullName: 'María Pérez', email: 'maria.perez@assistpoint.com', documentNumber: '1002', department: 'Recursos Humanos', role: 'Analista de talento', site: 'Colina', status: 'Activo', mode: 'Presencial', avatar: 'img/2.png' }
    ];
    const insert = 'INSERT INTO people (fullName,email,documentNumber,department,role,site,status,mode,personType,avatar,_createdAt,_updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
    const stmt = await db.prepare(insert);
    try {
      await db.run('BEGIN TRANSACTION');
      for (const person of defaults) {
        await stmt.run(person.fullName, person.email, person.documentNumber, person.department, person.role, person.site, person.status, person.mode, 'Empleado', person.avatar, now, now);
      }
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      logger.error('Error seeding sqlite', error);
    } finally {
      await stmt.finalize();
    }
  }

  async seedCatalogs(db) {
    const now = new Date().toISOString();
    for (const area of AREAS) await db.run('INSERT OR IGNORE INTO areas (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', area, '', now, now);
    for (const cargo of CARGOS) await db.run('INSERT OR IGNORE INTO cargos (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', cargo, '', now, now);
    for (const sede of SEDES) await db.run('INSERT OR IGNORE INTO sedes (nombre, direccion, ciudad, activo, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)', sede[0], sede[1], sede[2], now, now);
    for (const modalidad of ['Presencial', 'Remoto', 'Híbrido']) await db.run('INSERT OR IGNORE INTO modalidades (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', modalidad, '', now, now);
    for (const tipo of ['Empleado', 'Contratista', 'Visitante', 'Practicante', 'Proveedor']) await db.run('INSERT OR IGNORE INTO tipos_persona (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', tipo, '', now, now);
  }

  async ensureCarnets(db) {
    const people = await db.all('SELECT id FROM people');
    for (const person of people) {
      const existing = await db.get('SELECT id FROM carnets WHERE persona_id = ? AND estado_carnet = ?', person.id, ACTIVE_CARD_STATUS);
      if (!existing) await this.insertCarnet(db, person.id);
    }
  }

  async getAll() {
    const db = await this.dbPromise;
    const rows = await db.all('SELECT * FROM people ORDER BY id DESC');
    return this.attachActiveCarnets(db, rows);
  }

  async getById(id) {
    const db = await this.dbPromise;
    const row = await db.get('SELECT * FROM people WHERE id = ?', id);
    if (!row) return null;
    const people = await this.attachActiveCarnets(db, [row]);
    return people[0];
  }

  async create(personData) {
    const db = await this.dbPromise;
    await this.ensureUniquePerson(db, personData);
    const now = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO people (fullName,email,documentNumber,department,role,site,status,mode,personType,employeeCode,phone,startDate,observations,avatar,_createdAt,_updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      String(personData.fullName || '').trim(),
      String(personData.email || '').trim(),
      String(personData.documentNumber || '').trim(),
      String(personData.department || '').trim(),
      String(personData.role || '').trim(),
      String(personData.site || 'Colina').trim(),
      String(personData.status || 'Activo').trim() === 'Vacaciones' ? 'Suspendido' : String(personData.status || 'Activo').trim(),
      String(personData.mode || 'Presencial').trim(),
      String(personData.personType || 'Empleado').trim(),
      String(personData.employeeCode || '').trim(),
      String(personData.phone || '').trim(),
      String(personData.startDate || '').trim(),
      String(personData.observations || '').trim(),
      String(personData.avatar || 'img/defecto_perfil.jpeg').trim() || 'img/defecto_perfil.jpeg',
      now,
      now
    );
    await this.insertCarnet(db, result.lastID);
    return this.getById(result.lastID);
  }

  async bulkCreate(peopleData = []) {
    if (!Array.isArray(peopleData)) {
      throw new Error('people must be an array');
    }
    const created = [];
    const updated = [];
    const skipped = [];
    for (const personData of peopleData) {
      try {
        await this.ensureCatalogValues(personData);
        const existing = await this.findImportMatch(personData);
        if (existing) {
          updated.push(await this.update(existing.id, personData));
        } else {
          created.push(await this.create(personData));
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

  async findImportMatch(personData) {
    const db = await this.dbPromise;
    const employeeCode = String(personData.employeeCode || '').trim();
    const documentNumber = String(personData.documentNumber || '').trim();
    return db.get(
      'SELECT id FROM people WHERE (? != "" AND employeeCode = ?) OR (? != "" AND documentNumber = ?) LIMIT 1',
      employeeCode, employeeCode, documentNumber, documentNumber
    );
  }

  async ensureCatalogValues(personData) {
    for (const [type, value] of [['areas', personData.department], ['cargos', personData.role], ['sedes', personData.site]]) {
      const nombre = String(value || '').trim();
      if (!nombre) continue;
      try {
        await this.createCatalogItem(type, { nombre });
      } catch (error) {
        if (!/UNIQUE|existe/i.test(error.message || '')) throw error;
      }
    }
  }

  async update(id, personData) {
    const db = await this.dbPromise;
    const existing = await this.getById(id);
    if (!existing) return null;
    await this.ensureUniquePerson(db, personData, id);
    const now = new Date().toISOString();
    const updated = {
      fullName: String(personData.fullName || existing.fullName).trim(),
      email: String(personData.email || existing.email).trim(),
      documentNumber: String(personData.documentNumber || existing.documentNumber).trim(),
      department: String(personData.department || existing.department).trim(),
      role: String(personData.role || existing.role).trim(),
      site: String(personData.site || existing.site || 'Colina').trim(),
      status: String(personData.status || existing.status || 'Activo').trim() === 'Vacaciones' ? 'Suspendido' : String(personData.status || existing.status || 'Activo').trim(),
      mode: String(personData.mode || existing.mode || 'Presencial').trim(),
      personType: String(personData.personType || existing.personType || 'Empleado').trim(),
      employeeCode: String(personData.employeeCode || '').trim(),
      phone: String(personData.phone || '').trim(),
      startDate: String(personData.startDate || '').trim(),
      observations: String(personData.observations || '').trim(),
      avatar: String(personData.avatar || existing.avatar || 'img/defecto_perfil.jpeg').trim()
    };
    await db.run(
      'UPDATE people SET fullName=?,email=?,documentNumber=?,department=?,role=?,site=?,status=?,mode=?,personType=?,employeeCode=?,phone=?,startDate=?,observations=?,avatar=?,_updatedAt=? WHERE id=?',
      updated.fullName, updated.email, updated.documentNumber, updated.department, updated.role, updated.site,
      updated.status, updated.mode, updated.personType, updated.employeeCode, updated.phone, updated.startDate,
      updated.observations, updated.avatar, now, id
    );
    return this.getById(id);
  }

  async delete(id) {
    const db = await this.dbPromise;
    const existing = await this.getById(id);
    if (!existing) return false;
    await db.run('DELETE FROM people WHERE id = ?', id);
    return true;
  }

  async bulkDelete(ids) {
    const db = await this.dbPromise;
    const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueIds.length === 0) {
      return { requested: 0, deleted: 0, deletedIds: [], missingIds: [] };
    }

    const placeholders = uniqueIds.map(() => '?').join(',');
    const existing = await db.all(`SELECT id FROM people WHERE id IN (${placeholders})`, uniqueIds);
    const deletedIds = existing.map((row) => Number(row.id));
    const deletedSet = new Set(deletedIds);

    if (deletedIds.length > 0) {
      await db.run(`DELETE FROM people WHERE id IN (${placeholders})`, uniqueIds);
    }

    return {
      requested: uniqueIds.length,
      deleted: deletedIds.length,
      deletedIds,
      missingIds: uniqueIds.filter((id) => !deletedSet.has(id))
    };
  }

  async ensureUniquePerson(db, personData, currentId = null) {
    const row = await db.get(
      'SELECT id FROM people WHERE (LOWER(documentNumber) = LOWER(?) OR LOWER(email) = LOWER(?) OR (? != "" AND LOWER(employeeCode) = LOWER(?))) AND (? IS NULL OR id != ?) LIMIT 1',
      String(personData.documentNumber || '').trim(),
      String(personData.email || '').trim(),
      String(personData.employeeCode || '').trim(),
      String(personData.employeeCode || '').trim(),
      currentId,
      currentId
    );
    if (row) throw new Error('Ya existe una persona con el mismo documento, correo o código de empleado');
  }

  async attachActiveCarnets(db, people) {
    for (const person of people) {
      person.activeCarnet = await db.get(
        'SELECT * FROM carnets WHERE persona_id = ? AND deleted_at IS NULL ORDER BY CASE estado_carnet WHEN ? THEN 0 ELSE 1 END, version DESC LIMIT 1',
        person.id,
        ACTIVE_CARD_STATUS
      ) || null;
    }
    return people;
  }

  async insertCarnet(db, personId) {
    const latest = await db.get('SELECT COALESCE(MAX(version), 0) + 1 AS version FROM carnets WHERE persona_id = ?', personId);
    const version = Number(latest?.version || 1);
    const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();
    const code = `AP-${String(personId).padStart(4, '0')}-V${version}`;
    const qrUrl = `${String(config.PUBLIC_APP_URL).replace(/\/$/, '')}/validar-carnet/${token}`;
    const result = await db.run(
      'INSERT INTO carnets (persona_id,codigo_carnet,qr_token,qr_url,fecha_emision,estado_carnet,version,archivo_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      personId, code, token, qrUrl, now, ACTIVE_CARD_STATUS, version, '', now, now
    );
    return db.get('SELECT * FROM carnets WHERE id = ?', result.lastID);
  }

  async generateCarnetForPerson(personId) {
    const db = await this.dbPromise;
    const existing = await db.get('SELECT id FROM people WHERE id = ?', personId);
    if (!existing) return null;
    await db.run('UPDATE carnets SET estado_carnet = ?, updated_at = ? WHERE persona_id = ? AND estado_carnet = ?', REPLACED_CARD_STATUS, new Date().toISOString(), personId, ACTIVE_CARD_STATUS);
    return this.insertCarnet(db, personId);
  }

  async markCarnetDelivered(personId, deliveryData = {}) {
    const db = await this.dbPromise;
    const now = new Date().toISOString();
    await db.run(
      'UPDATE carnets SET entregado = 1, metodo_entrega = ?, fecha_entrega = ?, entregado_por = ?, updated_at = ? WHERE persona_id = ? AND estado_carnet = ?',
      String(deliveryData.metodo_entrega || deliveryData.method || 'Correo'), now, String(deliveryData.entregado_por || deliveryData.deliveredBy || 'Sistema'), now, personId, ACTIVE_CARD_STATUS
    );
    return db.get('SELECT * FROM carnets WHERE persona_id = ? AND estado_carnet = ? LIMIT 1', personId, ACTIVE_CARD_STATUS);
  }

  async validateCarnetByToken(token) {
    const db = await this.dbPromise;
    const carnet = await db.get('SELECT * FROM carnets WHERE qr_token = ? AND deleted_at IS NULL LIMIT 1', token);
    if (!carnet) return null;
    const person = await db.get('SELECT * FROM people WHERE id = ? LIMIT 1', carnet.persona_id);
    if (!person) return { valid: false, reason: 'Persona no encontrada', carnet, person: null };
    const expired = carnet.fecha_vencimiento ? new Date(carnet.fecha_vencimiento) < new Date() : false;
    const valid = person.status === PERSON_ACTIVE_STATUS && carnet.estado_carnet === ACTIVE_CARD_STATUS && !expired;
    const doc = String(person.documentNumber || '');
    return {
      valid,
      reason: valid ? 'Carnet válido' : 'Carnet no válido',
      carnet: expired ? { ...carnet, estado_carnet: 'Vencido' } : carnet,
      person: {
        fullName: person.fullName,
        documentMasked: doc ? `${'*'.repeat(Math.max(doc.length - 4, 0))}${doc.slice(-4)}` : '',
        department: person.department,
        role: person.role,
        site: person.site,
        mode: person.mode,
        personType: person.personType || 'Empleado',
        status: person.status,
        avatar: person.avatar
      }
    };
  }

  async getCatalogs() {
    const db = await this.dbPromise;
    const areas = await db.all('SELECT id, nombre, descripcion, activo FROM areas ORDER BY nombre');
    const cargos = await db.all('SELECT id, nombre, area_id, descripcion, activo FROM cargos ORDER BY nombre');
    const sedes = await db.all('SELECT id, nombre, direccion, ciudad, activo FROM sedes ORDER BY nombre');
    const modalidades = await db.all('SELECT id, nombre, descripcion, activo FROM modalidades ORDER BY nombre');
    const tiposPersona = await db.all('SELECT id, nombre, descripcion, activo FROM tipos_persona ORDER BY nombre');
    const estadosPersona = ['Activo', 'Inactivo', 'Retirado', 'Suspendido'].map((nombre, index) => ({ id: index + 1, nombre, activo: true }));
    const estadosCarnet = ['Vigente', 'Vencido', 'Anulado', 'Extraviado', 'Reemplazado', 'Bloqueado'].map((nombre, index) => ({ id: index + 1, nombre, activo: true }));
    return { areas, cargos, sedes, modalidades, tiposPersona, estadosPersona, estadosCarnet };
  }

  async createCatalogItem(type, payload = {}) {
    const db = await this.dbPromise;
    const nombre = String(payload.nombre || payload.name || '').trim();
    if (!nombre) throw new Error('nombre is required');
    const now = new Date().toISOString();

    if (type === 'areas') {
      await db.run('INSERT INTO areas (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', nombre, String(payload.descripcion || '').trim(), now, now);
      return db.get('SELECT id, nombre, descripcion, activo FROM areas WHERE nombre = ? LIMIT 1', nombre);
    }

    if (type === 'cargos') {
      await db.run('INSERT INTO cargos (nombre, area_id, descripcion, activo, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)', nombre, payload.area_id ? Number(payload.area_id) : null, String(payload.descripcion || '').trim(), now, now);
      return db.get('SELECT id, nombre, area_id, descripcion, activo FROM cargos WHERE nombre = ? LIMIT 1', nombre);
    }

    if (type === 'sedes') {
      await db.run('INSERT INTO sedes (nombre, direccion, ciudad, activo, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)', nombre, String(payload.direccion || '').trim(), String(payload.ciudad || '').trim(), now, now);
      return db.get('SELECT id, nombre, direccion, ciudad, activo FROM sedes WHERE nombre = ? LIMIT 1', nombre);
    }
    if (type === 'modalidades') {
      await db.run('INSERT INTO modalidades (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', nombre, String(payload.descripcion || '').trim(), now, now);
      return db.get('SELECT id, nombre, descripcion, activo FROM modalidades WHERE nombre = ? LIMIT 1', nombre);
    }
    if (type === 'tiposPersona') {
      await db.run('INSERT INTO tipos_persona (nombre, descripcion, activo, created_at, updated_at) VALUES (?, ?, 1, ?, ?)', nombre, String(payload.descripcion || '').trim(), now, now);
      return db.get('SELECT id, nombre, descripcion, activo FROM tipos_persona WHERE nombre = ? LIMIT 1', nombre);
    }

    throw new Error('Unsupported catalog');
  }

  async updateCatalogItem(type, id, payload = {}) {
    const db = await this.dbPromise;
    const nombre = String(payload.nombre || payload.name || '').trim();
    if (!nombre) throw new Error('nombre is required');
    if (type === 'areas') {
      await db.run('UPDATE areas SET nombre = ?, descripcion = ?, activo = ?, updated_at = ? WHERE id = ?', nombre, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, new Date().toISOString(), id);
      return db.get('SELECT id, nombre, descripcion, activo FROM areas WHERE id = ? LIMIT 1', id);
    }
    if (type === 'cargos') {
      await db.run('UPDATE cargos SET nombre = ?, area_id = ?, descripcion = ?, activo = ?, updated_at = ? WHERE id = ?', nombre, payload.area_id ? Number(payload.area_id) : null, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, new Date().toISOString(), id);
      return db.get('SELECT id, nombre, area_id, descripcion, activo FROM cargos WHERE id = ? LIMIT 1', id);
    }
    if (type === 'sedes') {
      await db.run('UPDATE sedes SET nombre = ?, direccion = ?, ciudad = ?, activo = ?, updated_at = ? WHERE id = ?', nombre, String(payload.direccion || '').trim(), String(payload.ciudad || '').trim(), payload.activo === false ? 0 : 1, new Date().toISOString(), id);
      return db.get('SELECT id, nombre, direccion, ciudad, activo FROM sedes WHERE id = ? LIMIT 1', id);
    }
    if (type === 'modalidades') {
      await db.run('UPDATE modalidades SET nombre = ?, descripcion = ?, activo = ?, updated_at = ? WHERE id = ?', nombre, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, new Date().toISOString(), id);
      return db.get('SELECT id, nombre, descripcion, activo FROM modalidades WHERE id = ? LIMIT 1', id);
    }
    if (type === 'tiposPersona') {
      await db.run('UPDATE tipos_persona SET nombre = ?, descripcion = ?, activo = ?, updated_at = ? WHERE id = ?', nombre, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, new Date().toISOString(), id);
      return db.get('SELECT id, nombre, descripcion, activo FROM tipos_persona WHERE id = ? LIMIT 1', id);
    }
    throw new Error('Unsupported catalog');
  }

  async deleteCatalogItem(type, id) {
    const db = await this.dbPromise;
    const table = type === 'areas' ? 'areas' : type === 'cargos' ? 'cargos' : type === 'sedes' ? 'sedes' : type === 'modalidades' ? 'modalidades' : type === 'tiposPersona' ? 'tipos_persona' : null;
    const usageColumn = type === 'areas' ? 'department' : type === 'cargos' ? 'role' : type === 'sedes' ? 'site' : type === 'modalidades' ? 'mode' : type === 'tiposPersona' ? 'personType' : null;
    if (!table || !usageColumn) throw new Error('Unsupported catalog');
    const item = await db.get(`SELECT nombre FROM ${table} WHERE id = ? LIMIT 1`, id);
    if (!item) return false;
    const usage = await db.get(`SELECT COUNT(1) AS total FROM people WHERE ${usageColumn} = ?`, item.nombre);
    if (Number(usage?.total || 0) > 0) throw new Error('No se puede eliminar porque está asociado a personas existentes');
    const result = await db.run(`DELETE FROM ${table} WHERE id = ?`, id);
    return result.changes > 0;
  }
}

module.exports = SqlitePeopleModel;
