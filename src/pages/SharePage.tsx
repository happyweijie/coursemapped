import { Check, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UniversityGroup from '../components/UniversityGroup';
import { resolveKeys } from '../lib/api';
import { addToBasket, keyId, toBasketKey, useBasket } from '../lib/basket';
import { groupByUniversity } from '../lib/group';
import { decodeShare } from '../lib/share';
import type { ResolveResponse } from '../lib/types';

export default function SharePage() {
  const [searchParams] = useSearchParams();
  const encoded = searchParams.get('d') ?? '';
  const keys = useMemo(() => decodeShare(encoded), [encoded]);
  const [resolved, setResolved] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const basket = useBasket();
  const basketIds = useMemo(() => new Set(basket.map(keyId)), [basket]);

  useEffect(() => {
    if (!keys || keys.length === 0) return;
    resolveKeys(keys)
      .then((r) => {
        setResolved(r);
        setError(null);
      })
      .catch(() => setError('Could not load the shared basket — is the API server running?'));
  }, [keys]);

  if (!keys || keys.length === 0) {
    return (
      <div className="empty-state">
        <h1>Invalid share link</h1>
        <p>
          This link looks broken or incomplete. Ask your friend to copy it again, or{' '}
          <Link to="/">start your own search</Link>.
        </p>
      </div>
    );
  }

  if (error) return <p className="notice notice-error">{error}</p>;
  if (!resolved) return <p className="notice">Loading shared basket…</p>;

  const groups = groupByUniversity(resolved.found);
  const newCount = resolved.found.filter((row) => !basketIds.has(keyId(toBasketKey(row)))).length;

  return (
    <div>
      <div className="page-header">
        <h1>Shared basket</h1>
        <p className="page-subtitle">
          {resolved.found.length} {resolved.found.length === 1 ? 'course' : 'courses'} across{' '}
          {groups.length} {groups.length === 1 ? 'university' : 'universities'} — shared with you
        </p>
        <button
          type="button"
          className="btn btn-accent"
          disabled={newCount === 0}
          onClick={() => addToBasket(resolved.found.map(toBasketKey))}
        >
          {newCount === 0 ? (
            <>
              <Check size={14} /> All in your basket
            </>
          ) : (
            <>
              <Plus size={14} /> Add all to my basket ({newCount} new)
            </>
          )}
        </button>
      </div>

      {groups.map((g) => {
        const groupNew = g.rows.filter((row) => !basketIds.has(keyId(toBasketKey(row)))).length;
        return (
          <UniversityGroup
            key={g.university}
            university={g.university}
            rows={g.rows}
            headerActions={
              <button
                type="button"
                className="btn"
                disabled={groupNew === 0}
                onClick={() => addToBasket(g.rows.map(toBasketKey))}
              >
                {groupNew === 0 ? (
                  <>
                    <Check size={14} /> Added
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add {groupNew} to basket
                  </>
                )}
              </button>
            }
            renderRowAction={(row) =>
              basketIds.has(keyId(toBasketKey(row))) ? (
                <span className="badge">In your basket</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => addToBasket([toBasketKey(row)])}
                >
                  <Plus size={14} /> Basket
                </button>
              )
            }
          />
        );
      })}

      {resolved.missing.length > 0 && (
        <p className="notice">
          {resolved.missing.length} shared {resolved.missing.length === 1 ? 'course' : 'courses'}{' '}
          could not be found in the current dataset and {resolved.missing.length === 1 ? 'is' : 'are'}{' '}
          not shown.
        </p>
      )}
    </div>
  );
}
