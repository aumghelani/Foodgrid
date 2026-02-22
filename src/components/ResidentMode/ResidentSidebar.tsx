import { useState } from 'react'
import { MapPin, Search, Volume2, Train } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'
import { useResources } from '../../api/hooks'
import type { ResourceFilter, ServiceFilter } from '../../types'
import type { FrontendFoodResource } from '../../types/resources'

// Default origin: Boston City Hall — used for distance estimates until
// the user enters their own address (geocoding not yet implemented).
const BOSTON_CENTER = { lat: 42.3601, lng: -71.0589 }

const RESOURCE_FILTERS: { key: ResourceFilter; label: string }[] = [
  { key: 'pantry', label: 'Pantries' },
  { key: 'grocery', label: 'Grocery' },
  { key: 'farmers_market', label: 'Farmers Market' },
  { key: 'mobile', label: 'Mobile' },
]

const SERVICE_FILTERS: { key: ServiceFilter; label: string }[] = [
  { key: 'open_now', label: 'Open Now' },
  { key: 'snap', label: 'SNAP/EBT' },
  { key: 'free', label: 'Free Only' },
]

const TYPE_COLORS: Record<string, string> = {
  pantry: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  grocery: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  farmers_market: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  mobile: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
}

const resourceLabels: Record<string, string> = {
  pantry:         'Pantry',
  grocery:        'Grocery',
  farmers_market: 'Farmers Market',
  mobile:         'Mobile',
}

