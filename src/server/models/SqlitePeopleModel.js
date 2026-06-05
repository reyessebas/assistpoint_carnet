/**
 * Sqlite-backed People Model (using better-sqlite3)
 */

const path = require('path');
const fileSystem = require('../utils/fileSystem');
const logger = require('../utils/logger');
const config = require('../../../config/environment');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DEFAULT_PEOPLE = [
  { id: 1, fullName: 'John Doe', email: 'john.doe@assistpoint.com', department: 'Tecnología', role: 'Desarrollador Front End', status: 'Activo', mode: 'Híbrido', avatar: 'img/1.png' },
  { id: 2, fullName: 'María Pérez', email: 'maria.perez@assistpoint.com', department: 'Recursos Humanos', role: 'Analista de talento', status: 'Activo', mode: 'Presencial', avatar: 'img/2.png' }
];

class SqlitePeopleModel {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    fileSystem.ensureDir(this.dataDir);
    this.dbPath = path.join(this.dataDir, 'people.db');
    this.dbPromise = open({ filename: this.dbPath, driver: sqlite3.Database }).then(async (db) => {
      await db.exec(`PRAGMA foreign_keys = ON;`);
      await db.exec(`CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT,
        mode TEXT,
        avatar TEXT,
        _createdAt TEXT,
        _updatedAt TEXT
      );`);
      // seed
      const row = await db.get('SELECT COUNT(1) as c FROM people');
      if (row && row.c === 0) {
        const now = new Date().toISOString();
        const insert = `INSERT INTO people (fullName,email,department,role,status,mode,avatar,_createdAt,_updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`;
        const stmt = await db.prepare(insert);
        try {
          await db.run('BEGIN TRANSACTION');
          for (const it of DEFAULT_PEOPLE) {
            await stmt.run(it.fullName, it.email, it.department, it.role, it.status, it.mode, it.avatar, now, now);
          }
          await db.run('COMMIT');
        } catch (e) {
          await db.run('ROLLBACK');
          logger.error('Error seeding sqlite', e);
        } finally {
          await stmt.finalize();
        }
        logger.info('Sqlite DB seeded with default people');
      }
      return db;
    });
  }

  async getAll() {
    const db = await this.dbPromise;
    return db.all('SELECT * FROM people ORDER BY id DESC');
  }

  async getById(id) {
    const db = await this.dbPromise;
    return db.get('SELECT * FROM people WHERE id = ?', id) || null;
  }

  async create(personData) {
    const db = await this.dbPromise;
    const now = new Date().toISOString();
    const insert = `INSERT INTO people (fullName,email,department,role,status,mode,avatar,_createdAt,_updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`;
    const result = await db.run(insert, String(personData.fullName || '').trim(), String(personData.email || '').trim(), String(personData.department || '').trim(), String(personData.role || '').trim(), String(personData.status || 'Activo').trim(), String(personData.mode || 'Presencial').trim(), String(personData.avatar || 'img/carnet.png').trim() || 'img/carnet.png', now, now);
    return this.getById(result.lastID);
  }

  async update(id, personData) {
    const db = await this.dbPromise;
    const existing = await this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated = {
      fullName: String(personData.fullName || existing.fullName).trim(),
      email: String(personData.email || existing.email).trim(),
      department: String(personData.department || existing.department).trim(),
      role: String(personData.role || existing.role).trim(),
      status: String(personData.status || existing.status).trim(),
      mode: String(personData.mode || existing.mode).trim(),
      avatar: String(personData.avatar || existing.avatar).trim() || existing.avatar,
      _updatedAt: now
    };
    await db.run('UPDATE people SET fullName=?,email=?,department=?,role=?,status=?,mode=?,avatar=?,_updatedAt=? WHERE id=?', updated.fullName, updated.email, updated.department, updated.role, updated.status, updated.mode, updated.avatar, updated._updatedAt, id);
    return this.getById(id);
  }

  async delete(id) {
    const db = await this.dbPromise;
    const existing = await this.getById(id);
    if (!existing) return false;
    await db.run('DELETE FROM people WHERE id = ?', id);
    return true;
  }
}

module.exports = SqlitePeopleModel;
