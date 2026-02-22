import { useRef } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { MapRef } from 'react-map-gl/maplibre'
import { FILL_LAYER, RESIDENT_FILL_LAYER, BORDER_LAYER } from './layers'
import { useMapInteraction } from './useMapInteraction'
import { BOSTON_TRACTS } from '../../data/censusTracts'
import { useTracts } from '../../api/hooks'
import type { MapViewProps, TractProperties } from '../../types/map'

/** Free Carto dark-matter basemap — no API token required. */
const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/**
 * Initial camera: centred on central Boston, zoom 11.5 shows all 10
 * census-tract polygons without the user having to pan.
 */
const INITIAL_VIEW = {
  longitude: -71.0589,
  latitude: 42.3150,
  zoom: 11.5,
  pitch: 0,
  bearing: 0,
}

/**
 * Core map component for FoodGrid Boston.
 *
 * Renders a MapLibre GL JS basemap with a GeoJSON source of Boston census
 * tracts and two layers:
 *
 * **Government mode** — full choropleth fill (colour-coded by food_risk_score)
 * plus a border layer whose colour/width respond to MapLibre feature-state
 * (hover = white, selected = amber #f5a623).
 *
 * **Resident mode** — near-invisible fill (opacity 0.01) kept solely for
 * `queryRenderedFeatures` hit-detection; the choropleth does NOT render, so
 * the parent's deck.gl ScatterplotLayer resource pins are visually dominant.
 *
 * ### Key design decisions
 * - Hover and selection state are managed via `map.setFeatureState` only —
 *   no React state is mutated on mouse-move, preventing per-frame re-renders.
 * - No UI chrome or overlays are rendered here; those belong to parent components.
 * - `generateId={false}` tells MapLibre to use each feature's own numeric `id`
 *   rather than auto-generating IDs — required for `setFeatureState` targeting.
 * - BOSTON_TRACTS is used as placeholderData in useTracts() so the map renders
 *   immediately; live API data replaces it once the backend responds.
 */
export default function MapView({
  mode,
  onTractSelected,
  selectedTractId: _selectedTractId,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)

  /**
   * Provide a no-op fallback when onTractSelected is omitted (read-only usage).
   * The hook always receives a concrete function — no optional-call spread needed.
   */
  const handleSelected: (properties: TractProperties) => void =
    onTractSelected ?? (() => undefined)

  const { handleMouseMove, handleMouseLeave, handleClick } =
    useMapInteraction(mapRef, handleSelected)

  // Live tract GeoJSON from the API; falls back to static BOSTON_TRACTS while
  // the backend loads or if it's unreachable (see useTracts placeholderData).
  const { data: tractData } = useTracts()

  /**
   * In resident mode the fill is nearly invisible — just enough to register
   * in queryRenderedFeatures for hover/click hit detection.
   */
  const activeFillLayer = mode === 'government' ? FILL_LAYER : RESIDENT_FILL_LAYER

  return (
    <Map
      ref={mapRef}
      mapStyle={CARTO_DARK}
      initialViewState={INITIAL_VIEW}
      style={{ width: '100%', height: '100%' }}
      interactiveLayerIds={['tract-fill']}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/*
        generateId={false}: use each feature's own numeric id (from BOSTON_TRACTS)
        instead of auto-generated IDs. Required for setFeatureState to work correctly.
      */}
      <Source id="tracts" type="geojson" data={tractData ?? BOSTON_TRACTS} generateId={false}>
        <Layer {...activeFillLayer} />
        <Layer {...BORDER_LAYER} />
      </Source>
    </Map>
  )
}
