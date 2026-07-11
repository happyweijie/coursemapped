import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UniversityGroup from '../components/UniversityGroup';
import { resolveKeys } from '../lib/api';
import {
  keyId,
  removeFromBasket,
  removeUniversityFromBasket,
  toBasketKey,
  useBasket,
} from '../lib/basket';
import { groupByUniversity } from '../lib/group';
import type { BasketKey, ResolveResponse } from '../lib/types';

export default function BasketPage() {
  const basket = useBasket();
  const [resolved, setResolved] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Serialise so the effect only re-runs when contents actually change.
  const basketFingerprint = basket.map(keyId).join('\n');
  useEffect(() => {
    if (basket.length === 0) {
      setResolved({ found: [], missing: [] });
      return;
    }
    let cancelled = false;
    resolveKeys(basket)
      .then((r) => {
        if (!cancelled) {
          setResolved(r);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your basket — is the API server running?');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketFingerprint]);

  const handleRemoveUniversity = (university: string, count: number) => {
    if (window.confirm(`Remove ${university} and all ${count} of its courses from your basket?`)) {
      removeUniversityFromBasket(university);
    }
  };

  const handleRemoveMissing = (key: BasketKey) => removeFromBasket(key);

  if (error) return <p className="notice notice-error">{error}</p>;
  if (!resolved) return <p className="notice">Loading your basket…</p>;

  if (basket.length === 0) {
    return (
      <div className="empty-state">
        <h1>Your basket is empty</h1>
        <p>
          <Link to="/">Search for a course</Link> and add mappings you are interested in. Your
          basket is saved in this browser — no login needed.
        </p>
      </div>
    );
  }

  const groups = groupByUniversity(resolved.found);

  return (
    <div>
      <div className="page-header">
        <h1>My basket</h1>
        <p className="page-subtitle">
          {basket.length} {basket.length === 1 ? 'course' : 'courses'} across {groups.length}{' '}
          {groups.length === 1 ? 'university' : 'universities'}
        </p>
      </div>

      {groups.map((g) => (
        <UniversityGroup
          key={g.university}
          university={g.university}
          rows={g.rows}
          headerActions={
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleRemoveUniversity(g.university, g.rows.length)}
            >
              Remove university
            </button>
          }
          renderRowAction={(row) => (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => removeFromBasket(toBasketKey(row))}
            >
              Remove
            </button>
          )}
        />
      ))}

      {resolved.missing.length > 0 && (
        <section className="uni-group">
          <header className="uni-group-header">
            <h2>No longer in the dataset</h2>
          </header>
          <p className="notice">
            These saved courses were not found — the mappings may have been removed or renamed in a
            newer scrape.
          </p>
          <ul className="mapping-list">
            {resolved.missing.map((k) => (
              <li key={keyId(k)} className="mapping-row">
                <div className="mapping-course">
                  <span className="course-code">{k.p}</span>
                  <span className="course-title">{k.u}</span>
                </div>
                <div className="mapping-arrow" aria-hidden>
                  ⇄
                </div>
                <div className="mapping-course">
                  <span className="course-code course-code-nus">{k.n}</span>
                </div>
                <div className="mapping-meta">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleRemoveMissing(k)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
