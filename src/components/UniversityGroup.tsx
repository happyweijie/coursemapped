import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MappingRow } from '../lib/types';
import FavouriteButton from './FavouriteButton';

/** Rows shown per group before the user opts into the full list. */
const ROW_PREVIEW = 5;

interface Props {
  university: string;
  rows: MappingRow[];
  /** Rendered on the right of the university header (share/delete buttons). */
  headerActions?: ReactNode;
  /** Rendered at the end of each mapping row (add/remove buttons). */
  renderRowAction?: (row: MappingRow) => ReactNode;
}

function formatUnits(units: number | null): string {
  return units === null ? '—' : `${units} ${units === 1 ? 'unit' : 'units'}`;
}

export default function UniversityGroup({
  university,
  rows,
  headerActions,
  renderRowAction,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = rows.length - ROW_PREVIEW;
  const visibleRows = showAll || hiddenCount <= 0 ? rows : rows.slice(0, ROW_PREVIEW);
  return (
    <section className={collapsed ? 'uni-group uni-group-collapsed' : 'uni-group'}>
      <header className="uni-group-header">
        <FavouriteButton university={university} />
        <h2>
          <button
            type="button"
            className="uni-group-toggle"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown size={18} className="uni-group-chevron" aria-hidden />
            {university}
          </button>
        </h2>
        <span className="uni-group-count">
          {rows.length} {rows.length === 1 ? 'course' : 'courses'}
        </span>
        {headerActions && <div className="uni-group-actions">{headerActions}</div>}
      </header>
      {!collapsed && (
        <>
        <ul className="mapping-list">
          {visibleRows.map((row) => (
            <li key={`${row.puCode} ${row.nusCode}`} className="mapping-row">
              <div className="mapping-course">
                <span className="course-code course-code-nus">
                  <a href={`https://nusmods.com/courses/${row.nusCode}`} target="_blank" rel="noopener noreferrer">
                    {row.nusCode}
                  </a>
                </span>
                <span className="course-title">{row.nusTitle}</span>
                <span className="course-units">{formatUnits(row.nusUnits)}</span>
              </div>
              <div className="mapping-arrow" aria-hidden>
                ⇄
              </div>
              <div className="mapping-course">
                <span className="course-code">{row.puCode}</span>
                <span className="course-title">{row.puTitle}</span>
                <span className="course-units">{formatUnits(row.puUnits)}</span>
              </div>
              <div className="mapping-meta">
                {/* Always rendered so the meta column is the same width in
                    every group; hidden rather than omitted when not approved. */}
                <span
                  className={
                    row.preApproved ? 'badge badge-approved' : 'badge badge-approved badge-hidden'
                  }
                >
                  Pre-approved
                </span>
                {renderRowAction?.(row)}
              </div>
            </li>
          ))}
        </ul>
        {!showAll && hiddenCount > 0 && (
          <button type="button" className="show-more" onClick={() => setShowAll(true)}>
            <ChevronDown size={14} aria-hidden />
            Show all {rows.length} courses
          </button>
        )}
        </>
      )}
    </section>
  );
}
