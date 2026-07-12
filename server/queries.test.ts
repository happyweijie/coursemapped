import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { openDb } from './db';
import { getMeta, listUniversities, resolveKeys, searchMappings, SEARCH_LIMIT } from './queries';

function seedFixture(db: Database.Database) {
  const insertFaculty = db.prepare('INSERT INTO faculties (id, name) VALUES (?, ?)');
  insertFaculty.run(1, 'School of Computing');
  insertFaculty.run(2, 'NUS Business School');
  const insertUni = db.prepare('INSERT INTO universities (id, name) VALUES (?, ?)');
  insertUni.run(1, 'ETH Zurich');
  insertUni.run(2, 'Aalto University');
  insertUni.run(3, 'Copenhagen Business School');
  insertUni.run(4, 'The University of Hong Kong');
  const insertNus = db.prepare('INSERT INTO nus_courses (code, title, units) VALUES (?, ?, ?)');
  insertNus.run('CS3244', 'Machine Learning', 4);
  insertNus.run('CS2102', 'Database Systems', 4);
  insertNus.run('MKT1705X', 'Principles of Marketing', 4);
  const insertPu = db.prepare(
    'INSERT INTO pu_courses (id, university_id, code, title, units) VALUES (?, ?, ?, ?, ?)',
  );
  insertPu.run(1, 1, '227-0105-00L', 'Intro to Estimation and Machine Learning', 6);
  insertPu.run(2, 1, '252-0063-00L', 'Data Modelling and Databases', 7);
  insertPu.run(3, 2, 'CS-E4820', 'Advanced Probabilistic Methods', 5);
  insertPu.run(4, 3, 'BMKT10', 'Marketing Fundamentals', 7.5);
  insertPu.run(5, 4, 'COMP3278', 'Introduction to Database Management Systems', 6);
  const insertMapping = db.prepare(
    'INSERT INTO mappings (faculty_id, pu_course_id, nus_course_code, pre_approved) VALUES (?, ?, ?, ?)',
  );
  insertMapping.run(1, 1, 'CS3244', 1);
  insertMapping.run(1, 2, 'CS2102', 0);
  insertMapping.run(1, 3, 'CS3244', 0);
  insertMapping.run(2, 4, 'MKT1705X', 0);
  insertMapping.run(1, 5, 'CS2102', 1);
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

  it('filters by faculty', () => {
    const { rows } = searchMappings(db, 'marketing', undefined, 'NUS Business School');
    expect(rows).toHaveLength(1);
    expect(rows[0].university).toBe('Copenhagen Business School');
    expect(searchMappings(db, 'marketing', undefined, 'School of Computing').rows).toHaveLength(0);
  });

  it('browses favourite universities with an empty query and no filters', () => {
    const { rows, truncated } = searchMappings(db, '', undefined, undefined, ['ETH Zurich']);
    expect(truncated).toBe(false);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.university === 'ETH Zurich')).toBe(true);
  });

  it('sorts favourite universities first', () => {
    const { rows } = searchMappings(db, '', undefined, 'School of Computing', [
      'The University of Hong Kong',
    ]);
    expect(rows).toHaveLength(4);
    expect(rows[0].university).toBe('The University of Hong Kong');
  });

  it('keeps favourite universities when truncating results', () => {
    // Flood ETH Zurich (sorts before HKU) with enough mappings to fill the cap.
    const insertPu = db.prepare(
      'INSERT INTO pu_courses (university_id, code, title, units) VALUES (1, ?, ?, 6)',
    );
    const insertMapping = db.prepare(
      "INSERT INTO mappings (faculty_id, pu_course_id, nus_course_code, pre_approved) VALUES (1, ?, 'CS3244', 0)",
    );
    db.transaction(() => {
      for (let i = 0; i < SEARCH_LIMIT; i++) {
        const { lastInsertRowid } = insertPu.run(`FILL-${i}`, `Filler Course ${i}`);
        insertMapping.run(lastInsertRowid);
      }
    })();

    const { rows, truncated } = searchMappings(db, '', undefined, 'School of Computing', [
      'The University of Hong Kong',
    ]);
    expect(truncated).toBe(true);
    expect(rows[0].university).toBe('The University of Hong Kong');
  });

  it('browses a whole faculty with an empty query', () => {
    const { rows } = searchMappings(db, '', undefined, 'School of Computing');
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.nusCode.startsWith('CS'))).toBe(true);
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

  it('resolves keys minted with the old "X, The" university form', () => {
    const { found, missing } = resolveKeys(db, [
      { u: 'University of Hong Kong, The', p: 'COMP3278', n: 'CS2102' },
    ]);
    expect(missing).toHaveLength(0);
    expect(found).toHaveLength(1);
    expect(found[0].university).toBe('The University of Hong Kong');
  });

  it('lists universities with mapping counts, sorting past a leading "The"', () => {
    expect(listUniversities(db)).toEqual([
      { name: 'Aalto University', mappingCount: 1 },
      { name: 'Copenhagen Business School', mappingCount: 1 },
      { name: 'ETH Zurich', mappingCount: 2 },
      { name: 'The University of Hong Kong', mappingCount: 1 },
    ]);
  });

  it('lists only universities with mappings in the given faculty', () => {
    expect(listUniversities(db, 'NUS Business School')).toEqual([
      { name: 'Copenhagen Business School', mappingCount: 1 },
    ]);
    expect(listUniversities(db, 'School of Computing').map((u) => u.name)).toEqual([
      'Aalto University',
      'ETH Zurich',
      'The University of Hong Kong',
    ]);
  });

  it('reports meta counts', () => {
    const meta = getMeta(db);
    expect(meta.mappingCount).toBe(5);
    expect(meta.universityCount).toBe(4);
    expect(meta.nusCourseCount).toBe(3);
    expect(meta.faculties).toEqual(['NUS Business School', 'School of Computing']);
  });
});
