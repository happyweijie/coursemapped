import { describe, expect, it } from 'vitest';
import { batchEndIndex, groupByUniversity } from './group';
import type { MappingRow } from './types';
import type { UniversityGroup } from './group';

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

  it('sorts a leading "The" by the rest of the name', () => {
    const groups = groupByUniversity([
      ...rows,
      row('The Australian National University', 'COMP2100', 'CS2103T'),
    ]);
    expect(groups.map((g) => g.university)).toEqual([
      'Aalto University',
      'The Australian National University',
      'ETH Zurich',
      'Lund University',
    ]);
  });

  it('sorts rows within a group by NUS code then PU code', () => {
    const groups = groupByUniversity(rows);
    expect(groups[0].rows.map((r) => `${r.nusCode}/${r.puCode}`)).toEqual([
      'CS2102/A1',
      'CS3244/A2',
    ]);
  });
});

describe('batchEndIndex', () => {
  // Only rows.length matters to batching.
  const groupsOf = (...sizes: number[]): UniversityGroup[] =>
    sizes.map((size, i) => ({
      university: `U${i}`,
      favourite: false,
      rows: Array.from({ length: size }, (_, j) => row(`U${i}`, `P${j}`, `N${j}`)),
    }));

  it('keeps the group that crosses the threshold whole', () => {
    expect(batchEndIndex(groupsOf(60, 60, 60), 1)).toBe(2);
  });

  it('ends the batch after a single oversized group', () => {
    expect(batchEndIndex(groupsOf(250, 10), 1)).toBe(1);
  });

  it('continues later batches from the previous boundary', () => {
    const groups = groupsOf(60, 60, 60, 60);
    expect(batchEndIndex(groups, 2)).toBe(4);
    expect(batchEndIndex(groups, 3)).toBe(4);
  });

  it('stops at a batch boundary that lands exactly on the size', () => {
    expect(batchEndIndex(groupsOf(100, 5), 1)).toBe(1);
  });

  it('returns 0 for no groups', () => {
    expect(batchEndIndex([], 1)).toBe(0);
  });
});
