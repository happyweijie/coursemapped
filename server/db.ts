import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_DB_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'data',
  'coursemapped.db',
);

export function openDb(path: string = DEFAULT_DB_PATH): Database.Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS faculties (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS nus_courses (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      units REAL
    );
    CREATE TABLE IF NOT EXISTS pu_courses (
      id INTEGER PRIMARY KEY,
      university_id INTEGER NOT NULL REFERENCES universities(id),
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      units REAL,
      UNIQUE (university_id, code)
    );
    CREATE TABLE IF NOT EXISTS mappings (
      id INTEGER PRIMARY KEY,
      faculty_id INTEGER NOT NULL REFERENCES faculties(id),
      pu_course_id INTEGER NOT NULL REFERENCES pu_courses(id),
      nus_course_code TEXT NOT NULL REFERENCES nus_courses(code),
      pre_approved INTEGER NOT NULL DEFAULT 0,
      UNIQUE (faculty_id, pu_course_id, nus_course_code)
    );
    CREATE INDEX IF NOT EXISTS idx_mappings_nus ON mappings(nus_course_code);
    CREATE INDEX IF NOT EXISTS idx_pu_courses_uni ON pu_courses(university_id);
  `);
  return db;
}
