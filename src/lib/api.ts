import type {
  BasketKey,
  MetaResponse,
  ResolveResponse,
  SearchResponse,
  UniversitySummary,
} from './types';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchMeta = (): Promise<MetaResponse> => getJson('/api/meta');

export function fetchUniversities(faculty?: string): Promise<UniversitySummary[]> {
  const params = new URLSearchParams();
  if (faculty) params.set('faculty', faculty);
  return getJson(`/api/universities?${params}`);
}

export function searchMappings(
  q: string,
  university?: string,
  faculty?: string,
  favourites?: string[],
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q });
  if (university) params.set('university', university);
  if (faculty) params.set('faculty', faculty);
  // Repeated params rather than comma-joined, since names may contain commas.
  favourites?.forEach((name) => params.append('favourites', name));
  return getJson(`/api/search?${params}`);
}

export async function resolveKeys(keys: BasketKey[]): Promise<ResolveResponse> {
  const res = await fetch('/api/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<ResolveResponse>;
}
