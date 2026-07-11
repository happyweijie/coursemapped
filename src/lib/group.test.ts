import { describe, expect, it } from 'vitest';
import { groupByUniversity } from './group';
import type { MappingRow } from './types';

function row(university: string, puCode: string, nusCode: string): MappingRow {
  return {
    university,
    puCode,
    puTitle: `${puCode} title`,
    puUnits: 5,
    nusCode,
    nusTitle: `${nusCode} title`,
    nusUnits: 4,
    preApproved: false,
  };
}

const rows = [
  row('Lund University', 'L1', 'CS2102'),
  row('Aalto University', 'A2', 'CS3244'),
  row('ETH Zurich', 'E1', 'CS3244'),
  row('Aalto University', 'A1', 'CS2102'),
];

describe('groupByUniversity', () => {
  it('sorts universities alphabetically when there are no favourites', () => {
    expect(groupByUniversity(rows).map((g) => g.university)).toEqual([
      'Aalto University',
      'ETH Zurich',
      'Lund University',
    ]);
  });

  it('puts favourited universities first, alphabetical within partitions', () => {
    const groups = groupByUniversity(rows, new Set(['Lund University', 'ETH Zurich']));
    expect(groups.map((g) => g.university)).toEqual([
      'ETH Zurich',
      'Lund University',
      'Aalto University',
    ]);
    expect(groups.map((g) => g.favourite)).toEqual([true, true, false]);
  });

  it('ignores favourites that are not in the results', () => {
    const groups = groupByUniversity(rows, new Set(['Somewhere Else']));
    expect(groups.map((g) => g.university)).toEqual([
      'Aalto University',
      'ETH Zurich',
      'Lund University',
    ]);
    expect(groups.every((g) => !g.favourite)).toBe(true);
  });

  it('sorts rows within a group by NUS code then PU code', () => {
    const groups = groupByUniversity(rows);
    expect(groups[0].rows.map((r) => `${r.nusCode}/${r.puCode}`)).toEqual([
      'CS2102/A1',
      'CS3244/A2',
    ]);
  });
});
