import type { BasketKey } from './types';

/**
 * Share links carry the basket in the URL itself (no login, no server state):
 * keys are grouped by university into [university, [puCode, nusCode][]][],
 * JSON-encoded, then base64url-encoded.
 */
type SharePayload = [string, [string, string][]][];

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeShare(keys: BasketKey[]): string {
  const byUni = new Map<string, [string, string][]>();
  for (const key of keys) {
    const courses = byUni.get(key.u);
    if (courses) courses.push([key.p, key.n]);
    else byUni.set(key.u, [[key.p, key.n]]);
  }
  const payload: SharePayload = [...byUni.entries()];
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShare(encoded: string): BasketKey[] | null {
  try {
    const payload: unknown = JSON.parse(fromBase64Url(encoded));
    if (!Array.isArray(payload)) return null;
    const keys: BasketKey[] = [];
    for (const entry of payload) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !Array.isArray(entry[1])) {
        return null;
      }
      const [university, courses] = entry as [string, unknown[]];
      for (const course of courses) {
        if (
          !Array.isArray(course) ||
          typeof course[0] !== 'string' ||
          typeof course[1] !== 'string'
        ) {
          return null;
        }
        keys.push({ u: university, p: course[0], n: course[1] });
      }
    }
    return keys;
  } catch {
    return null;
  }
}

export function shareUrl(keys: BasketKey[]): string {
  return `${window.location.origin}/share?d=${encodeShare(keys)}`;
}
