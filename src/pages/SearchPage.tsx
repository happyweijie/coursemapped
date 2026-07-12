import { LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BasketButton from '../components/BasketButton';
import UniversityGroup from '../components/UniversityGroup';
import { fetchMeta, fetchUniversities, searchMappings } from '../lib/api';
import { useFavourites } from '../lib/favourites';
import { groupByUniversity } from '../lib/group';
import type { MetaResponse, SearchResponse, UniversitySummary } from '../lib/types';

const DEBOUNCE_MS = 250;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [university, setUniversity] = useState(searchParams.get('university') ?? '');
  const [faculty, setFaculty] = useState(searchParams.get('faculty') ?? '');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [universities, setUniversities] = useState<UniversitySummary[]>([]);
  const favourites = useFavourites();
  const favouriteSet = useMemo(() => new Set(favourites), [favourites]);
  // Favourited universities float to the top of the filter dropdown too.
  const sortedUniversities = useMemo(
    () =>
      [...universities].sort(
        (a, b) =>
          Number(favouriteSet.has(b.name)) - Number(favouriteSet.has(a.name)) ||
          a.name.localeCompare(b.name),
      ),
    [universities, favouriteSet],
  );

  useEffect(() => {
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  // The university dropdown is scoped to the selected faculty.
  useEffect(() => {
    fetchUniversities(faculty || undefined)
      .then((list) => {
        setUniversities(list);
        setUniversity((current) =>
          current && !list.some((u) => u.name === current) ? '' : current,
        );
      })
      .catch(() => {});
  }, [faculty]);

  const hasQueryOrFilter = query.trim() !== '' || university !== '' || faculty !== '';
  // With nothing typed or selected, the page falls back to browsing favourites.
  const browsingFavourites = !hasQueryOrFilter && favourites.length > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Keep the URL shareable/bookmarkable (favourites are device state, not URL state).
      const params: Record<string, string> = {};
      if (query.trim()) params.q = query;
      if (university) params.university = university;
      if (faculty) params.faculty = faculty;
      setSearchParams(params, { replace: true });

      if (!hasQueryOrFilter && favourites.length === 0) {
        setResult(null);
        setError(null);
        return;
      }
      setLoading(true);
      // Favourites are sent so the server keeps their rows when truncating.
      searchMappings(query, university || undefined, faculty || undefined, favourites)
        .then((r) => {
          setResult(r);
          setError(null);
        })
        .catch(() => setError('Search failed — is the API server running?'))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, university, faculty, favourites, hasQueryOrFilter, setSearchParams]);

  const groups = result ? groupByUniversity(result.rows, favouriteSet) : [];

  return (
    <div>
      <div className="search-hero">
        <h1>Find exchange mappings for your NUS courses</h1>
        {meta && (
          <p className="search-stats">
            {meta.mappingCount.toLocaleString()} mappings · {meta.universityCount} partner
            universities · {meta.nusCourseCount} NUS courses
          </p>
        )}
        <div className="search-controls">
          <input
            type="search"
            className="search-input"
            placeholder="Search by course code or title"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <select
            className="uni-filter"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            aria-label="Filter by partner university"
          >
            <option value="">All partner universities</option>
            {sortedUniversities.map((u) => (
              <option key={u.name} value={u.name}>
                {favouriteSet.has(u.name) ? '★ ' : ''}
                {u.name} ({u.mappingCount})
              </option>
            ))}
          </select>

          <select
            className="uni-filter"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            aria-label="Filter by faculty"
          >
            <option value="">All faculties</option>
            {meta?.faculties.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="notice notice-error">{error}</p>}
      {loading && (
        <p className="notice notice-loading">
          <LoaderCircle size={16} className="spin" aria-hidden="true" />
          Searching…
        </p>
      )}
      {result && !loading && (
        <>
          {result.truncated && (
            <p className="notice notice-warning">
              Showing only the <strong>first {result.rows.length.toLocaleString()} results</strong>{' '}
              — refine your search to see everything.
            </p>
          )}
          {groups.length === 0 ? (
            <p className="notice">
              {browsingFavourites
                ? 'No mappings found for your favourite universities.'
                : 'No mappings found. Try a broader search term.'}
            </p>
          ) : browsingFavourites ? (
            <p className="result-summary">Your favourite universities</p>
          ) : (
            <p className="result-summary">
              {result.rows.length.toLocaleString()} {result.rows.length === 1 ? 'mapping' : 'mappings'}
              {' across '}
              {groups.length} {groups.length === 1 ? 'university' : 'universities'}
            </p>
          )}
          {groups.map((g) => (
            <UniversityGroup
              key={g.university}
              university={g.university}
              rows={g.rows}
              renderRowAction={(row) => <BasketButton row={row} />}
            />
          ))}
        </>
      )}
      {!result && !loading && !error && (
        <p className="notice notice-hint">
          Start typing an <strong>NUS course code</strong>, <strong>course title</strong>, or <strong>partner university name</strong> to see mappings.
        </p>
      )}
    </div>
  );
}
