import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, Clock, Truck } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'
import { bostonCensusTracts, cityStats } from '../../data/censusTracts'
import type { InterventionType } from '../../types'

type Tab = 'overview' | 'equity' | 'simulate'

export default function GovernmentSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <aside className="w-[340px] flex-shrink-0 h-full flex flex-col bg-[#0e1a30] border-r border-[#1e3358]">
      {/* Tab Bar */}
      <div className="flex border-b border-[#1e3358] flex-shrink-0">
        {(['overview', 'equity', 'simulate'] as Tab[]).map((tab) => (
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
  const metrics = [
    {
      label: 'City Equity Score',
      value: cityStats.equityScore,
      display: cityStats.equityScore.toFixed(2),
      color: '#eab308',
      colorClass: 'text-yellow-400',
      barClass: 'bg-yellow-400',
    },
    {
      label: 'Transit Coverage',
      value: cityStats.transitCoverage,
      display: `${Math.round(cityStats.transitCoverage * 100)}%`,
      color: '#22c55e',
      colorClass: 'text-emerald-400',
      barClass: 'bg-emerald-400',
    },
    {
      label: 'High-Risk Tracts',
      value: cityStats.highRiskTracts / cityStats.totalTracts,
      display: `${cityStats.highRiskTracts} of ${cityStats.totalTracts}`,
      color: '#ef4444',
      colorClass: 'text-red-400',
      barClass: 'bg-red-400',
    },
  ]

  // Sort tracts by risk descending
  const sortedTracts = [...bostonCensusTracts.features]
    .sort((a, b) => b.properties.foodRiskScore - a.properties.foodRiskScore)
    .slice(0, 5)

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Metric cards */}
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

      {/* Highest Risk Tracts */}
      <div>
        <h3 className="font-display font-semibold text-sm text-white mb-2.5">Highest Risk Tracts</h3>
        <div className="flex flex-col gap-2">
          {sortedTracts.map((tract, i) => {
            const riskPct = Math.round(tract.properties.foodRiskScore * 100)
            const riskColor =
              tract.properties.foodRiskScore > 0.75
                ? 'bg-red-500'
                : tract.properties.foodRiskScore > 0.5
                ? 'bg-orange-400'
                : 'bg-yellow-400'
            return (
              <div key={tract.properties.tractId} className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] text-[#7a93b8]/60 w-4 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-sans text-xs text-white flex-1 truncate">
                  {tract.properties.tractName}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-20 h-1 bg-[#1e3358] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${riskColor}`}
                      style={{ width: `${riskPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-[#7a93b8] w-8 text-right">
                    {(tract.properties.foodRiskScore).toFixed(2)}
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

function EquityTab() {
  const components = [
    { name: 'Need', pct: 40, color: '#ef4444' },
    { name: 'Supply', pct: 30, color: '#f97316' },
    { name: 'Transit', pct: 20, color: '#3b82f6' },
    { name: 'Vulnerability', pct: 10, color: '#a855f7' },
  ]

  const demographicFilters = ['Race/Ethnicity', 'Income', 'Age 65+', 'Disability', 'Language', 'SNAP']

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Equity Score formula */}
      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Equity Score Formula</p>
        <pre className="bg-[#060e1c] border border-[#1e3358] rounded-lg p-3 text-[10px] font-mono text-emerald-300 leading-relaxed overflow-x-auto">
{`FoodRiskScore = (
  Need       × 0.40
+ Supply⁻¹   × 0.30
+ Transit⁻¹  × 0.20
+ Vuln       × 0.10
)

EquityScore = 1 − normalize(
  FoodRiskScore,
  city_min, city_max
)`}
        </pre>
      </div>

      {/* Risk score component bars */}
      <div>
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-3">
          Score Component Weights
        </p>
        <div className="flex flex-col gap-2">
          {components.map((c) => (
            <div key={c.name} className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-[#7a93b8] w-20 flex-shrink-0">{c.name}</span>
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

      {/* Demographic overlay filters */}
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

      {/* Data Sources */}
      <div className="border-t border-[#1e3358] pt-3">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Data Sources</p>
        <div className="flex flex-col gap-1">
          {[
            'US Census ACS 5-Year (2022)',
            'USDA Food Access Research Atlas',
            'Boston Open Data Portal',
            'MBTA GTFS v3 API',
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

const INTERVENTIONS: {
  type: InterventionType
  label: string
  icon: React.ReactNode
  afterScore: number
}[] = [
  { type: 'pantry', label: 'Add Food Pantry', icon: <Plus className="w-3.5 h-3.5" />, afterScore: 0.71 },
  { type: 'mobile', label: 'Add Mobile Pantry Stop', icon: <Truck className="w-3.5 h-3.5" />, afterScore: 0.64 },
  { type: 'hours', label: 'Extend Existing Hours', icon: <Clock className="w-3.5 h-3.5" />, afterScore: 0.74 },
]

function SimulateTab() {
  const { appliedInterventions, toggleIntervention } = useMapStore()
  const { selectedTract } = useMapStore()

  const tractName = selectedTract?.tractName ?? 'Roxbury Census Tract 1'
  const beforeScore = selectedTract?.foodRiskScore ?? 0.88

  // Compute effective "after" score based on combined interventions
  let afterScore: number | null = null
  if (appliedInterventions.length > 0) {
    if (appliedInterventions.includes('pantry') && appliedInterventions.includes('mobile')) {
      afterScore = 0.58
    } else if (appliedInterventions.includes('mobile')) {
      afterScore = 0.64
    } else if (appliedInterventions.includes('pantry')) {
      afterScore = 0.71
    } else if (appliedInterventions.includes('hours')) {
      afterScore = 0.74
    }
  }

  const equityDelta = afterScore !== null ? (0.61 + (beforeScore - (afterScore ?? beforeScore)) * 0.4).toFixed(2) : null
  const householdsReached = appliedInterventions.length > 0
    ? appliedInterventions.includes('pantry') && appliedInterventions.includes('mobile')
      ? 6800
      : appliedInterventions.includes('mobile')
      ? 5100
      : 4200
    : 0
  const transitDelta = appliedInterventions.length > 0
    ? appliedInterventions.includes('mobile') ? 8 : 6
    : 0

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Selected tract */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
        <span className="font-mono text-xs text-[#f5a623]">{tractName}</span>
      </div>

      {/* Intervention buttons */}
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

      {/* Before / After comparison */}
      <div className="bg-[#111f38] border border-[#1e3358] rounded-xl p-3.5">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-3">
          Risk Score Projection
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <p className="font-mono text-[10px] text-[#7a93b8] mb-1">Before</p>
            <p className="font-display font-bold text-2xl text-red-400">{beforeScore.toFixed(2)}</p>
          </div>
          <div className="text-[#7a93b8] text-lg font-light">→</div>
          <div className="flex-1 text-center">
            <p className="font-mono text-[10px] text-[#7a93b8] mb-1">After</p>
            <AnimatedScore score={afterScore} />
          </div>
        </div>
      </div>

      {/* Result summary card */}
      <AnimatePresence>
        {appliedInterventions.length > 0 && afterScore !== null && (
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
              <p className="font-sans text-xs text-emerald-300">
                Equity Score: 0.61 → {equityDelta}
              </p>
              <p className="font-sans text-xs text-emerald-300">
                Transit Coverage: +{transitDelta}%
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Animated score display
function AnimatedScore({ score }: { score: number | null }) {
  const [displayed, setDisplayed] = useState<number | null>(null)

  useEffect(() => {
    if (score === null) {
      setDisplayed(null)
      return
    }
    // Brief delay to feel like it's computing
    const t = setTimeout(() => setDisplayed(score), 300)
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
