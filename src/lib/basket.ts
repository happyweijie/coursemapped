import { createLocalStore } from './localStore';
import type { BasketKey, MappingRow } from './types';
import { formatUniversityName } from './universityName';

/**
 * The basket is a list of stable natural keys (university, PU code, NUS code)
 * kept in localStorage — no login needed, and keys survive database re-seeds.
 */
function isBasketKey(k: unknown): k is BasketKey {
  return (
    typeof k === 'object' &&
    k !== null &&
    typeof (k as BasketKey).u === 'string' &&
    typeof (k as BasketKey).p === 'string' &&
    typeof (k as BasketKey).n === 'string'
  );
}

const store = createLocalStore<BasketKey>('coursemapped:basket:v1', isBasketKey);

export const keyId = (k: BasketKey): string => `${k.u} ${k.p} ${k.n}`;

/**
 * Keys persisted (or decoded from share URLs) before university names were
 * normalised may still use the scraped "X, The" form; rewrite so they match
 * rows resolved from the current dataset.
 */
const normalizeKey = (k: BasketKey): BasketKey => ({ ...k, u: formatUniversityName(k.u) });

function dedupe(keys: BasketKey[]): BasketKey[] {
  const seen = new Set<string>();
  return keys.filter((k) => !seen.has(keyId(k)) && seen.add(keyId(k)));
}

{
  const before = store.get();
  const migrated = dedupe(before.map(normalizeKey));
  if (migrated.length !== before.length || migrated.some((k, i) => keyId(k) !== keyId(before[i]))) {
    store.set(migrated);
  }
}

export const toBasketKey = (row: MappingRow): BasketKey => ({
  u: row.university,
  p: row.puCode,
  n: row.nusCode,
});

/** Adds keys not already present; returns how many were new. */
export function addToBasket(keys: BasketKey[]): number {
  const current = store.get();
  const existing = new Set(current.map(keyId));
  const fresh = dedupe(keys.map(normalizeKey)).filter((k) => !existing.has(keyId(k)));
  if (fresh.length > 0) store.set([...current, ...fresh]);
  return fresh.length;
}

export function removeFromBasket(key: BasketKey) {
  store.set(store.get().filter((k) => keyId(k) !== keyId(key)));
}

/** Removes every course saved under a partner university. */
export function removeUniversityFromBasket(university: string) {
  store.set(store.get().filter((k) => k.u !== university));
}

export function useBasket(): BasketKey[] {
  return store.use();
}
