/**
 * MySQL-backed People Model
 */

const mysql = require('mysql2/promise');
const crypto = require('crypto');
const config = require('../../../config/environment');
const logger = require('../utils/logger');

const ACTIVE_CARD_STATUS = 'Vigente';
const REPLACED_CARD_STATUS = 'Reemplazado';
const PERSON_ACTIVE_STATUS = 'Activo';

class MySqlPeopleModel {
  constructor() {
    logger.info(`MySqlPeopleModel: connecting to ${config.MYSQL_HOST}:${config.MYSQL_PORT}/${config.MYSQL_DATABASE} as ${config.MYSQL_USER}`);

    try {
      this.pool = mysql.createPool({
        host: config.MYSQL_HOST,
        port: config.MYSQL_PORT,
        user: config.MYSQL_USER,
        password: config.MYSQL_PASSWORD,
        database: config.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: config.MYSQL_CONNECTION_LIMIT,
        queueLimit: 0
      });
    } catch (err) {
      logger.error('MySqlPeopleModel: failed to create connection pool', err);
      throw err;
    }

    this.ready = this.initialize().catch((err) => {
      logger.error('MySqlPeopleModel: database initialization failed', err);
      throw err;
    });
  }

  async initialize() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS people (
          id INT NOT NULL AUTO_INCREMENT,
          fullName VARCHAR(160) NOT NULL,
          email VARCHAR(200) NOT NULL,
          documentNumber VARCHAR(80) NOT NULL,
          department VARCHAR(120) NOT NULL,
          role VARCHAR(160) NOT NULL,
          site VARCHAR(80) NOT NULL DEFAULT 'Colina',
          status VARCHAR(40) NOT NULL DEFAULT 'Activo',
          mode VARCHAR(40) NOT NULL DEFAULT 'Presencial',
          personType VARCHAR(40) NOT NULL DEFAULT 'Empleado',
          employeeCode VARCHAR(80) NULL,
          phone VARCHAR(60) NULL,
          startDate DATE NULL,
          observations TEXT NULL,
          avatar LONGTEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY ux_people_email (email),
          UNIQUE KEY ux_people_document (documentNumber)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await this.ensureSchema();
      await this.ensureCatalogsSchema();
      await this.ensureCarnetsSchema();

    } catch (error) {
      logger.error('Error initializing MySQL model', error);
      throw error;
    }
  }

  async ensureSchema() {
    const [columns] = await this.pool.query('SHOW COLUMNS FROM people');
    const columnNames = new Set(columns.map((column) => column.Field));

    if (!columnNames.has('site')) {
      await this.pool.query("ALTER TABLE people ADD COLUMN site VARCHAR(80) NOT NULL DEFAULT 'Colina' AFTER role");
    }

    if (!columnNames.has('documentNumber')) {
      await this.pool.query("ALTER TABLE people ADD COLUMN documentNumber VARCHAR(80) NOT NULL DEFAULT '' AFTER email");
    }

    const addColumns = [
      ['personType', "ALTER TABLE people ADD COLUMN personType VARCHAR(40) NOT NULL DEFAULT 'Empleado' AFTER mode"],
      ['employeeCode', "ALTER TABLE people ADD COLUMN employeeCode VARCHAR(80) NULL AFTER personType"],
      ['phone', "ALTER TABLE people ADD COLUMN phone VARCHAR(60) NULL AFTER employeeCode"],
      ['startDate', "ALTER TABLE people ADD COLUMN startDate DATE NULL AFTER phone"],
      ['observations', "ALTER TABLE people ADD COLUMN observations TEXT NULL AFTER startDate"]
    ];
    for (const [name, sql] of addColumns) {
      if (!columnNames.has(name)) await this.pool.query(sql);
    }

    await this.addUniqueIndexIfMissing('people', 'ux_people_document', 'documentNumber');
    await this.addUniqueIndexIfMissing('people', 'ux_people_employee_code', 'employeeCode');

    await this.pool.query("ALTER TABLE people MODIFY avatar LONGTEXT NOT NULL");
  }

  async addUniqueIndexIfMissing(table, indexName, columnName) {
    const [rows] = await this.pool.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, indexName]);
    if (rows.length === 0) {
      try {
        await this.pool.query(`ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} (${columnName})`);
      } catch (error) {
        logger.warn(`Could not add unique index ${indexName}: ${error.message}`);
      }
    }
  }

  generateShareToken() {
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
  }

  publicCardUrl(token) {
    return `${String(config.PUBLIC_APP_URL).replace(/\/$/, '')}/public-card/${encodeURIComponent(token)}`;
  }

  async ensureCatalogsSchema() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS areas (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(120) NOT NULL,
        descripcion TEXT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_areas_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cargos (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(160) NOT NULL,
        area_id INT NULL,
        descripcion TEXT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_cargos_nombre (nombre),
        KEY ix_cargos_area (area_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sedes (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(120) NOT NULL,
        direccion VARCHAR(220) NULL,
        ciudad VARCHAR(120) NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_sedes_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS modalidades (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(80) NOT NULL,
        descripcion TEXT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_modalidades_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tipos_persona (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(80) NOT NULL,
        descripcion TEXT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY ux_tipos_persona_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.seedCatalogs();
  }

  async seedCatalogs() {
    const areas = ['Aprendiz', 'B2B', 'Billing', 'CCM', 'CCM/RMP', 'Cardiología', 'Contabilidad', 'Coordinación Especialista', 'Direccion', 'Finance', 'IT', 'Legal', 'LOP', 'Marketing', 'Medical Assistant', 'PAP', 'RMP', 'Recursos Humanos', 'Servicios Generales'];
    const cargos = ['Analista Contable', 'Analista Contable Senior', 'Analista Contable y Reporting', 'Analista de Facturación y Cobros', 'Analista de Marketing Digital', 'Analista de Recursos Humanos', 'Aprendiz Marketing', 'Aprendiz Recursos Humanos', 'Asistente Legal', 'Asistente Médico enfocado en coordinación de Atención al Paciente', 'Asistente Médico con enfoque en ciclo de Facturación', 'Coordinador de Marketing Junior', 'Direccion', 'Director de Recursos Humanos', 'Especialista en Generación de Leads B2B', 'General Manager', 'Gestor Médico con Énfasis Administrativo', 'IT Asistencia Remota Junior', 'Jefe de Contabilidad', 'Manager Contable y Financiero', 'Médico', 'Office and Operations Manager', 'Operaria de Limpieza y Servicios Generales', 'Project Manager', 'Revenue Cycle', 'Servicio de Asistencia Remota'];
    const sedes = [['Colina', '', 'Bogotá'], ['123', '', 'Bogotá'], ['Medellin', '', 'Medellín'], ['Uruguay', '', 'Montevideo']];
    const modalidades = ['Presencial', 'Remoto', 'Híbrido'];
    const tiposPersona = ['Empleado', 'Contratista', 'Visitante', 'Practicante', 'Proveedor'];
    for (const area of areas) await this.pool.execute('INSERT IGNORE INTO areas (nombre) VALUES (?)', [area]);
    for (const cargo of cargos) await this.pool.execute('INSERT IGNORE INTO cargos (nombre) VALUES (?)', [cargo]);
    for (const sede of sedes) await this.pool.execute('INSERT IGNORE INTO sedes (nombre, direccion, ciudad) VALUES (?, ?, ?)', sede);
    for (const modalidad of modalidades) await this.pool.execute('INSERT IGNORE INTO modalidades (nombre) VALUES (?)', [modalidad]);
    for (const tipo of tiposPersona) await this.pool.execute('INSERT IGNORE INTO tipos_persona (nombre) VALUES (?)', [tipo]);
  }

  async ensureCarnetsSchema() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS carnets (
        id INT NOT NULL AUTO_INCREMENT,
        persona_id INT NOT NULL,
        codigo_carnet VARCHAR(80) NOT NULL,
        qr_token VARCHAR(120) NOT NULL,
        qr_url VARCHAR(500) NOT NULL,
        fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento DATETIME NULL,
        estado_carnet VARCHAR(40) NOT NULL DEFAULT 'Vigente',
        version INT NOT NULL DEFAULT 1,
        archivo_url TEXT NULL,
        entregado TINYINT(1) NOT NULL DEFAULT 0,
        metodo_entrega VARCHAR(80) NULL,
        fecha_entrega DATETIME NULL,
        entregado_por VARCHAR(120) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY ux_carnets_codigo (codigo_carnet),
        UNIQUE KEY ux_carnets_token (qr_token),
        KEY ix_carnets_persona_estado (persona_id, estado_carnet),
        CONSTRAINT fk_carnets_people FOREIGN KEY (persona_id) REFERENCES people(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.ensureCarnetsShareFields();
    const [peopleWithoutCard] = await this.pool.query(`
      SELECT p.id
      FROM people p
      WHERE NOT EXISTS (SELECT 1 FROM carnets c WHERE c.persona_id = p.id AND c.estado_carnet = 'Vigente')
    `);
    for (const person of peopleWithoutCard) {
      const token = this.generateShareToken();
      await this.pool.execute(
        'INSERT INTO carnets (persona_id, codigo_carnet, qr_token, qr_url, version) VALUES (?, ?, ?, ?, 1)',
        [person.id, `AP-${String(person.id).padStart(4, '0')}-V1`, token, this.publicCardUrl(token)]
      );
    }
  }

  async ensureCarnetsShareFields() {
    const [columns] = await this.pool.query('SHOW COLUMNS FROM carnets');
    const columnNames = new Set(columns.map((column) => column.Field));

    if (!columnNames.has('qr_token')) {
      await this.pool.query('ALTER TABLE carnets ADD COLUMN qr_token VARCHAR(120) NULL AFTER codigo_carnet');
    }

    if (!columnNames.has('qr_url')) {
      await this.pool.query('ALTER TABLE carnets ADD COLUMN qr_url VARCHAR(500) NULL AFTER qr_token');
    }

    const [missingTokens] = await this.pool.query("SELECT id FROM carnets WHERE qr_token IS NULL OR qr_token = ''");
    for (const carnet of missingTokens) {
      let saved = false;
      while (!saved) {
        try {
          const token = this.generateShareToken();
          await this.pool.execute('UPDATE carnets SET qr_token = ?, qr_url = ?, updated_at = NOW() WHERE id = ?', [
            token,
            this.publicCardUrl(token),
            Number(carnet.id)
          ]);
          saved = true;
        } catch (error) {
          if (error && error.code === 'ER_DUP_ENTRY') continue;
          throw error;
        }
      }
    }

    await this.pool.execute(
      "UPDATE carnets SET qr_url = CONCAT(?, qr_token), updated_at = NOW() WHERE qr_token IS NOT NULL AND qr_token <> '' AND (qr_url IS NULL OR qr_url = '' OR qr_url NOT LIKE '%/public-card/%')",
      [`${String(config.PUBLIC_APP_URL).replace(/\/$/, '')}/public-card/`]
    );

    await this.addUniqueIndexIfMissing('carnets', 'ux_carnets_token', 'qr_token');

    try {
      await this.pool.query('ALTER TABLE carnets MODIFY qr_token VARCHAR(120) NOT NULL');
      await this.pool.query('ALTER TABLE carnets MODIFY qr_url VARCHAR(500) NOT NULL');
    } catch (error) {
      logger.warn(`Could not enforce carnet public link columns as NOT NULL: ${error.message}`);
    }
  }

  normalize(personData) {
    const status = String(personData.status || 'Activo').trim();
    const startDate = String(personData.startDate || '').trim();
    return {
      fullName: String(personData.fullName || '').trim(),
      email: String(personData.email || '').trim(),
      documentNumber: String(personData.documentNumber || '').trim(),
      department: String(personData.department || '').trim(),
      role: String(personData.role || '').trim(),
      site: String(personData.site || 'Colina').trim(),
      status: status === 'Vacaciones' ? 'Suspendido' : status,
      mode: String(personData.mode || 'Presencial').trim(),
      personType: String(personData.personType || 'Empleado').trim(),
      employeeCode: String(personData.employeeCode || '').trim() || null,
      phone: String(personData.phone || '').trim() || null,
      startDate: startDate ? startDate.slice(0, 10) : null,
      observations: String(personData.observations || '').trim() || null,
      avatar: String(personData.avatar || 'img/defecto_perfil.jpeg').trim() || 'img/defecto_perfil.jpeg'
    };
  }

  validateRequired(person) {
    const requiredFields = ['fullName', 'email', 'documentNumber', 'department', 'role', 'site'];
    const missing = requiredFields.filter((field) => !person[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  async getAll() {
    await this.ready;
    const [rows] = await this.pool.query('SELECT id, fullName, email, documentNumber, department, role, site, status, mode, personType, employeeCode, phone, startDate, observations, avatar FROM people ORDER BY id DESC');
    return this.attachActiveCarnets(rows);
  }

  async getById(id) {
    await this.ready;
    const [rows] = await this.pool.execute(
      'SELECT id, fullName, email, documentNumber, department, role, site, status, mode, personType, employeeCode, phone, startDate, observations, avatar FROM people WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    const people = await this.attachActiveCarnets(rows);
    return people[0] || null;
  }

  async getPublicCardByToken(token) {
    await this.ready;
    const [rows] = await this.pool.execute(
      `SELECT p.id, p.fullName, p.email, p.documentNumber, p.department, p.role, p.site, p.status, p.mode, p.personType, p.employeeCode, p.phone, p.startDate, p.observations, p.avatar
       FROM carnets c
       INNER JOIN people p ON p.id = c.persona_id
       WHERE c.qr_token = ? AND c.estado_carnet = ? AND c.deleted_at IS NULL
       LIMIT 1`,
      [token, ACTIVE_CARD_STATUS]
    );
    const people = await this.attachActiveCarnets(rows);
    return people[0] || null;
  }

  async create(personData) {
    await this.ready;
    const person = this.normalize(personData);
    this.validateRequired(person);

    try {
      const [result] = await this.pool.execute(
        'INSERT INTO people (fullName, email, documentNumber, department, role, site, status, mode, personType, employeeCode, phone, startDate, observations, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [person.fullName, person.email, person.documentNumber, person.department, person.role, person.site, person.status, person.mode, person.personType, person.employeeCode, person.phone, person.startDate, person.observations, person.avatar]
      );
      await this.generateCarnetForPerson(result.insertId);
      return this.getById(result.insertId);
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una persona con el mismo documento, correo o código de empleado');
      }
      throw error;
    }
  }

  async bulkCreate(peopleData = []) {
    await this.ready;
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
    const employeeCode = String(personData.employeeCode || '').trim();
    const documentNumber = String(personData.documentNumber || '').trim();
    if (!employeeCode && !documentNumber) return null;
    const [rows] = await this.pool.execute(
      'SELECT id FROM people WHERE (? != "" AND employeeCode = ?) OR (? != "" AND documentNumber = ?) LIMIT 1',
      [employeeCode, employeeCode, documentNumber, documentNumber]
    );
    return rows[0] || null;
  }

  async ensureCatalogValues(personData) {
    const entries = [
      ['areas', personData.department],
      ['cargos', personData.role],
      ['sedes', personData.site]
    ];
    for (const [type, value] of entries) {
      const nombre = String(value || '').trim();
      if (!nombre) continue;
      try {
        await this.createCatalogItem(type, { nombre });
      } catch (error) {
        if (!/Duplicate|duplic|existe/i.test(error.message || '') && error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
    }
  }

  async update(id, personData) {
    await this.ready;
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const person = this.normalize({ ...existing, ...personData });
    this.validateRequired(person);

    try {
      await this.pool.execute(
        'UPDATE people SET fullName = ?, email = ?, documentNumber = ?, department = ?, role = ?, site = ?, status = ?, mode = ?, personType = ?, employeeCode = ?, phone = ?, startDate = ?, observations = ?, avatar = ? WHERE id = ?',
        [person.fullName, person.email, person.documentNumber, person.department, person.role, person.site, person.status, person.mode, person.personType, person.employeeCode, person.phone, person.startDate, person.observations, person.avatar, Number(id)]
      );
      return this.getById(id);
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una persona con el mismo documento, correo o código de empleado');
      }
      throw error;
    }
  }

  async delete(id) {
    await this.ready;
    const [result] = await this.pool.execute('DELETE FROM people WHERE id = ?', [Number(id)]);
    return result.affectedRows > 0;
  }

  async bulkDelete(ids) {
    await this.ready;
    const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueIds.length === 0) {
      return { requested: 0, deleted: 0, deletedIds: [], missingIds: [] };
    }

    const [existing] = await this.pool.query('SELECT id FROM people WHERE id IN (?)', [uniqueIds]);
    const deletedIds = existing.map((row) => Number(row.id));
    const deletedSet = new Set(deletedIds);

    if (deletedIds.length > 0) {
      await this.pool.query('DELETE FROM people WHERE id IN (?)', [deletedIds]);
    }

    return {
      requested: uniqueIds.length,
      deleted: deletedIds.length,
      deletedIds,
      missingIds: uniqueIds.filter((id) => !deletedSet.has(id))
    };
  }

  async attachActiveCarnets(people) {
    if (!people.length) return people;
    const ids = people.map((person) => Number(person.id));
    const [carnets] = await this.pool.query(
      `SELECT * FROM carnets WHERE persona_id IN (?) AND deleted_at IS NULL ORDER BY version DESC`,
      [ids]
    );
    return people.map((person) => ({
      ...person,
      activeCarnet: carnets.find((card) => Number(card.persona_id) === Number(person.id) && card.estado_carnet === ACTIVE_CARD_STATUS) ||
        carnets.find((card) => Number(card.persona_id) === Number(person.id)) ||
        null
    }));
  }

  async generateCarnetForPerson(personId) {
    await this.ready;
    const existing = await this.getById(personId);
    if (!existing) return null;
    await this.pool.execute('UPDATE carnets SET estado_carnet = ?, updated_at = NOW() WHERE persona_id = ? AND estado_carnet = ?', [REPLACED_CARD_STATUS, Number(personId), ACTIVE_CARD_STATUS]);
    const [versionRows] = await this.pool.execute('SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion FROM carnets WHERE persona_id = ?', [Number(personId)]);
    const version = Number(versionRows[0]?.nextVersion || 1);
    const token = this.generateShareToken();
    const qrUrl = this.publicCardUrl(token);
    const code = `AP-${String(personId).padStart(4, '0')}-V${version}`;
    const [result] = await this.pool.execute(
      'INSERT INTO carnets (persona_id, codigo_carnet, qr_token, qr_url, version) VALUES (?, ?, ?, ?, ?)',
      [Number(personId), code, token, qrUrl, version]
    );
    const [rows] = await this.pool.execute('SELECT * FROM carnets WHERE id = ?', [result.insertId]);
    return rows[0] || null;
  }

  async markCarnetDelivered(personId, deliveryData = {}) {
    await this.ready;
    await this.pool.execute(
      "UPDATE carnets SET entregado = 1, metodo_entrega = ?, fecha_entrega = NOW(), entregado_por = ?, updated_at = NOW() WHERE persona_id = ? AND estado_carnet = 'Vigente'",
      [String(deliveryData.metodo_entrega || deliveryData.method || 'Correo'), String(deliveryData.entregado_por || deliveryData.deliveredBy || 'Sistema'), Number(personId)]
    );
    const person = await this.getById(personId);
    return person?.activeCarnet || null;
  }

  async validateCarnetByToken(token) {
    await this.ready;
    const [rows] = await this.pool.execute('SELECT * FROM carnets WHERE qr_token = ? AND deleted_at IS NULL LIMIT 1', [token]);
    const carnet = rows[0] || null;
    if (!carnet) return null;
    const [people] = await this.pool.execute('SELECT * FROM people WHERE id = ? LIMIT 1', [carnet.persona_id]);
    const person = people[0] || null;
    if (!person) return { valid: false, reason: 'Persona no encontrada', carnet, person: null };
    const expired = carnet.fecha_vencimiento ? new Date(carnet.fecha_vencimiento) < new Date() : false;
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

  async getCatalogs() {
    await this.ready;
    const [areas] = await this.pool.query('SELECT id, nombre, descripcion, activo FROM areas ORDER BY nombre');
    const [cargos] = await this.pool.query('SELECT id, nombre, area_id, descripcion, activo FROM cargos ORDER BY nombre');
    const [sedes] = await this.pool.query('SELECT id, nombre, direccion, ciudad, activo FROM sedes ORDER BY nombre');
    const [modalidades] = await this.pool.query('SELECT id, nombre, descripcion, activo FROM modalidades ORDER BY nombre');
    const [tiposPersona] = await this.pool.query('SELECT id, nombre, descripcion, activo FROM tipos_persona ORDER BY nombre');
    const estadosPersona = ['Activo', 'Inactivo', 'Retirado', 'Suspendido'].map((nombre, index) => ({ id: index + 1, nombre, activo: true }));
    const estadosCarnet = ['Vigente', 'Vencido', 'Anulado', 'Extraviado', 'Reemplazado', 'Bloqueado'].map((nombre, index) => ({ id: index + 1, nombre, activo: true }));
    return { areas, cargos, sedes, modalidades, tiposPersona, estadosPersona, estadosCarnet };
  }

  async createCatalogItem(type, payload = {}) {
    await this.ready;
    const nombre = String(payload.nombre || payload.name || '').trim();
    if (!nombre) throw new Error('nombre is required');

    try {
      if (type === 'areas') {
      await this.pool.execute('INSERT INTO areas (nombre, descripcion, activo) VALUES (?, ?, 1)', [nombre, String(payload.descripcion || '').trim()]);
      const [rows] = await this.pool.execute('SELECT id, nombre, descripcion, activo FROM areas WHERE nombre = ? LIMIT 1', [nombre]);
      return rows[0];
      }

      if (type === 'cargos') {
      await this.pool.execute('INSERT INTO cargos (nombre, area_id, descripcion, activo) VALUES (?, ?, ?, 1)', [nombre, payload.area_id ? Number(payload.area_id) : null, String(payload.descripcion || '').trim()]);
      const [rows] = await this.pool.execute('SELECT id, nombre, area_id, descripcion, activo FROM cargos WHERE nombre = ? LIMIT 1', [nombre]);
      return rows[0];
      }

      if (type === 'sedes') {
      await this.pool.execute('INSERT INTO sedes (nombre, direccion, ciudad, activo) VALUES (?, ?, ?, 1)', [nombre, String(payload.direccion || '').trim(), String(payload.ciudad || '').trim()]);
      const [rows] = await this.pool.execute('SELECT id, nombre, direccion, ciudad, activo FROM sedes WHERE nombre = ? LIMIT 1', [nombre]);
      return rows[0];
      }
      if (type === 'modalidades') {
        await this.pool.execute('INSERT INTO modalidades (nombre, descripcion, activo) VALUES (?, ?, 1)', [nombre, String(payload.descripcion || '').trim()]);
        const [rows] = await this.pool.execute('SELECT id, nombre, descripcion, activo FROM modalidades WHERE nombre = ? LIMIT 1', [nombre]);
        return rows[0];
      }
      if (type === 'tiposPersona') {
        await this.pool.execute('INSERT INTO tipos_persona (nombre, descripcion, activo) VALUES (?, ?, 1)', [nombre, String(payload.descripcion || '').trim()]);
        const [rows] = await this.pool.execute('SELECT id, nombre, descripcion, activo FROM tipos_persona WHERE nombre = ? LIMIT 1', [nombre]);
        return rows[0];
      }
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe un elemento con ese nombre');
      }
      throw error;
    }

    throw new Error('Unsupported catalog');
  }

  async updateCatalogItem(type, id, payload = {}) {
    await this.ready;
    const nombre = String(payload.nombre || payload.name || '').trim();
    if (!nombre) throw new Error('nombre is required');
    try {
      if (type === 'areas') {
        await this.pool.execute('UPDATE areas SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?', [nombre, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, Number(id)]);
      } else if (type === 'cargos') {
        await this.pool.execute('UPDATE cargos SET nombre = ?, area_id = ?, descripcion = ?, activo = ? WHERE id = ?', [nombre, payload.area_id ? Number(payload.area_id) : null, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, Number(id)]);
      } else if (type === 'sedes') {
        await this.pool.execute('UPDATE sedes SET nombre = ?, direccion = ?, ciudad = ?, activo = ? WHERE id = ?', [nombre, String(payload.direccion || '').trim(), String(payload.ciudad || '').trim(), payload.activo === false ? 0 : 1, Number(id)]);
      } else if (type === 'modalidades') {
        await this.pool.execute('UPDATE modalidades SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?', [nombre, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, Number(id)]);
      } else if (type === 'tiposPersona') {
        await this.pool.execute('UPDATE tipos_persona SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?', [nombre, String(payload.descripcion || '').trim(), payload.activo === false ? 0 : 1, Number(id)]);
      } else {
        throw new Error('Unsupported catalog');
      }
      return this.getCatalogItem(type, id);
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') throw new Error('Ya existe un elemento con ese nombre');
      throw error;
    }
  }

  async deleteCatalogItem(type, id) {
    await this.ready;
    const item = await this.getCatalogItem(type, id);
    if (!item) return false;
    const usageColumn = type === 'areas' ? 'department' : type === 'cargos' ? 'role' : type === 'sedes' ? 'site' : type === 'modalidades' ? 'mode' : 'personType';
    if (!usageColumn) throw new Error('Unsupported catalog');
    const [usage] = await this.pool.execute(`SELECT COUNT(1) AS total FROM people WHERE ${usageColumn} = ?`, [item.nombre]);
    if (Number(usage[0]?.total || 0) > 0) {
      throw new Error('No se puede eliminar porque está asociado a personas existentes');
    }
    const table = type === 'areas' ? 'areas' : type === 'cargos' ? 'cargos' : type === 'sedes' ? 'sedes' : type === 'modalidades' ? 'modalidades' : 'tipos_persona';
    const [result] = await this.pool.execute(`DELETE FROM ${table} WHERE id = ?`, [Number(id)]);
    return result.affectedRows > 0;
  }

  async getCatalogItem(type, id) {
    const table = type === 'areas' ? 'areas' : type === 'cargos' ? 'cargos' : type === 'sedes' ? 'sedes' : type === 'modalidades' ? 'modalidades' : type === 'tiposPersona' ? 'tipos_persona' : null;
    if (!table) throw new Error('Unsupported catalog');
    const [rows] = await this.pool.execute(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [Number(id)]);
    return rows[0] || null;
  }
}

module.exports = MySqlPeopleModel;
