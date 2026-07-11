import type { MappingRow } from './types';

export interface UniversityGroup {
  university: string;
  rows: MappingRow[];
}

/** Groups mapping rows by partner university, sorted by name then NUS code. */
export function groupByUniversity(rows: MappingRow[]): UniversityGroup[] {
  const byUni = new Map<string, MappingRow[]>();
  for (const row of rows) {
    const group = byUni.get(row.university);
    if (group) group.push(row);
    else byUni.set(row.university, [row]);
  }
  return [...byUni.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([university, groupRows]) => ({
      university,
      rows: groupRows.sort(
        (a, b) => a.nusCode.localeCompare(b.nusCode) || a.puCode.localeCompare(b.puCode),
      ),
    }));
}
