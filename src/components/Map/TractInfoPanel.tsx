/**
 * TractInfoPanel.tsx
 *
 * Floating panel rendered in the bottom-right of the map canvas (government mode).
 * Shows a preview of the currently hovered census tract's key metrics.
 * Disappears when no tract is hovered.
 *
 * - pointer-events: none (never blocks map interaction)
 * - Driven by MapView hover state (set via useMapInteraction's onHovered callback)
 */

import type { TractProperties } from '../../types/map'

interface TractInfoPanelProps {
  tract: TractProperties | null
}

export default function TractInfoPanel({ tract }: TractInfoPanelProps) {
  if (!tract) return null

  const pct = (v: number) => `${Math.round(v * 100)}%`
  const score = (v: number) => v.toFixed(2)

  return (
    <div
      style={{
        position:      'absolute',
        bottom:        28,
        right:         16,
        zIndex:        9999,
        width:         240,
        pointerEvents: 'none',
      }}
      className="rounded-xl border border-[#1e3358] bg-[#0a1628]/96 backdrop-blur-sm shadow-2xl p-3"
    >
      {/* Header */}
      <div className="mb-2">
        <p className="font-mono text-[9px] text-[#7a93b8] uppercase tracking-wider">
          Census Tract
        </p>
        <p className="font-sans font-semibold text-sm text-white truncate mt-0.5">
          {tract.tract_name || tract.tract_id}
        </p>
        <p className="font-mono text-[10px] text-[#7a93b8]/70">
          {tract.tract_id}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-[#1e3358] mb-2" />

      {/* Key metrics */}
      <div className="space-y-1">
        <MetricRow
          label="Food Risk"
          value={score(tract.food_risk_score)}
          accent={tract.food_risk_score > 0.65 ? 'red' : tract.food_risk_score > 0.4 ? 'amber' : 'green'}
        />
        <MetricRow
          label="Equity Score"
          value={score(tract.equity_score)}
          accent={tract.equity_score < 0.35 ? 'red' : tract.equity_score < 0.6 ? 'amber' : 'green'}
        />
        <MetricRow
          label="Transit Coverage"
          value={pct(tract.transit_coverage)}
        />
        <MetricRow
          label="Food Insecurity"
          value={pct(tract.food_insecurity_rate)}
        />
        <MetricRow
          label="SNAP Rate"
          value={pct(tract.snap_rate)}
        />
        {tract.mhhinc > 0 && (
          <MetricRow
            label="Median Income"
            value={`$${tract.mhhinc.toLocaleString()}`}
          />
        )}
        <MetricRow
          label="Population"
          value={tract.population.toLocaleString()}
        />
      </div>

      {/* LILA badge */}
      {tract.lila_flag === 1 && (
        <div className="mt-2 pt-2 border-t border-[#1e3358]">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-700/40">
            LILA Food Desert
          </span>
        </div>
      )}

      {/* Hover hint */}
      <p className="font-mono text-[9px] text-[#7a93b8]/50 mt-2">
        Click to select &amp; run simulation
      </p>
    </div>
  )
}

// ─── Metric row ───────────────────────────────────────────────────────────────

type AccentColor = 'red' | 'amber' | 'green' | undefined

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: AccentColor
}) {
  const valueClass =
    accent === 'red'   ? 'text-red-400'   :
    accent === 'amber' ? 'text-amber-400' :
    accent === 'green' ? 'text-emerald-400' :
    'text-white'

  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-[#7a93b8]">{label}</span>
      <span className={`font-mono text-[10px] font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}
