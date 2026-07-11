import type { MappingRow } from './types';
import { universitySortKey } from './universityName';

export interface UniversityGroup {
  university: string;
  rows: MappingRow[];
  favourite: boolean;
}

/**
 * Groups mapping rows by partner university. Favourited universities come
 * first; within each partition, universities sort by name (ignoring a leading
 * "The") and rows by NUS code then PU code.
 */
export function groupByUniversity(
  rows: MappingRow[],
  favourites?: Set<string>,
): UniversityGroup[] {
  const byUni = new Map<string, MappingRow[]>();
  for (const row of rows) {
    const group = byUni.get(row.university);
    if (group) group.push(row);
    else byUni.set(row.university, [row]);
  }
  return [...byUni.entries()]
    .map(([university, groupRows]) => ({
      university,
      favourite: favourites?.has(university) ?? false,
      rows: groupRows.sort(
        (a, b) => a.nusCode.localeCompare(b.nusCode) || a.puCode.localeCompare(b.puCode),
      ),
    }))
    .sort(
      (a, b) =>
        Number(b.favourite) - Number(a.favourite) ||
        universitySortKey(a.university).localeCompare(universitySortKey(b.university)),
    );
}