export default function ResidentSidebar() {
  const {
    activeResourceFilters,
    toggleResourceFilter,
    activeServiceFilters,
    toggleServiceFilter,
    travelTimeLimit,
    setTravelTimeLimit,
  } = useMapStore()

  // Local state for the slider display value — prevents API re-fetch on
  // every tick. The store (and thus the query) only updates on mouse/touch up.
  const [sliderDisplay, setSliderDisplay] = useState(travelTimeLimit)

  // Fetch resources from the API with active filters applied server-side.
  const { data: allResources = [], isLoading, isError, refetch } = useResources({
    types:          activeResourceFilters,
    serviceFilters: activeServiceFilters,
    lat:            BOSTON_CENTER.lat,
    lng:            BOSTON_CENTER.lng,
    maxMinutes:     travelTimeLimit,
  })

  const results = allResources.slice(0, 6)

  return (
    <aside className="w-[340px] flex-shrink-0 h-full flex flex-col bg-[#0e1a30] border-r border-[#1e3358] overflow-y-auto">
      {/* Address Search */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1e3358]">
        <div className="flex items-center gap-2 bg-[#111f38] border border-[#1e3358] rounded-lg px-3 py-2.5">
          <MapPin className="w-4 h-4 text-[#f5a623] flex-shrink-0" />
          <input
            type="text"
            defaultValue="Roxbury, Boston MA"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#7a93b8] outline-none font-sans"
            placeholder="Enter your address…"
          />
          <Search className="w-4 h-4 text-[#7a93b8] flex-shrink-0" />
        </div>
      </div>

      {/* Resource Type Filters */}
      <div className="px-4 pt-3 pb-2">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Resource Type</p>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_FILTERS.map(({ key, label }) => {
            const active = activeResourceFilters.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleResourceFilter(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                  active
                    ? 'bg-[#f5a623] text-[#0a1628] border-[#f5a623]'
                    : 'bg-transparent text-[#7a93b8] border-[#1e3358] hover:border-[#7a93b8]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Service Filters */}
      <div className="px-4 pb-3 border-b border-[#1e3358]">
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_FILTERS.map(({ key, label }) => {
            const active = activeServiceFilters.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleServiceFilter(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                  active
                    ? 'bg-[#f5a623] text-[#0a1628] border-[#f5a623]'
                    : 'bg-transparent text-[#7a93b8] border-[#1e3358] hover:border-[#7a93b8]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Travel Time Slider */}
      <div className="px-4 py-4 border-b border-[#1e3358]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[11px] text-[#7a93b8] uppercase tracking-wider">
            Max travel time (MBTA)
          </p>
          <span className="font-mono text-sm font-medium text-[#f5a623]">
            {sliderDisplay} min
          </span>
        </div>
        <TravelTimeSlider
          value={sliderDisplay}
          onChange={setSliderDisplay}
          onCommit={(v) => setTravelTimeLimit(v)}
        />
        <div className="flex justify-between mt-1.5">
          {[15, 30, 45].map((v) => (
            <span key={v} className="font-mono text-[10px] text-[#7a93b8]/60">{v} min</span>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display font-semibold text-sm text-white">Nearby Resources</h2>
          {!isLoading && (
            <span className="font-mono text-xs px-1.5 py-0.5 bg-[#f5a623]/15 text-[#f5a623] rounded-full border border-[#f5a623]/30">
              {results.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isLoading && <ResourceSkeleton />}

          {!isLoading && isError && (
            <div className="text-center py-6">
              <p className="text-sm text-red-400/80 font-mono mb-3">
                Could not load resources — is the API running?
              </p>
              <button
                onClick={() => refetch()}
                className="px-3 py-1.5 rounded border border-red-700 text-red-300 hover:bg-red-900/30 transition-colors text-xs font-mono"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && results.map((resource, i) => (
            <ResourceCard key={resource.id} resource={resource} highlighted={i === 0} />
          ))}

          {!isLoading && !isError && results.length === 0 && (
            <p className="text-sm text-[#7a93b8]/60 italic text-center py-8">
              No resources match the current filters.
            </p>
          )}
        </div>
      </div>

      {/* Accessibility footer */}
      <div className="px-4 py-3 border-t border-[#1e3358]">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#1e3358] text-sm text-[#7a93b8] hover:text-white hover:border-[#7a93b8] transition-colors duration-150">
          <Volume2 className="w-4 h-4" />
          <span className="font-sans text-sm">Read results aloud</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ResourceSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-[#1e3358] bg-[#111f38]/60 p-3 animate-pulse">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="h-3 bg-[#1e3358] rounded w-3/4 mb-1.5" />
              <div className="h-2.5 bg-[#1e3358] rounded w-1/2" />
            </div>
            <div className="h-4 w-16 bg-[#1e3358] rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="h-4 w-10 bg-[#1e3358] rounded-full" />
              <div className="h-4 w-8 bg-[#1e3358] rounded-full" />
            </div>
            <div className="h-4 w-14 bg-[#1e3358] rounded-full" />
          </div>
        </div>
      ))}
    </>
  )
}

// ─── Resource Card ────────────────────────────────────────────────────────────

function ResourceCard({ resource, highlighted }: { resource: FrontendFoodResource; highlighted: boolean }) {
  const typeColor = TYPE_COLORS[resource.type] ?? 'text-white bg-white/10 border-white/20'

  const tagColors: Record<string, string> = {
    SNAP: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    EBT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    'Open Now': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Free: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    WIC: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  }

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all duration-150 ${
        highlighted
          ? 'border-l-2 border-l-[#f5a623] border-[#1e3358] bg-[#111f38]'
          : 'border-[#1e3358] bg-[#111f38]/60 hover:bg-[#111f38]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className="font-sans font-medium text-sm text-white leading-tight truncate">
            {resource.name}
          </p>
          <p className="font-mono text-[10px] text-[#7a93b8] mt-0.5 truncate">
            {resource.address}
          </p>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-mono ${typeColor}`}>
          {resourceLabels[resource.type]}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${tagColors[tag] ?? 'bg-white/10 text-white/60 border-white/20'}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5 ml-1 flex-shrink-0">
          <Train className="w-2.5 h-2.5 text-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-400">
            {resource.transitMinutes} min
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Custom Travel Time Slider ────────────────────────────────────────────────

/**
 * Slider with debounced store update.
 *
 * - onChange: updates the local display value on every tick (no re-fetch)
 * - onCommit: called only on mouseup/touchend — triggers the actual API fetch
 * - step=15: snaps to 15, 30, 45 minutes only
 */
function TravelTimeSlider({
  value,
  onChange,
  onCommit,
}: {
  value: number
  onChange: (v: number) => void
  onCommit: (v: number) => void
}) {
  const min = 15
  const max = 45
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        step={15}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #f5a623 ${pct}%, #1e3358 ${pct}%)`,
        }}
      />
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #f5a623;
          border: 2px solid #0a1628;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(245,166,35,0.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #f5a623;
          border: 2px solid #0a1628;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
