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

export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      await mkdir(join(__dirname, '..', '..', 'data'), { recursive: true });
      const db = await openDb();
      await initSchema(db);
      await migrateAddAssignedTo(db);
      await migrateAssigneeUserName(db);
      await seedTasksIfEmpty(db);
      return db;
    })();
  }

  return dbPromise;
}

export { run, get, all };
