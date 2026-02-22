import { useCityStats } from '../../hooks/useCityStats'

export default function CityStatsBar() {
  const { data: stats } = useCityStats()
  if (!stats) return null

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none">
      <StatChip label="Equity Score" value={stats.equity_score.toFixed(2)} color="text-yellow-400" />
      <StatChip label="Transit Cov." value={`${Math.round(stats.transit_coverage * 100)}%`} color="text-emerald-400" />
      <StatChip
        label="High-Risk Tracts"
        value={`${stats.high_risk_tracts}/${stats.total_tracts}`}
        color="text-red-400"
      />
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
