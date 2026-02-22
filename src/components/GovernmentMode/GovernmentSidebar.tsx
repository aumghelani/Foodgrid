import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, Plus, Clock, Truck, AlertTriangle } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'
import { BOSTON_TRACTS } from '../../data/censusTracts'
import { useCityStats, useRunSimulation, useTractDetail, useCountyScores } from '../../api/hooks'
import type { InterventionType } from '../../types'
import type { EquityComponents } from '../../types/map'

type Tab = 'overview' | 'equity' | 'simulate' | 'county'

export default function GovernmentSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <aside className="w-[340px] flex-shrink-0 h-full flex flex-col bg-[#0e1a30] border-r border-[#1e3358]">
      {/* Tab Bar */}
      <div className="flex border-b border-[#1e3358] flex-shrink-0">
        {(['overview', 'equity', 'simulate', 'county'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors duration-150 relative ${
              activeTab === tab ? 'text-[#f5a623]' : 'text-[#7a93b8] hover:text-white'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f5a623]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <TabPanel key="overview"><OverviewTab /></TabPanel>
          )}
          {activeTab === 'equity' && (
            <TabPanel key="equity"><EquityTab /></TabPanel>
          )}
          {activeTab === 'simulate' && (
            <TabPanel key="simulate"><SimulateTab /></TabPanel>
          )}
          {activeTab === 'county' && (
            <TabPanel key="county"><CountyTab /></TabPanel>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

function TabPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18 }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats } = useCityStats()
  const { hoveredTract, selectedTract } = useMapStore()

  // Show the hovered tract first; fall back to selected; fall back to city-wide prompt.
  const activeTract = hoveredTract ?? selectedTract

  const metrics = stats
    ? [
        {
          label: 'City Equity Score',
          value: stats.equity_score,
          display: stats.equity_score.toFixed(2),
          colorClass: 'text-yellow-400',
          barClass: 'bg-yellow-400',
        },
        {
          label: 'Transit Coverage',
          value: stats.transit_coverage,
          display: `${Math.round(stats.transit_coverage * 100)}%`,
          colorClass: 'text-emerald-400',
          barClass: 'bg-emerald-400',
        },
        {
          label: 'High-Risk Tracts',
          value: stats.high_risk_tracts / stats.total_tracts,
          display: `${stats.high_risk_tracts} of ${stats.total_tracts}`,
          colorClass: 'text-red-400',
          barClass: 'bg-red-400',
        },
      ]
    : []

  const sortedTracts = [...BOSTON_TRACTS.features]
    .sort((a, b) => b.properties.food_risk_score - a.properties.food_risk_score)
    .slice(0, 5)

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* ── Live tract info — updates on hover; locked on click ──────────── */}
      <AnimatePresence mode="wait">
        {activeTract ? (
          <motion.div
            key={activeTract.tract_id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] text-[#7a93b8] uppercase tracking-wider">
                  {hoveredTract ? 'Hovering Tract' : 'Selected Tract'}
                </p>
                <p className="font-sans font-semibold text-sm text-white truncate mt-0.5">
                  {activeTract.tract_name || activeTract.tract_id}
                </p>
                <p className="font-mono text-[9px] text-[#7a93b8]/60">{activeTract.tract_id}</p>
              </div>
              {activeTract.lila_flag === 1 && (
                <span className="flex-shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-700/40 ml-2">
                  LILA
                </span>
              )}
            </div>

            <div className="border-t border-[#1e3358] mb-2.5" />

            {/* Metric rows */}
            <div className="space-y-1.5">
              <TractMetricRow
                label="Food Risk Score"
                value={activeTract.food_risk_score.toFixed(2)}
                barValue={activeTract.food_risk_score}
                barColor={activeTract.food_risk_score > 0.65 ? '#ef4444' : activeTract.food_risk_score > 0.4 ? '#f5a623' : '#10b981'}
              />
              <TractMetricRow
                label="Equity Score"
                value={activeTract.equity_score.toFixed(2)}
                barValue={activeTract.equity_score}
                barColor={activeTract.equity_score < 0.35 ? '#ef4444' : activeTract.equity_score < 0.6 ? '#f5a623' : '#10b981'}
              />
              <TractMetricRow
                label="Transit Coverage"
                value={`${Math.round(activeTract.transit_coverage * 100)}%`}
                barValue={activeTract.transit_coverage}
                barColor="#3b82f6"
              />
              <TractMetricRow
                label="Food Insecurity"
                value={`${Math.round(activeTract.food_insecurity_rate * 100)}%`}
                barValue={activeTract.food_insecurity_rate}
                barColor="#f97316"
              />
              <TractMetricRow
                label="SNAP Rate"
                value={`${Math.round(activeTract.snap_rate * 100)}%`}
                barValue={activeTract.snap_rate}
                barColor="#a855f7"
              />
              {activeTract.mhhinc > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#7a93b8]">Median Income</span>
                  <span className="font-mono text-[10px] text-white">
                    ${activeTract.mhhinc.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#7a93b8]">Population</span>
                <span className="font-mono text-[10px] text-white">
                  {activeTract.population.toLocaleString()}
                </span>
              </div>
            </div>

            {!hoveredTract && (
              <p className="font-mono text-[9px] text-[#7a93b8]/50 mt-2.5 pt-2 border-t border-[#1e3358]">
                Switch to Equity tab for score breakdown · Simulate tab for policy actions
              </p>
            )}
            {hoveredTract && (
              <p className="font-mono text-[9px] text-[#7a93b8]/50 mt-2.5">
                Click to lock &amp; run simulation
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="no-tract"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5 text-center"
          >
            <p className="font-mono text-[10px] text-[#7a93b8]/70">
              Hover over any census tract to see its metrics here
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── City-wide stats ─────────────────────────────────────────────── */}
      {metrics.map((m) => (
        <div key={m.label} className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-[#7a93b8] uppercase tracking-wider">{m.label}</span>
            <span className={`font-display font-bold text-lg ${m.colorClass}`}>{m.display}</span>
          </div>
          <div className="h-1 bg-[#1e3358] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${m.value * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className={`h-full rounded-full ${m.barClass}`}
            />
          </div>
        </div>
      ))}

      <div>
        <h3 className="font-display font-semibold text-sm text-white mb-2.5">Highest Risk Tracts</h3>
        <div className="flex flex-col gap-2">
          {sortedTracts.map((tract, i) => {
            const riskPct = Math.round(tract.properties.food_risk_score * 100)
            const riskColor =
              tract.properties.food_risk_score > 0.75
                ? 'bg-red-500'
                : tract.properties.food_risk_score > 0.5
                ? 'bg-orange-400'
                : 'bg-yellow-400'
            return (
              <div key={tract.properties.tract_id} className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] text-[#7a93b8]/60 w-4 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-sans text-xs text-white flex-1 truncate">
                  {tract.properties.tract_name}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-20 h-1 bg-[#1e3358] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${riskColor}`} style={{ width: `${riskPct}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-[#7a93b8] w-8 text-right">
                    {tract.properties.food_risk_score.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Equity Tab ───────────────────────────────────────────────────────────────

const EQUITY_FORMULA_COMPONENTS = [
  { name: 'Need',          pct: 35, color: '#ef4444', key: 'need' as keyof EquityComponents },
  { name: 'Income Gap',    pct: 20, color: '#f97316', key: 'income_gap' as keyof EquityComponents },
  { name: 'Food Burden',   pct: 15, color: '#eab308', key: 'food_burden' as keyof EquityComponents },
  { name: 'Access',        pct: 20, color: '#3b82f6', key: 'access' as keyof EquityComponents },
  { name: 'Resource',      pct: 10, color: '#a855f7', key: 'resource' as keyof EquityComponents },
]

function EquityTab() {
  const { selectedTract } = useMapStore()
  const { data: detail, isLoading } = useTractDetail(selectedTract?.tract_id)

  const components = detail?.equity_components
  const hasBreakdown = components && Object.values(components).some(v => v > 0)

  const demographicFilters = ['Race/Ethnicity', 'Income', 'Age 65+', 'Disability', 'Language', 'SNAP']

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Formula display */}
      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Equity Score Formula</p>
        <pre className="bg-[#060e1c] border border-[#1e3358] rounded-lg p-3 text-[10px] font-mono text-emerald-300 leading-relaxed overflow-x-auto">
{`FoodRiskScore = (
  Need        × 0.35
+ Income Gap  × 0.20
+ Food Burden × 0.15
+ Access      × 0.20
+ Resource    × 0.10
) + 0.15 if LILA

EquityScore = 1 − FoodRiskScore`}
        </pre>
      </div>

      {/* Weight bars (always shown) */}
      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-3">
          Component Weights
        </p>
        <div className="flex flex-col gap-2">
          {EQUITY_FORMULA_COMPONENTS.map((c) => (
            <div key={c.name} className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-[#7a93b8] w-24 flex-shrink-0">{c.name}</span>
              <div className="flex-1 h-2 bg-[#1e3358] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.pct}%` }}
                  transition={{ duration: 0.7, delay: 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: c.color }}
                />
              </div>
              <span className="font-mono text-[11px] text-white w-8 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tract-specific breakdown — shown when a tract is selected */}
      <AnimatePresence>
        {selectedTract && (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5"
          >
            <p className="font-mono text-[10px] text-[#f5a623] uppercase tracking-wider mb-1">
              Selected Tract
            </p>
            <p className="font-sans text-sm font-medium text-white mb-3">
              {selectedTract.tract_name}
            </p>

            {isLoading && (
              <div className="flex items-center gap-2 text-[#7a93b8] text-xs font-mono py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading breakdown…
              </div>
            )}

            {!isLoading && hasBreakdown && (
              <div className="flex flex-col gap-2">
                {EQUITY_FORMULA_COMPONENTS.map((c) => {
                  const val = (components![c.key] ?? 0) as number
                  return (
                    <div key={c.key} className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-[#7a93b8] w-24 flex-shrink-0">{c.name}</span>
                      <div className="flex-1 h-2 bg-[#0a1628] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-white w-8 text-right">
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
                <div className="mt-2 pt-2 border-t border-[#1e3358] flex justify-between">
                  <span className="font-mono text-[10px] text-[#7a93b8]">Food Risk Score</span>
                  <span className="font-mono text-[11px] font-semibold text-red-400">
                    {selectedTract.food_risk_score.toFixed(3)}
                  </span>
                </div>
                {selectedTract.lila_flag === 1 && (
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] font-mono text-red-400">LILA Food Desert (+0.15 risk bonus)</span>
                  </div>
                )}
              </div>
            )}

            {!isLoading && !hasBreakdown && (
              <p className="font-mono text-[10px] text-[#7a93b8]/60 italic">
                Run ingest_datasets to see component breakdown.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedTract && (
        <p className="font-mono text-[10px] text-[#7a93b8]/60 italic text-center py-2">
          Click a tract on the map to see its breakdown.
        </p>
      )}

      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Demographic Overlay</p>
        <div className="flex flex-wrap gap-1.5">
          {demographicFilters.map((f) => (
            <button
              key={f}
              className="px-2.5 py-1 rounded-full text-xs font-mono border border-[#1e3358] text-[#7a93b8] hover:border-[#7a93b8] hover:text-white transition-colors duration-150"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[#1e3358] pt-3">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Data Sources</p>
        <div className="flex flex-col gap-1">
          {[
            'US Census ACS 5-Year (2022)',
            'USDA Food Access Research Atlas',
            'USDA LILA Food Desert Atlas',
            'PolicyMap / BLS Food Spending',
            'Feeding America / GBFB 2023',
          ].map((src) => (
            <p key={src} className="font-mono text-[10px] text-[#7a93b8]/60">· {src}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Simulate Tab ─────────────────────────────────────────────────────────────

const INTERVENTIONS: { type: InterventionType; label: string; icon: React.ReactNode }[] = [
  { type: 'pantry', label: 'Add Food Pantry',        icon: <Plus className="w-3.5 h-3.5" /> },
  { type: 'mobile', label: 'Add Mobile Pantry Stop',  icon: <Truck className="w-3.5 h-3.5" /> },
  { type: 'hours',  label: 'Extend Existing Hours',   icon: <Clock className="w-3.5 h-3.5" /> },
]

function SimulateTab() {
  const { appliedInterventions, toggleIntervention, selectedTract } = useMapStore()
  const sim = useRunSimulation()

  const tractName   = selectedTract?.tract_name    ?? 'Select a tract on the map'
  const beforeScore = selectedTract?.food_risk_score ?? null

  useEffect(() => {
    if (!selectedTract?.tract_id || appliedInterventions.length === 0) return
    sim.mutate({ tractId: selectedTract.tract_id, interventions: appliedInterventions })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTract?.tract_id, appliedInterventions.join(',')])

  const afterScore        = sim.data?.after.food_risk_score ?? null
  const equityBefore      = sim.data?.before.equity_score
  const equityAfter       = sim.data?.after.equity_score
  const transitDeltaPct   = sim.data ? Math.round(sim.data.delta.transit_coverage * 100) : 0
  const householdsReached = sim.data?.households_reached ?? 0

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
        <span className="font-mono text-xs text-[#f5a623] truncate">{tractName}</span>
      </div>

      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2.5">Policy Actions</p>
        <div className="flex flex-col gap-2">
          {INTERVENTIONS.map(({ type, label, icon }) => {
            const applied = appliedInterventions.includes(type)
            return (
              <button
                key={type}
                onClick={() => toggleIntervention(type)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-sans transition-all duration-200 ${
                  applied
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-[#1e3358] bg-[#111f38] text-white hover:border-[#f5a623]/40 hover:bg-[#f5a623]/5'
                }`}
              >
                <span className={applied ? 'text-emerald-400' : 'text-[#7a93b8]'}>{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                {applied && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Before / After */}
      <div className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-3">
          Risk Score Projection
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <p className="font-mono text-[10px] text-[#7a93b8] mb-1">Before</p>
            {beforeScore !== null
              ? <p className="font-display font-bold text-2xl text-red-400">{beforeScore.toFixed(2)}</p>
              : <p className="font-display font-bold text-2xl text-[#7a93b8]/40">—</p>}
          </div>
          <div className="text-[#7a93b8] text-lg font-light">→</div>
          <div className="flex-1 text-center">
            <p className="font-mono text-[10px] text-[#7a93b8] mb-1">After</p>
            {sim.isPending
              ? <Loader2 className="w-6 h-6 text-[#7a93b8] animate-spin mx-auto" />
              : <AnimatedScore score={afterScore} />}
          </div>
        </div>
      </div>

      {/* Impact summary */}
      <AnimatePresence>
        {sim.data && afterScore !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-emerald-950/40 border border-emerald-500/25 rounded-xl p-3.5"
          >
            <p className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider mb-2">
              Projected Impact
            </p>
            <div className="flex flex-col gap-1.5">
              <p className="font-sans text-xs text-emerald-300">
                +{householdsReached.toLocaleString()} households newly reached
              </p>
              {equityBefore !== undefined && equityAfter !== undefined && (
                <p className="font-sans text-xs text-emerald-300">
                  Equity Score: {equityBefore.toFixed(2)} → {equityAfter.toFixed(2)}
                </p>
              )}
              {transitDeltaPct !== 0 && (
                <p className="font-sans text-xs text-emerald-300">
                  Transit Coverage: {transitDeltaPct > 0 ? '+' : ''}{transitDeltaPct}%
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sim.isError && (
        <p className="text-xs text-red-400/80 font-mono text-center">
          Simulation unavailable — is the API running?
        </p>
      )}
    </div>
  )
}

// ─── County Tab ───────────────────────────────────────────────────────────────

function CountyTab() {
  const { data: counties, isLoading, isError } = useCountyScores()

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#7a93b8] animate-spin" />
      </div>
    )
  }

  if (isError || !counties) {
    return (
      <div className="p-4 flex flex-col items-center gap-3 py-12 text-center">
        <AlertTriangle className="w-5 h-5 text-red-400/70" />
        <p className="font-mono text-xs text-red-400/80">
          Could not load county scores — is the API running?
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-1">
          County Overview
        </p>
        <p className="font-sans text-xs text-[#7a93b8]/60">
          Aggregated across all census tracts in Suffolk County (FIPS 25025).
        </p>
      </div>

      {counties.map((county) => {
        const riskColor =
          county.avg_food_risk > 0.7
            ? 'text-red-400'
            : county.avg_food_risk > 0.5
            ? 'text-amber-400'
            : 'text-emerald-400'

        const metrics = [
          {
            label: 'Avg Food Risk',
            value: county.avg_food_risk,
            display: county.avg_food_risk.toFixed(3),
            barColor: '#ef4444',
          },
          {
            label: 'Avg Equity Score',
            value: county.avg_equity_score,
            display: county.avg_equity_score.toFixed(3),
            barColor: '#f5a623',
          },
          {
            label: 'Transit Coverage',
            value: county.avg_transit_coverage,
            display: `${Math.round(county.avg_transit_coverage * 100)}%`,
            barColor: '#10b981',
          },
        ]

        return (
          <div key={county.county_fips} className="flex flex-col gap-3">
            {/* County header */}
            <div className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-sans font-semibold text-sm text-white">
                    {county.county_name}
                  </p>
                  <p className="font-mono text-[10px] text-[#7a93b8]">
                    FIPS {county.county_fips} · {county.tract_count} tracts
                  </p>
                </div>
                <span className={`font-display font-bold text-lg ${riskColor}`}>
                  {county.avg_food_risk.toFixed(2)}
                </span>
              </div>

              {/* Key counts */}
              <div className="flex gap-3 mt-2 pt-2 border-t border-[#1e3358]">
                <div className="flex-1 text-center">
                  <p className="font-display font-bold text-base text-red-400">
                    {county.high_risk_count}
                  </p>
                  <p className="font-mono text-[9px] text-[#7a93b8] uppercase tracking-wider">
                    High Risk
                  </p>
                </div>
                <div className="flex-1 text-center border-x border-[#1e3358]">
                  <p className="font-display font-bold text-base text-orange-400">
                    {county.lila_count}
                  </p>
                  <p className="font-mono text-[9px] text-[#7a93b8] uppercase tracking-wider">
                    LILA Tracts
                  </p>
                </div>
                <div className="flex-1 text-center">
                  <p className="font-display font-bold text-base text-blue-400">
                    ${county.avg_mhhinc > 0
                      ? `${Math.round(county.avg_mhhinc / 1000)}k`
                      : '—'}
                  </p>
                  <p className="font-mono text-[9px] text-[#7a93b8] uppercase tracking-wider">
                    Med. Income
                  </p>
                </div>
              </div>
            </div>

            {/* Metric bars */}
            <div className="flex flex-col gap-2.5">
              {metrics.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[10px] text-[#7a93b8]">{m.label}</span>
                    <span className="font-mono text-[10px] text-white">{m.display}</span>
                  </div>
                  <div className="h-1.5 bg-[#1e3358] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.value * 100}%` }}
                      transition={{ duration: 0.7, delay: 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: m.barColor }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* LILA warning */}
            {county.lila_count > 0 && (
              <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/25 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="font-mono text-[10px] text-orange-300">
                  {county.lila_count} tract{county.lila_count !== 1 ? 's' : ''} classified as LILA food desert — eligible for +0.15 risk weighting in equity formula.
                </p>
              </div>
            )}
          </div>
        )
      })}

      <div className="border-t border-[#1e3358] pt-3">
        <p className="font-mono text-[10px] text-[#7a93b8]/60 text-center">
          Suffolk County boundary shown as dashed amber overlay on map.
        </p>
      </div>
    </div>
  )
}

// ─── Tract metric row (label + value + mini bar) ──────────────────────────────

function TractMetricRow({
  label,
  value,
  barValue,
  barColor,
}: {
  label:    string
  value:    string
  barValue: number
  barColor: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[10px] text-[#7a93b8]">{label}</span>
        <span className="font-mono text-[10px] font-medium text-white">{value}</span>
      </div>
      <div className="h-0.5 bg-[#0a1628] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(barValue * 100, 100)}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function AnimatedScore({ score }: { score: number | null }) {
  const [displayed, setDisplayed] = useState<number | null>(null)

  useEffect(() => {
    if (score === null) { setDisplayed(null); return }
    const t = setTimeout(() => setDisplayed(score), 250)
    return () => clearTimeout(t)
  }, [score])

  if (displayed === null) {
    return <p className="font-display font-bold text-2xl text-[#7a93b8]/40">—</p>
  }

  const color = displayed < 0.65 ? 'text-emerald-400' : 'text-yellow-400'

  return (
    <motion.p
      key={displayed}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`font-display font-bold text-2xl ${color}`}
    >
      {displayed.toFixed(2)}
    </motion.p>
  )
}
