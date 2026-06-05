/**
 * MySQL-backed People Model
 */

const mysql = require('mysql2/promise');
const config = require('../../../config/environment');
const logger = require('../utils/logger');

const DEFAULT_PEOPLE = [
  {
    fullName: 'John Doe',
    email: 'john.doe@assistpoint.com',
    department: 'Tecnologia',
    role: 'Desarrollador Front End',
    site: 'Colina',
    status: 'Activo',
    mode: 'Híbrido',
    avatar: 'img/1.png'
  },
  {
    fullName: 'Maria Perez',
    email: 'maria.perez@assistpoint.com',
    department: 'Recursos Humanos',
    role: 'Analista de talento',
    site: '123',
    status: 'Activo',
    mode: 'Presencial',
    avatar: 'img/2.png'
  },
  {
    fullName: 'Camilo Rojas',
    email: 'camilo.rojas@assistpoint.com',
    department: 'Operaciones',
    role: 'Coordinador logistico',
    site: 'Medellin',
    status: 'Vacaciones',
    mode: 'Remoto',
    avatar: 'img/carnet.png'
  }
];

class MySqlPeopleModel {
  constructor() {
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

    this.ready = this.initialize();
  }

  async initialize() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS people (
          id INT NOT NULL AUTO_INCREMENT,
          fullName VARCHAR(160) NOT NULL,
          email VARCHAR(200) NOT NULL,
          department VARCHAR(120) NOT NULL,
          role VARCHAR(160) NOT NULL,
          site VARCHAR(80) NOT NULL DEFAULT 'Colina',
          status VARCHAR(40) NOT NULL DEFAULT 'Activo',
          mode VARCHAR(40) NOT NULL DEFAULT 'Presencial',
          avatar LONGTEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY ux_people_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await this.ensureSchema();

      const [rows] = await this.pool.query('SELECT COUNT(1) AS count FROM people');
      if ((rows[0]?.count || 0) === 0) {
        const sql = 'INSERT INTO people (fullName, email, department, role, site, status, mode, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        for (const person of DEFAULT_PEOPLE) {
          await this.pool.execute(sql, [
            person.fullName,
            person.email,
            person.department,
            person.role,
            person.site,
            person.status,
            person.mode,
            person.avatar
          ]);
        }
        logger.info('MySQL seeded with default people');
      }
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

    await this.pool.query("ALTER TABLE people MODIFY avatar LONGTEXT NOT NULL");
  }

  normalize(personData) {
    return {
      fullName: String(personData.fullName || '').trim(),
      email: String(personData.email || '').trim(),
      department: String(personData.department || '').trim(),
      role: String(personData.role || '').trim(),
      site: String(personData.site || 'Colina').trim(),
      status: String(personData.status || 'Activo').trim(),
      mode: String(personData.mode || 'Presencial').trim(),
      avatar: String(personData.avatar || 'img/carnet.png').trim() || 'img/carnet.png'
    };
  }

  validateRequired(person) {
    const requiredFields = ['fullName', 'email', 'department', 'role', 'site'];
    const missing = requiredFields.filter((field) => !person[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  async getAll() {
    await this.ready;
    const [rows] = await this.pool.query('SELECT id, fullName, email, department, role, site, status, mode, avatar FROM people ORDER BY id DESC');
    return rows;
  }

  async getById(id) {
    await this.ready;
    const [rows] = await this.pool.execute(
      'SELECT id, fullName, email, department, role, site, status, mode, avatar FROM people WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    return rows[0] || null;
  }

  async create(personData) {
    await this.ready;
    const person = this.normalize(personData);
    this.validateRequired(person);

    try {
      const [result] = await this.pool.execute(
        'INSERT INTO people (fullName, email, department, role, site, status, mode, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [person.fullName, person.email, person.department, person.role, person.site, person.status, person.mode, person.avatar]
      );
      return this.getById(result.insertId);
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already exists');
      }
      throw error;
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
        'UPDATE people SET fullName = ?, email = ?, department = ?, role = ?, site = ?, status = ?, mode = ?, avatar = ? WHERE id = ?',
        [person.fullName, person.email, person.department, person.role, person.site, person.status, person.mode, person.avatar, Number(id)]
      );
      return this.getById(id);
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async delete(id) {
    await this.ready;
    const [result] = await this.pool.execute('DELETE FROM people WHERE id = ?', [Number(id)]);
    return result.affectedRows > 0;
  }
}

module.exports = MySqlPeopleModel;
