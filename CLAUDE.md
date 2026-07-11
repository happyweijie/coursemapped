# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

coursemapped: a website for NUS students to search SEP course
mappings by course (rather than the faculty/university-only search on EduRec),
collect courses into a basket grouped by partner university, and share baskets
via URL. MVP covers School of Computing mappings for AY2026/27.

## Commands

```bash
npm run seed          # REQUIRED before first run: builds server/data/coursemapped.db
                      # from data_scrapping/out/soc_course_mappings.csv + NUSMods API
                      # (needs network; pass another faculty: npm run seed -- fos)
npm run dev           # API (tsx watch, :3001) + Vite dev server (:5173) together
npm run build         # tsc -b (all three tsconfigs) + vite build
npm start             # Express serves API + built dist/ on :3001
npm test              # vitest run
npx vitest run server/queries.test.ts        # single test file
npx vitest run -t "filters by exact"         # single test by name
npm run typecheck     # tsc -b
```

The SQLite database is gitignored; if API responses are empty or the server
fails on boot, re-run `npm run seed`.

## Architecture

Two TypeScript projects in one repo, sharing types:

- **`server/`** — Express 5 + better-sqlite3. `db.ts` owns the normalised
  schema (`faculties`, `universities`, `nus_courses`, `pu_courses`,
  `mappings`, plus a `meta` key/value table). `queries.ts` has all SQL and
  returns API-shaped objects; `index.ts` is thin routing. In production the
  same server statically serves `dist/` with an SPA fallback. In dev, Vite
  proxies `/api` to :3001 (see `vite.config.ts`).
- **`src/`** — React 19 SPA (react-router). Pages: `SearchPage` (debounced
  tokenised search, query synced to URL), `BasketPage`, `SharePage`.
  `UniversityGroup` renders the grouped mapping lists on all three pages and
  is parameterised by `headerActions` / `renderRowAction`.
- **`src/lib/types.ts`** is the single source of truth for API request/response
  shapes and is imported by both server and client. Change API contracts there
  first.

Type checking is split across `tsconfig.app.json` (src), `tsconfig.server.json`
(server + shared types), and `tsconfig.node.json` (vite config); `tsc -b` at the
root checks all of them.

### Key design decisions

- **Stable natural keys, not row ids.** Baskets and share links identify a
  mapping as `BasketKey { u: university, p: PU course code, n: NUS course code }`
  so they survive database re-seeds (row ids do not). Keys are hydrated into
  full rows via `POST /api/resolve`, which also reports keys that no longer
  exist in the dataset.
- **No accounts.** The basket lives in localStorage
  (`src/lib/basket.ts`, module-level store + `useSyncExternalStore`, synced
  across tabs). Sharing encodes the basket into the URL itself:
  base64url-encoded JSON grouped by university (`src/lib/share.ts`), landing on
  `/share?d=…`.
- **Seeding is idempotent per faculty**: `server/seed.ts` deletes a faculty's
  mappings and reinserts, upserting shared entities. It replaces the scraped
  NUS course titles (truncated at 30 chars by the portal export) with fresh
  titles from `https://api.nusmods.com/v2/<acadYear>/modules/<code>.json`,
  falling back to the scraped title on 404.
- **Search** (`searchMappings`) is tokenised AND-of-ORs: every whitespace
  token must LIKE-match one of NUS code/title, PU code/title, or university
  name; results are capped at `SEARCH_LIMIT` with a `truncated` flag.

### Data pipeline

Portal MHTML exports (gitignored) → `data_scrapping/scrap_course_mappings.py`
(BeautifulSoup) → `data_scrapping/out/<key>_course_mappings.csv` (committed) →
`npm run seed` → SQLite. Rows missing university/PU code/NUS code are dropped;
duplicate (university, PU course, NUS course) rows are merged preferring
pre-approved.

## Conventions

- Server tests instantiate the real schema in memory via `openDb(':memory:')`
  and seed fixtures with plain SQL — no mocking of the database.
- Styling is plain CSS in `src/styles.css` (no framework), NUSMods-inspired:
  orange accent `#ff5138`, CSS variables switched by `data-theme="dark"` on
  `<html>` (set by `src/lib/theme.ts`; defaults to system preference).
- Frontend components never call `fetch` directly — go through `src/lib/api.ts`.