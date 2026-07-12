import type Database from 'better-sqlite3';
import type {
  BasketKey,
  MappingRow,
  MetaResponse,
  ResolveResponse,
  UniversitySummary,
} from '../src/lib/types.js';
import { formatUniversityName, universitySortKey } from '../src/lib/universityName.js';

const BASE_SELECT = `
  SELECT u.name  AS university,
         p.code  AS puCode,
         p.title AS puTitle,
         p.units AS puUnits,
         n.code  AS nusCode,
         n.title AS nusTitle,
         n.units AS nusUnits,
         m.pre_approved AS preApproved
  FROM mappings m
  JOIN pu_courses p   ON p.id = m.pu_course_id
  JOIN universities u ON u.id = p.university_id
  JOIN nus_courses n  ON n.code = m.nus_course_code
  JOIN faculties f    ON f.id = m.faculty_id
`;

interface RawRow extends Omit<MappingRow, 'preApproved'> {
  preApproved: number;
}

function toMappingRow(row: RawRow): MappingRow {
  return { ...row, preApproved: row.preApproved === 1 };
}

/**
 * Tokenised substring search: every whitespace-separated token in `q` must
 * match at least one of NUS code/title, PU code/title, or university name.
 *
 * With no query and no filters, `favourites` (university names) become the
 * filter, powering the favourites browse view on the empty search page.
 */
export function searchMappings(
  db: Database.Database,
  q: string,
  university?: string,
  faculty?: string,
  favourites: string[] = [],
): { rows: MappingRow[] } {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 && !university && !faculty && favourites.length === 0) {
    return { rows: [] };
  }

  const conditions: string[] = [];
  const params: string[] = [];
  for (const token of tokens) {
    conditions.push(
      '(n.code LIKE ? OR n.title LIKE ? OR p.code LIKE ? OR p.title LIKE ? OR u.name LIKE ?)',
    );
    const like = `%${token}%`;
    params.push(like, like, like, like, like);
  }
  if (university) {
    conditions.push('u.name = ?');
    params.push(university);
  }
  if (faculty) {
    conditions.push('f.name = ?');
    params.push(faculty);
  }

  if (conditions.length === 0) {
    conditions.push(`u.name IN (${favourites.map(() => '?').join(', ')})`);
    params.push(...favourites);
  }

  const sql = `${BASE_SELECT}
    WHERE ${conditions.join(' AND ')}
    ORDER BY u.name, n.code, p.code`;
  const raw = db.prepare(sql).all(...params) as RawRow[];
  return { rows: raw.map(toMappingRow) };
}

export function listUniversities(db: Database.Database, faculty?: string): UniversitySummary[] {
  const rows = db
    .prepare(
      `SELECT u.name AS name, COUNT(m.id) AS mappingCount
       FROM universities u
       JOIN pu_courses p ON p.university_id = u.id
       JOIN mappings m   ON m.pu_course_id = p.id
       JOIN faculties f  ON f.id = m.faculty_id
       ${faculty ? 'WHERE f.name = ?' : ''}
       GROUP BY u.id`,
    )
    .all(...(faculty ? [faculty] : [])) as UniversitySummary[];
  // Sorted in JS rather than SQL so the leading "The" is ignored.
  return rows.sort((a, b) => universitySortKey(a.name).localeCompare(universitySortKey(b.name)));
}

/** Hydrates basket keys (university, PU code, NUS code) into full rows. */
export function resolveKeys(db: Database.Database, keys: BasketKey[]): ResolveResponse {
  const stmt = db.prepare(`${BASE_SELECT} WHERE u.name = ? AND p.code = ? AND n.code = ?`);
  const found: MappingRow[] = [];
  const missing: BasketKey[] = [];
  for (const key of keys) {
    // Keys minted before university names were normalised may still use the
    // scraped "X, The" form.
    const row = stmt.get(formatUniversityName(key.u), key.p, key.n) as RawRow | undefined;
    if (row) found.push(toMappingRow(row));
    else missing.push(key);
  }
  return { found, missing };
}

export function getMeta(db: Database.Database): MetaResponse {
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
  const acadYear = db.prepare("SELECT value FROM meta WHERE key = 'acadYear'").get() as
    | { value: string }
    | undefined;
  return {
    faculties: (db.prepare('SELECT name FROM faculties ORDER BY name').all() as { name: string }[]).map(
      (f) => f.name,
    ),
    acadYear: acadYear?.value ?? '',
    mappingCount: count('mappings'),
    universityCount: count('universities'),
    nusCourseCount: count('nus_courses'),
  };
}
