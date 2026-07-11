import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from './share';
import type { BasketKey } from './types';

describe('share encoding', () => {
  it('round-trips a basket, preserving university grouping order', () => {
    const keys: BasketKey[] = [
      { u: 'ETH Zurich', p: '227-0105-00L', n: 'CS3244' },
      { u: 'Aalto University', p: 'CS-E4820', n: 'CS5340' },
      { u: 'ETH Zurich', p: '252-0834-00L', n: 'CS1010E' },
    ];
    expect(decodeShare(encodeShare(keys))).toEqual([
      { u: 'ETH Zurich', p: '227-0105-00L', n: 'CS3244' },
      { u: 'ETH Zurich', p: '252-0834-00L', n: 'CS1010E' },
      { u: 'Aalto University', p: 'CS-E4820', n: 'CS5340' },
    ]);
  });

  it('round-trips names with unicode and commas', () => {
    const keys: BasketKey[] = [
      { u: 'Universität Zürich, The', p: 'INF—101', n: 'CS2100' },
    ];
    expect(decodeShare(encodeShare(keys))).toEqual(keys);
  });

  it('produces URL-safe output', () => {
    const keys: BasketKey[] = Array.from({ length: 40 }, (_, i) => ({
      u: `University ${i}?&=`,
      p: `PU${i}`,
      n: `CS${1000 + i}`,
    }));
    const encoded = encodeShare(keys);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('rejects malformed payloads instead of throwing', () => {
    expect(decodeShare('not-valid-base64!!!')).toBeNull();
    expect(decodeShare(btoa('"just a string"'))).toBeNull();
    expect(decodeShare(btoa('[["Uni", [["only-one-element"]]]]'))).toBeNull();
    expect(decodeShare(btoa('[[42, []]]'))).toBeNull();
    expect(decodeShare('')).toBeNull();
  });
});
