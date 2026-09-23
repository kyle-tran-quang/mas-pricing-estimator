import { useState } from 'react';
import { Button } from '@carbon/react';
import { ChevronDown, ChevronUp } from '@carbon/icons-react';
import InlineEditableName from './InlineEditableName';

// AppPoints summary sidebar — chart segments colored via VIZ_PALETTE by colorIndex.
export interface VizSegment {
  id: string;
  name: string;
  appPoints: number;
  price: number;
  /** Index into VIZ_PALETTE — assigned sequentially in the order segments are added. */
  colorIndex: number;
}

/**
 * Ordered categorical palette. Each visible chart segment takes the next entry,
 * so the visualization stays multi-colored and distinct as it extends.
 */
export const VIZ_PALETTE: { bg: string; border: string }[] = [
  { bg: '#edf5ff', border: '#0f62fe' }, // blue
  { bg: '#f6f2ff', border: '#8a3ffc' }, // purple
  { bg: '#d9fbfb', border: '#009d9a' }, // teal
  { bg: '#e5f6ff', border: '#1192e8' }, // cyan
  { bg: '#defbe6', border: '#24a148' }, // green
  { bg: '#fff0f7', border: '#ee5396' }, // magenta
  { bg: '#fcf4d6', border: '#b28600' }, // yellow
  { bg: '#fff1f1', border: '#da1e28' }, // red
  { bg: '#f2f4f8', border: '#697077' }, // cool-gray
  { bg: '#e8eaff', border: '#3538cd' }, // indigo
];

interface LegendEntry {
  id: string;
  name: string;
  points: number;
  color: string;
}

interface Props {
  customerName: string;
  estimateName: string;
  onRenameEstimate?: (name: string) => void;
  annualCost: number;
  totalAppPoints: number;
  moduleCount: number;
  segments: VizSegment[];
  legend: LegendEntry[];
  onReview: () => void;
  showReview?: boolean;
}

const MIN_PX = 48;
const MAX_PX = 176;

function formatCost(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

// Full currency (no compaction) for the mobile dock cue, e.g. "$189,550".
const fullCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function SummarySidebar({
  customerName,
  estimateName,
  onRenameEstimate,
  annualCost,
  totalAppPoints,
  moduleCount,
  segments,
  legend,
  onReview,
  showReview = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const maxPoints = Math.max(1, ...segments.map((s) => s.appPoints));

  function segHeight(pts: number) {
    return MIN_PX + ((pts / maxPoints) * (MAX_PX - MIN_PX));
  }

  return (
    <aside className="summary" aria-label="Configuration summary">
      {/* Mobile-only collapsed dock cue: title + combined meta line + chevron.
          Hidden on desktop (the full sidebar shows its own title/stats). */}
      <button
        type="button"
        className="summary__dock"
        aria-expanded={open}
        aria-controls="summary-collapse"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="summary__dock-cue">
          <span className="summary__dock-title">Configuration summary</span>
          <span className="summary__dock-meta">
            {customerName || 'Untitled estimate'} · {fullCurrency.format(annualCost)}/year ·{' '}
            {totalAppPoints} AppPoints
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div className="summary__title-block">
        <span className="summary__eyebrow">Configuration summary</span>
        <InlineEditableName
          className="summary__title-edit"
          value={estimateName}
          placeholder="Untitled estimate"
          onSave={(n) => onRenameEstimate?.(n)}
        />
      </div>

      <div className="summary__stats">
        <div className="summary__stat">
          <div className="summary__stat-value">
            <span className="big">{formatCost(annualCost)}</span>
            <span className="unit">/year</span>
          </div>
          <span className="summary__stat-label">Annual cost</span>
        </div>
        <div className="summary__stat">
          <div className="summary__stat-value">
            <span className="big">{totalAppPoints}</span>
            <span className="unit"> AP</span>
          </div>
          <span className="summary__stat-label">AppPoints total</span>
        </div>
        <div className="summary__stat">
          <div className="summary__stat-value">
            <span className="big">{moduleCount}</span>
          </div>
          <span className="summary__stat-label">Modules selected</span>
        </div>
      </div>

      <Button
        className="summary__toggle"
        kind="ghost"
        size="sm"
        renderIcon={open ? ChevronUp : ChevronDown}
        aria-expanded={open}
        aria-controls="summary-collapse"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide chart' : 'Show AppPoints chart'}
      </Button>

      <div
        id="summary-collapse"
        className={`summary__collapse${open ? ' summary__collapse--open' : ''}`}
      >
      <div className="viz-wrapper">
        <div className="viz">
          <div className="viz__axis">
            <span>AppPoints</span>
          </div>
          <div className="viz__bars">
            {segments.length === 0 ? (
              <div className="viz__empty">
                <div className="viz__empty-bar" aria-hidden="true" />
                <p className="viz__empty-text">Select applications to start your estimate</p>
              </div>
            ) : (
              segments.map((seg) => {
                const { bg, border } = VIZ_PALETTE[seg.colorIndex % VIZ_PALETTE.length];
                return (
                  <div
                    key={seg.id}
                    className="viz__segment"
                    style={
                      {
                        '--seg-bg': bg,
                        '--seg-border': border,
                        height: `${segHeight(seg.appPoints)}px`,
                      } as React.CSSProperties
                    }
                  >
                    <span className="viz__segment-name">{seg.name}</span>
                    <span className="viz__segment-meta">
                      {seg.appPoints} AP · {formatCost(seg.price)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {legend.some((l) => l.points > 0) && (
        <div>
          <div className="legend-label" style={{ marginBottom: 8 }}>User mix</div>
          <div className="legend-grid">
            {legend.map((l) => (
              <div key={l.id} className="legend-item">
                <span className="legend-dot" style={{ background: l.color }} />
                <span className="legend-name">{l.name}</span>
                <span className="legend-value">{l.points} AP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showReview && (
        <div className="summary__review">
          <Button kind="primary" style={{ width: '100%', maxWidth: 'none' }} onClick={onReview}>
            Review estimate
          </Button>
        </div>
      )}
      </div>
    </aside>
  );
}
