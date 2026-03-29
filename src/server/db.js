import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

/**
 * SQLite DB (Server-only)
 * =======================
 * 
 * Diese Datei laeuft NUR auf dem Server. Hier wird die SQLite-Datenbank
 * geoeffnet und das Schema initialisiert. Der Client sieht diese Logik nie.
 * 
 * TanStack Server Functions greifen spaeter auf getDb() zu, um sicher
 * auf die DB zuzugreifen (keine SQL-Queries im Browser!).
 */

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', '..', 'data', 'taskmanager.db');

let dbPromise;

function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initSchema(db) {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_date TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      assigned_to TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
}

async function migrateAddAssignedTo(db) {
  // Pruefe, ob assigned_to Spalte bereits existiert
  const tableInfo = await all(db, `PRAGMA table_info(tasks)`);
  const hasAssignedTo = tableInfo.some(col => col.name === 'assigned_to');
  
  if (!hasAssignedTo) {
    console.log('Migriere: Füge assigned_to Spalte hinzu');
    await run(db, `ALTER TABLE tasks ADD COLUMN assigned_to TEXT`);
  }
}

async function migrateAssigneeUserName(db) {
  await run(
    db,
    `UPDATE tasks
     SET assigned_to = 'user'
     WHERE assigned_to = 'Nutzer123'`
  );
}

async function seedTasksIfEmpty(db) {
  const countRow = await get(db, 'SELECT COUNT(*) as count FROM tasks');
  if (countRow && countRow.count > 0) return;

  // Beispiel-Daten: owner_id = Ersteller, assigned_to = Zuständiger
  await run(
    db,
    'INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
    ['Mockup erstellen', 'in Arbeit', 'Mittel', '2026-03-31', 2, 'user']
  );
  await run(
    db,
    'INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
    ['Abgabe', 'Neu', 'Hoch', '2026-04-10', 2, 'Max Mustermann']
  );
  await run(
    db,
    'INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
    ['Code Review', 'Erledigt', 'Niedrig', '2026-02-15', 1, 'Admin']
  );
  await run(
    db,
    'INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
    ['Testing durchfuehren', 'in Arbeit', 'Hoch', '2026-03-20', 1, 'Erika Musterfrau']
  );
  await run(
    db,
    'INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?)',
    ['Dokumentation schreiben', 'Neu', 'Mittel', '2026-03-25', 2, 'Jon Doe']
  );
}

async function seedVirtualTasksIfNeeded(db) {
  /**
  * TanStack Virtual Seed-Daten
   * ===========================
   *
   * Für Virtualisierung brauchen wir viele Datensätze. Deshalb erzeugen wir
  * einmalig 1200 zusätzliche Tasks mit Prefix "[VIRTUAL TASK]".
   *
   * Warum?
   * - Mit wenigen Rows ist der Performance-Unterschied kaum sichtbar.
   * - Ab 1000+ Rows zeigt TanStack Virtual klaren Mehrwert.
   */
  const targetCount = 1200;
  const row = await get(
    db,
    `SELECT COUNT(*) as count
     FROM tasks
      WHERE title LIKE '[VIRTUAL TASK]%'`
  );

  const existing = Number(row?.count || 0);
  if (existing >= targetCount) return;

  const toInsert = targetCount - existing;
  const chunkSize = 200;

  for (let start = 0; start < toInsert; start += chunkSize) {
    const currentChunkSize = Math.min(chunkSize, toInsert - start);
    const placeholders = [];
    const params = [];

    for (let i = 0; i < currentChunkSize; i++) {
      const index = existing + start + i + 1;
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))');
      params.push(
        `[VIRTUAL TASK] Aufgabe ${index}`,
        'Erledigt',
        'Niedrig',
        '2026-12-31',
        1,
        index % 2 === 0 ? 'Admin' : 'user',
        0
      );
    }

    await run(
      db,
      `INSERT INTO tasks (title, status, priority, due_date, owner_id, assigned_to, is_deleted, created_at, updated_at)
       VALUES ${placeholders.join(', ')}`,
      params
    );
  }
}

async function seedUsersIfEmpty(db) {
  const countRow = await get(db, 'SELECT COUNT(*) as count FROM users');
  if (countRow && countRow.count > 0) return;

  await run(
    db,
    `INSERT INTO users (name, email, role)
     VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
    [
      'Admin',
      'admin@example.com',
      'admin',
      'user',
      'user@example.com',
      'user',
      'Max Mustermann',
      'max@example.com',
      'admin',
      'Erika Musterfrau',
      'erika@example.com',
      'user',
    ]
  );
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      await mkdir(join(__dirname, '..', '..', 'data'), { recursive: true });
      const db = await openDb();
      await initSchema(db);
      await migrateAddAssignedTo(db);
      await migrateAssigneeUserName(db);
      await seedUsersIfEmpty(db);
      await seedTasksIfEmpty(db);
      await seedVirtualTasksIfNeeded(db);
      return db;
    })();
  }

  return dbPromise;
}

export { run, get, all };
