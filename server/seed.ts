/**
 * Seeds the SQLite database from a scraped course-mappings CSV.
 *
 * - Parses data_scrapping/out/<key>_course_mappings.csv
 * - Replaces truncated/outdated NUS course titles with fresh ones from the
 *   NUSMods API (falls back to the scraped title when a module is not found)
 * - Inserts into the normalised schema (see db.ts)
 *
 * Usage: npm run seed [-- <key>]   (default key: soc)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './csv.js';
import { openDb } from './db.js';
import { formatUniversityName } from '../src/lib/universityName.js';

const ACAD_YEAR = '2026-2027';
const NUSMODS_API = `https://api.nusmods.com/v2/${ACAD_YEAR}/modules`;
const CONCURRENCY = 8;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const key = process.argv[2] ?? 'soc';
const csvPath = join(root, 'data_scrapping', 'out', `${key}_course_mappings.csv`);

interface CsvMapping {
  faculty: string;
  university: string;
  puCode: string;
  puTitle: string;
  puUnits: number | null;
  nusCode: string;
  nusTitle: string;
  nusUnits: number | null;
  preApproved: boolean;
}

function loadCsv(path: string): CsvMapping[] {
  const text = readFileSync(path, 'utf-8').replace(/^﻿/, '');
  const [header, ...rows] = parseCsv(text);
  const col = Object.fromEntries(header.map((name, i) => [name, i]));
  for (const required of [
    'Faculty',
    'Partner University',
    'PU Course',
    'PU Course Title',
    'PU Course Units',
    'NUS Course',
    'NUS Course Title',
    'NUS Course Units',
    'Pre Approved',
  ]) {
    if (!(required in col)) throw new Error(`Missing CSV column: ${required}`);
  }

  const mappings: CsvMapping[] = [];
  let dropped = 0;
  for (const row of rows) {
    const university = formatUniversityName(row[col['Partner University']]?.trim() ?? '');
    const puCode = row[col['PU Course']]?.trim() ?? '';
    const nusCode = row[col['NUS Course']]?.trim() ?? '';
    if (!university || !puCode || !nusCode) {
      dropped++;
      continue;
    }
    mappings.push({
      faculty: row[col['Faculty']].trim(),
      university,
      puCode,
      puTitle: row[col['PU Course Title']].trim(),
      puUnits: parseFloat(row[col['PU Course Units']]) || null,
      nusCode,
      nusTitle: row[col['NUS Course Title']].trim(),
      nusUnits: parseFloat(row[col['NUS Course Units']]) || null,
      preApproved: row[col['Pre Approved']].trim() === 'True',
    });
  }
  if (dropped > 0) console.log(`Dropped ${dropped} rows with missing key fields.`);
  return mappings;
}

async function fetchNusModsTitles(
  codes: string[],
): Promise<Map<string, { title: string; units: number | null }>> {
  console.log(`Fetching ${codes.length} NUS course titles from NUSMods (AY ${ACAD_YEAR})...`);
  const result = new Map<string, { title: string; units: number | null }>();
  let next = 0;
  let missing = 0;
  async function worker() {
    while (next < codes.length) {
      const code = codes[next++];
      try {
        const res = await fetch(`${NUSMODS_API}/${encodeURIComponent(code)}.json`);
        if (res.status === 404) {
          missing++;
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const mod = (await res.json()) as { title?: string; moduleCredit?: string };
        if (mod.title) {
          result.set(code, {
            title: mod.title,
            units: mod.moduleCredit ? parseFloat(mod.moduleCredit) || null : null,
          });
        }
      } catch (err) {
        missing++;
        console.warn(`  warn: ${String(err)} — keeping scraped title for ${code}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, codes.length) }, worker));
  console.log(`Enriched ${result.size} titles; ${missing} kept their scraped titles.`);
  return result;
}

async function main() {
  const mappings = loadCsv(csvPath);
  console.log(`Parsed ${mappings.length} mapping rows from ${csvPath}`);

  const nusCodes = [...new Set(mappings.map((m) => m.nusCode))];
  const enriched = await fetchNusModsTitles(nusCodes);

  const db = openDb();
  const insertFaculty = db.prepare('INSERT OR IGNORE INTO faculties (name) VALUES (?)');
  const getFaculty = db.prepare('SELECT id FROM faculties WHERE name = ?');
  const insertUni = db.prepare('INSERT OR IGNORE INTO universities (name) VALUES (?)');
  const getUni = db.prepare('SELECT id FROM universities WHERE name = ?');
  const upsertNusCourse = db.prepare(`
    INSERT INTO nus_courses (code, title, units) VALUES (?, ?, ?)
    ON CONFLICT (code) DO UPDATE SET title = excluded.title, units = excluded.units
  `);
  const insertPuCourse = db.prepare(`
    INSERT OR IGNORE INTO pu_courses (university_id, code, title, units) VALUES (?, ?, ?, ?)
  `);
  const getPuCourse = db.prepare('SELECT id FROM pu_courses WHERE university_id = ? AND code = ?');
  const upsertMapping = db.prepare(`
    INSERT INTO mappings (faculty_id, pu_course_id, nus_course_code, pre_approved)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (faculty_id, pu_course_id, nus_course_code)
      DO UPDATE SET pre_approved = MAX(pre_approved, excluded.pre_approved)
  `);
  const setMeta = db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value
  `);

  const seed = db.transaction(() => {
    // Re-seeding a faculty replaces its mappings wholesale.
    const facultyName = mappings[0].faculty;
    insertFaculty.run(facultyName);
    const facultyId = (getFaculty.get(facultyName) as { id: number }).id;
    db.prepare('DELETE FROM mappings WHERE faculty_id = ?').run(facultyId);

    for (const m of mappings) {
      insertUni.run(m.university);
      const uniId = (getUni.get(m.university) as { id: number }).id;

      const fresh = enriched.get(m.nusCode);
      upsertNusCourse.run(m.nusCode, fresh?.title ?? m.nusTitle, fresh?.units ?? m.nusUnits);

      insertPuCourse.run(uniId, m.puCode, m.puTitle, m.puUnits);
      const puId = (getPuCourse.get(uniId, m.puCode) as { id: number }).id;

      upsertMapping.run(facultyId, puId, m.nusCode, m.preApproved ? 1 : 0);
    }
    // Entities that no longer back any mapping (e.g. universities left behind
    // by a rename) would otherwise linger and skew the meta counts.
    db.prepare('DELETE FROM pu_courses WHERE id NOT IN (SELECT pu_course_id FROM mappings)').run();
    db.prepare(
      'DELETE FROM universities WHERE id NOT IN (SELECT university_id FROM pu_courses)',
    ).run();
    setMeta.run('acadYear', ACAD_YEAR);
    setMeta.run(`seededAt:${facultyName}`, new Date().toISOString());
  });
  seed();

  const count = (db.prepare('SELECT COUNT(*) AS c FROM mappings').get() as { c: number }).c;
  console.log(`Done. Database now holds ${count} mappings.`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
