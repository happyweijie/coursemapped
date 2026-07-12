/** Shared API types between the Express server and the React app. */

/** One course mapping row, fully hydrated for display. */
export interface MappingRow {
  university: string;
  puCode: string;
  puTitle: string;
  puUnits: number | null;
  nusCode: string;
  nusTitle: string;
  nusUnits: number | null;
  preApproved: boolean;
}

export interface SearchResponse {
  rows: MappingRow[];
}

export interface UniversitySummary {
  name: string;
  mappingCount: number;
}

export interface MetaResponse {
  faculties: string[];
  acadYear: string;
  mappingCount: number;
  universityCount: number;
  nusCourseCount: number;
}

/**
 * Stable natural key for a mapping, used in localStorage baskets and share
 * URLs so they survive database re-seeds (row ids do not).
 */
export interface BasketKey {
  /** Partner university name. */
  u: string;
  /** Partner university course code. */
  p: string;
  /** NUS course code. */
  n: string;
}

export interface ResolveResponse {
  found: MappingRow[];
  missing: BasketKey[];
}
