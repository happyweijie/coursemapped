import { createLocalStore } from './localStore';
import { formatUniversityName } from './universityName';

/**
 * Favourited partner universities (by name), kept in localStorage. Favourited
 * universities are shown first in search results and the basket.
 */
const store = createLocalStore<string>(
  'coursemapped:favourites:v1',
  (v): v is string => typeof v === 'string',
);

// Names favourited before university names were normalised may still use the
// scraped "X, The" form; rewrite so they match the current dataset.
{
  const before = store.get();
  const migrated = [...new Set(before.map(formatUniversityName))];
  if (migrated.length !== before.length || migrated.some((n, i) => n !== before[i])) {
    store.set(migrated);
  }
}

export function useFavourites(): string[] {
  return store.use();
}

export function toggleFavourite(university: string) {
  const current = store.get();
  store.set(
    current.includes(university)
      ? current.filter((name) => name !== university)
      : [...current, university],
  );
}
