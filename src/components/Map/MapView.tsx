import { useCallback, useMemo } from 'react'
import Map from 'react-map-gl/maplibre'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers'
import type { MapViewState } from '@deck.gl/core'
import type { AppMode, FoodResource, TractProperties } from '../../types'
import { bostonCensusTracts, getRiskColor } from '../../data/censusTracts'
import { foodResources, resourceColors } from '../../data/foodResources'
import { getExplanation } from '../../data/aiExplanations'
import { useMapStore } from '../../store/useMapStore'

// Free dark basemap from Carto — no API key needed
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Roxbury — user's pinned location
const USER_LOCATION: [number, number] = [-71.0845, 42.3255]

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -71.075,
  latitude: 42.338,
  zoom: 11.5,
  pitch: 0,
  bearing: 0,
}

interface MapViewProps {
  mode: AppMode
}

export default function MapView({ mode }: MapViewProps) {
  const { activeResourceFilters, selectedTract, setSelectedTract } = useMapStore()

  // Filter visible food resources by active filter chips
  const visibleResources = useMemo(
    () => foodResources.filter((r) => activeResourceFilters.includes(r.type)),
    [activeResourceFilters]
  )

  // ── Resident Mode Layers ───────────────────────────────────────────────
  const residentLayers = useMemo(() => [
    new ScatterplotLayer<FoodResource>({
      id: 'food-resources',
      data: visibleResources,
      getPosition: (d) => d.coordinates,
      getRadius: 60,
      getFillColor: (d) => resourceColors[d.type] ?? [255, 255, 255, 200],
      radiusMinPixels: 7,
      radiusMaxPixels: 18,
      pickable: true,
    }),
    new ScatterplotLayer({
      id: 'user-location',
      data: [{ position: USER_LOCATION }],
      getPosition: (d: { position: [number, number] }) => d.position,
      getRadius: 80,
      getFillColor: [255, 255, 255, 240],
      radiusMinPixels: 9,
      radiusMaxPixels: 9,
      stroked: true,
      getLineColor: [255, 255, 255, 100],
      lineWidthMinPixels: 3,
    }),
  ], [visibleResources])

  // ── Government Mode Layers ─────────────────────────────────────────────
  const governmentLayers = useMemo(() => [
    new GeoJsonLayer({
      id: 'census-tracts',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: bostonCensusTracts as any,
      pickable: true,
      stroked: true,
      filled: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getFillColor: (f: any) => {
        const props = f.properties as TractProperties
        const isSelected = selectedTract?.tractId === props.tractId
        const color = getRiskColor(props.foodRiskScore)
        if (isSelected) return [color[0], color[1], color[2], 235]
        return color
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getLineColor: (f: any) => {
        const props = f.properties as TractProperties
        return selectedTract?.tractId === props.tractId
          ? [245, 166, 35, 255]
          : [255, 255, 255, 60]
      },
      lineWidthMinPixels: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getLineWidth: (f: any) => {
        const props = f.properties as TractProperties
        return selectedTract?.tractId === props.tractId ? 4 : 1
      },
      updateTriggers: {
        getFillColor: [selectedTract?.tractId],
        getLineColor: [selectedTract?.tractId],
        getLineWidth: [selectedTract?.tractId],
      },
    }),
  ], [selectedTract])

  const layers = mode === 'resident' ? residentLayers : governmentLayers

  // Click handler — only selects tracts in government mode
  const onMapClick = useCallback(
    (info: { object?: unknown }) => {
      if (mode !== 'government') return
      if (info.object) {
        const feature = info.object as { properties: TractProperties }
        setSelectedTract(feature.properties)
      } else {
        setSelectedTract(null)
      }
    },
    [mode, setSelectedTract]
  )

  return (
    <div className="relative w-full h-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        onClick={onMapClick}
        style={{ position: 'absolute', inset: '0' }}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>

      {mode === 'resident' && <ResidentMapOverlays />}
      {mode === 'government' && <GovernmentMapOverlays selectedTract={selectedTract} />}
    </div>
  )
}

// ─── Resident Mode Overlays ──────────────────────────────────────────────────

function ResidentMapOverlays() {
  return (
    <>
      {/* Status card — top right */}
      <div className="absolute top-4 right-4 z-10 bg-[#0a1628]/90 border border-[#1e3358] rounded-lg px-3 py-2 backdrop-blur-sm pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#7a93b8]">7 found</span>
          <span className="text-[#7a93b8]/40">·</span>
          <span className="font-mono text-xs text-[#7a93b8]">MBTA Live</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Legend — bottom left */}
      <div className="absolute bottom-6 left-4 z-10 bg-[#0a1628]/90 border border-[#1e3358] rounded-lg px-3 py-2.5 backdrop-blur-sm pointer-events-none">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Legend</p>
        <div className="flex flex-col gap-1.5">
          {[
            { color: 'bg-emerald-400', label: 'Pantry' },
            { color: 'bg-amber-400', label: 'Grocery' },
            { color: 'bg-violet-400', label: "Farmers' Market" },
            { color: 'bg-blue-400', label: 'Mobile' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="font-mono text-[11px] text-[#7a93b8]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Government Mode Overlays ────────────────────────────────────────────────

function GovernmentMapOverlays({ selectedTract }: { selectedTract: TractProperties | null }) {
  const explanation = selectedTract ? getExplanation(selectedTract.tractId) : null

  return (
    <>
      {/* Risk scale legend — top right */}
      <div className="absolute top-4 right-4 z-10 bg-[#0a1628]/90 border border-[#1e3358] rounded-lg px-3 py-2.5 backdrop-blur-sm pointer-events-none">
        <p className="font-mono text-[10px] text-[#7a93b8] uppercase tracking-wider mb-2">Food Risk Scale</p>
        <div className="flex flex-col gap-1.5">
          {[
            { color: 'bg-red-500', label: 'Critical (>0.75)' },
            { color: 'bg-orange-500', label: 'High (0.50–0.75)' },
            { color: 'bg-yellow-500', label: 'Moderate (0.35–0.50)' },
            { color: 'bg-emerald-500', label: 'Low (<0.35)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className="font-mono text-[11px] text-[#7a93b8]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Copilot panel — bottom right */}
      <div className="absolute bottom-4 right-4 z-10 w-72 bg-[#0d0d2b]/95 border border-violet-500/30 rounded-xl p-4 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ai-pulse" />
          <span className="font-mono text-xs text-violet-300 font-medium">AI Copilot</span>
          <span className="font-mono text-[10px] text-violet-500/70 ml-auto">Llama · Ollama</span>
        </div>

        {explanation ? (
          <>
            <div className="bg-violet-950/50 border border-violet-500/20 rounded-lg p-3 mb-3">
              <p className="text-[11px] text-violet-100/90 leading-relaxed">
                {explanation.text}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 bg-violet-900/50 text-violet-300 rounded-full border border-violet-500/30">
                Conf: {explanation.confidence}%
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-red-950/50 text-red-400/80 rounded-full border border-red-800/30">
                No eligibility decisions
              </span>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-violet-400/60 italic leading-relaxed">
            Click a census tract on the map to see AI-generated food access analysis.
          </p>
        )}
      </div>
    </>
  )
}
