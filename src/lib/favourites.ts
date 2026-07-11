import { createLocalStore } from './localStore';

/**
 * Favourited partner universities (by name), kept in localStorage. Favourited
 * universities are shown first in search results and the basket.
 */
const store = createLocalStore<string>(
  'coursemapped:favourites:v1',
  (v): v is string => typeof v === 'string',
);

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
