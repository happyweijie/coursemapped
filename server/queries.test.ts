import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { openDb } from './db';
import { getMeta, listUniversities, resolveKeys, searchMappings } from './queries';

function seedFixture(db: Database.Database) {
  db.prepare('INSERT INTO faculties (id, name) VALUES (1, ?)').run('School of Computing');
  const insertUni = db.prepare('INSERT INTO universities (id, name) VALUES (?, ?)');
  insertUni.run(1, 'ETH Zurich');
  insertUni.run(2, 'Aalto University');
  const insertNus = db.prepare('INSERT INTO nus_courses (code, title, units) VALUES (?, ?, ?)');
  insertNus.run('CS3244', 'Machine Learning', 4);
  insertNus.run('CS2102', 'Database Systems', 4);
  const insertPu = db.prepare(
    'INSERT INTO pu_courses (id, university_id, code, title, units) VALUES (?, ?, ?, ?, ?)',
  );
  insertPu.run(1, 1, '227-0105-00L', 'Intro to Estimation and Machine Learning', 6);
  insertPu.run(2, 1, '252-0063-00L', 'Data Modelling and Databases', 7);
  insertPu.run(3, 2, 'CS-E4820', 'Advanced Probabilistic Methods', 5);
  const insertMapping = db.prepare(
    'INSERT INTO mappings (faculty_id, pu_course_id, nus_course_code, pre_approved) VALUES (1, ?, ?, ?)',
  );
  insertMapping.run(1, 'CS3244', 1);
  insertMapping.run(2, 'CS2102', 0);
  insertMapping.run(3, 'CS3244', 0);
}

describe('queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(':memory:');
    seedFixture(db);
  });

  it('searches by NUS course code', () => {
    const { rows, truncated } = searchMappings(db, 'CS3244');
    expect(truncated).toBe(false);
    expect(rows.map((r) => r.puCode).sort()).toEqual(['227-0105-00L', 'CS-E4820']);
    expect(rows.every((r) => r.nusTitle === 'Machine Learning')).toBe(true);
  });

  it('requires every token to match (AND semantics)', () => {
    const { rows } = searchMappings(db, 'machine aalto');
    expect(rows).toHaveLength(1);
    expect(rows[0].university).toBe('Aalto University');
    expect(rows[0].preApproved).toBe(false);
  });

  it('filters by exact university name', () => {
    const { rows } = searchMappings(db, 'CS3244', 'ETH Zurich');
    expect(rows).toHaveLength(1);
    expect(rows[0].puCode).toBe('227-0105-00L');
    expect(rows[0].preApproved).toBe(true);
  });

  it('returns nothing for an empty query without filters', () => {
    expect(searchMappings(db, '   ').rows).toHaveLength(0);
  });

  it('resolves basket keys and reports missing ones', () => {
    const { found, missing } = resolveKeys(db, [
      { u: 'ETH Zurich', p: '227-0105-00L', n: 'CS3244' },
      { u: 'ETH Zurich', p: 'GONE-101', n: 'CS3244' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].puTitle).toBe('Intro to Estimation and Machine Learning');
    expect(missing).toEqual([{ u: 'ETH Zurich', p: 'GONE-101', n: 'CS3244' }]);
  });

  it('lists universities with mapping counts', () => {
    expect(listUniversities(db)).toEqual([
      { name: 'Aalto University', mappingCount: 1 },
      { name: 'ETH Zurich', mappingCount: 2 },
    ]);
  });

  it('reports meta counts', () => {
    const meta = getMeta(db);
    expect(meta.mappingCount).toBe(3);
    expect(meta.universityCount).toBe(2);
    expect(meta.nusCourseCount).toBe(2);
    expect(meta.faculties).toEqual(['School of Computing']);
  });
});
