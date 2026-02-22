import { useCityStats } from '../../hooks/useCityStats'
import { useMapStore } from '../../store/useMapStore'

/**
 * Top-left floating stat chips on the government map.
 *
 * When a census tract is hovered or selected, shows that tract's scores
 * (area-level view). Falls back to city-wide aggregates when idle.
 */
export default function CityStatsBar() {
  const { data: stats } = useCityStats()
  const { hoveredTract, selectedTract } = useMapStore()

  // Active tract: prefer hovered (live preview) over selected (locked)
  const tract = hoveredTract ?? selectedTract

  if (tract) {
    const riskColor =
      tract.food_risk_score > 0.65 ? 'text-red-400' :
      tract.food_risk_score > 0.4  ? 'text-amber-400' :
      'text-emerald-400'

    const equityColor =
      tract.equity_score < 0.35 ? 'text-red-400' :
      tract.equity_score < 0.6  ? 'text-amber-400' :
      'text-emerald-400'

    return (
      <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none">
        <TractLabel name={tract.tract_name || tract.tract_id} />
        <StatChip
          label="Food Risk"
          value={tract.food_risk_score.toFixed(2)}
          color={riskColor}
        />
        <StatChip
          label="Equity Score"
          value={tract.equity_score.toFixed(2)}
          color={equityColor}
        />
        <StatChip
          label="Transit Cov."
          value={`${Math.round(tract.transit_coverage * 100)}%`}
          color="text-blue-400"
        />
        {tract.lila_flag === 1 && (
          <StatChip label="Zone" value="LILA" color="text-red-400" />
        )}
      </div>
    )
  }

  // Fallback: city-wide stats
  if (!stats) return null

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none">
      <StatChip label="City Equity" value={stats.equity_score.toFixed(2)} color="text-yellow-400" />
      <StatChip label="Transit Cov." value={`${Math.round(stats.transit_coverage * 100)}%`} color="text-emerald-400" />
      <StatChip
        label="High-Risk Tracts"
        value={`${stats.high_risk_tracts}/${stats.total_tracts}`}
        color="text-red-400"
      />
    </div>
  )
}

function TractLabel({ name }: { name: string }) {
  return (
    <div className="bg-[#0a1628]/90 border border-[#f5a623]/40 rounded-lg px-3 py-2 backdrop-blur-sm">
      <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider">Tract</p>
      <p className="font-display font-bold text-sm text-[#f5a623] truncate max-w-[120px]">{name}</p>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0a1628]/90 border border-[#1e3358] rounded-lg px-3 py-2 backdrop-blur-sm">
      <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider">{label}</p>
      <p className={`font-display font-bold text-base ${color}`}>{value}</p>
    </div>
  )
}
