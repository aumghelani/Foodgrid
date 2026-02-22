import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import MapGL, { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { MapRef as MapGLRef } from 'react-map-gl/maplibre'
import type { LineLayerSpecification } from 'maplibre-gl'
import { DeckGL } from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import { FILL_LAYER, RESIDENT_FILL_LAYER, BORDER_LAYER } from './layers'
import { useMapInteraction } from './useMapInteraction'
import { BOSTON_TRACTS } from '../../data/censusTracts'
import { SUFFOLK_COUNTY_GEOJSON } from '../../data/countyBoundary'
import { useTracts, useAllResources } from '../../api/hooks'
import { useMapStore, DEFAULT_USER_LOCATION } from '../../store/useMapStore'
import { PRICE_ORDER, STORE_HIERARCHY } from '../../data/storeHierarchy'
import type { MapViewProps } from '../../types/map'
import type { FrontendFoodResource, StoreCategory } from '../../types/resources'
import mbtaStops from '../../data/mbta_stops.json'
import LayerTogglePanel from './LayerTogglePanel'
import { ResourceTooltip, MbtaTooltip } from './ResourceTooltip'
import type { TooltipPosition } from './ResourceTooltip'

/** Free Carto dark-matter basemap — no API token required. */
const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const INITIAL_VIEW = {
  longitude: DEFAULT_USER_LOCATION.lng,
  latitude:  DEFAULT_USER_LOCATION.lat,
  zoom:      13,
  pitch:     0,
  bearing:   0,
}

// ─── Suffolk County border layer spec ────────────────────────────────────────

const COUNTY_BORDER_LAYER: LineLayerSpecification = {
  id:     'county-border',
  type:   'line',
  source: 'county',
  paint: {
    'line-color':     '#f5a623',
    'line-width':     2.5,
    'line-dasharray': [4, 3],
    'line-opacity':   0.70,
  },
}

// ─── MBTA stop record type ────────────────────────────────────────────────────

interface MbtaStop {
  stop_id:      string
  name:         string
  lat:          number
  lon:          number
  vehicle_type: string
}

// ─── Tooltip state ────────────────────────────────────────────────────────────

type TooltipState =
  | { kind: 'resource'; resource: FrontendFoodResource; position: TooltipPosition; distanceKm: number }
  | { kind: 'mbta'; name: string; vehicleType: string; position: TooltipPosition }
  | null

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * Core map component for FoodGrid Boston.
 *
 * Architecture:
 * - DeckGL wraps MapLibre <MapGL> as a child (shared WebGL context + controller).
 * - DeckGL's canvas is on top; MapLibre's canvas is below.
 * - ALL pointer interaction is routed through DeckGL's onHover / onClick:
 *     DeckGL canvas intercepts raw DOM events so MapGL's onMouseMove / onClick
 *     never fire (react-map-gl confirmed limitation). We instead call
 *     mapRef.queryRenderedFeatures([x,y]) manually with DeckGL's pixel coords.
 * - Cursor: React state → DeckGL getCursor (never canvas.style.cursor).
 * - Resource tooltip: DeckGL onHover + haversine distance.
 * - Tract hover/select: DeckGL onHover/onClick → queryRenderedFeatures → setFeatureState.
 * - Container guard: ResizeObserver waits for non-zero px before mounting DeckGL
 *   (prevents deck.gl v9 WebGL init crash in canvas-context.ts).
 */
export default function MapView({
  mode,
  onTractSelected,
  selectedTractId: _selectedTractId,
}: MapViewProps) {
  const mapRef          = useRef<MapGLRef>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // ── Container-ready guard ──────────────────────────────────────────────────
  // Wait until the container has real dimensions before mounting DeckGL.
  const containerReadyRef = useRef(false)
  const [containerReady, setContainerReady] = useState(false)
  const [containerSize,  setContainerSize]  = useState({ w: 800, h: 600 })

  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })

      if (!containerReadyRef.current && width > 0 && height > 0) {
        containerReadyRef.current = true
        setContainerReady(true)
      }
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Cursor state ───────────────────────────────────────────────────────────
  const [cursor, setCursor] = useState('default')

  // ── Hovered tract — stored globally so GovernmentSidebar can read it ───────
  // useMapStore already has hoveredTract / setHoveredTract; we write here,
  // the sidebar reads there. No prop-drilling needed.
  const { setHoveredTract } = useMapStore()

  const handleSelected: (properties: TractProperties) => void =
    onTractSelected ?? (() => undefined)

  // useMapInteraction now returns DeckGL-compatible handlers:
  //   onDeckHover(x, y) — call from DeckGL onHover
  //   onDeckClick(x, y) — call from DeckGL onClick (when no deck.gl object picked)
  //   clearHover()      — call from container onMouseLeave
  const { onDeckHover, onDeckClick, clearHover } =
    useMapInteraction(mapRef, handleSelected, {
      onHovered: setHoveredTract,
      setCursor,
    })

  const { data: tractData } = useTracts()
  const { data: allResources = [] } = useAllResources()

  const { visibleResourceLayers, showMbta, userLat, userLng } = useMapStore()

  const [tooltip, setTooltip] = useState<TooltipState>(null)

  const activeFillLayer = mode === 'government' ? FILL_LAYER : RESIDENT_FILL_LAYER

  // ─── User location layer — gold dot ─────────────────────────────────────────

  const userLocationLayer = useMemo(
    () =>
      new ScatterplotLayer({
        id:             'user-location',
        data:           [{ position: [userLng, userLat] as [number, number] }],
        getPosition:    (d: { position: [number, number] }) => d.position,
        getRadius:      18,
        getFillColor:   [245, 166, 35, 255],
        getLineColor:   [255, 255, 255, 255],
        getLineWidth:   3,
        lineWidthUnits: 'pixels',
        radiusUnits:    'meters',
        pickable:       false,
      }),
    [userLat, userLng],
  )

  // ─── Resource layers: one ScatterplotLayer per price tier ────────────────────

  const resourcesByCategory = useMemo(() => {
    const map = new Map<StoreCategory, FrontendFoodResource[]>()
    for (const cat of PRICE_ORDER as StoreCategory[]) map.set(cat, [])
    for (const r of allResources) {
      const list = map.get(r.category)
      if (list) list.push(r)
    }
    return map
  }, [allResources])

  const resourceLayers = useMemo(() => {
    const isGov = mode === 'government'

    return (PRICE_ORDER as StoreCategory[])
      .filter((cat) => visibleResourceLayers.has(cat))
      .map((cat) => {
        const tier      = STORE_HIERARCHY[cat]
        const items     = resourcesByCategory.get(cat) ?? []
        const [r, g, b] = hexToRgb(tier.hexColor)

        return new ScatterplotLayer<FrontendFoodResource>({
          id:            `resource-${cat}`,
          data:          items,
          getPosition:   (d) => d.coordinates,
          getRadius:     isGov ? 60 : 80,
          getFillColor:  [r, g, b, isGov ? 178 : 230],
          getLineColor:  [10, 22, 40, 255],
          getLineWidth:  2,
          lineWidthUnits:'pixels',
          radiusUnits:   'meters',
          pickable:      true,
          autoHighlight: false,
        })
      })
  }, [mode, resourcesByCategory, visibleResourceLayers])

  // ─── MBTA stop layer ─────────────────────────────────────────────────────────

  const mbtaLayer = useMemo(
    () =>
      new ScatterplotLayer<MbtaStop>({
        id:             'mbta-stops',
        data:           mbtaStops as MbtaStop[],
        getPosition:    (d) => [d.lon, d.lat],
        getRadius:      40,
        getFillColor:   [218, 41, 28, 178],
        getLineColor:   [255, 255, 255, 200],
        getLineWidth:   1.5,
        lineWidthUnits: 'pixels',
        radiusUnits:    'meters',
        pickable:       true,
        autoHighlight:  false,
      }),
    [],
  )

  const deckLayers = useMemo(
    () => [
      userLocationLayer,
      ...(showMbta ? [...resourceLayers, mbtaLayer] : resourceLayers),
    ],
    [userLocationLayer, resourceLayers, mbtaLayer, showMbta],
  )

  // ─── DeckGL hover — tract highlight + resource tooltip ───────────────────────
  // All pointer interaction is routed here because DeckGL's canvas is on top.

  const handleDeckHover = useCallback(
    (info: PickingInfo) => {
      // Always query MapLibre tracts at the cursor position.
      // queryRenderedFeatures works with DeckGL's pixel coords because both
      // DeckGL and MapLibre share the same canvas coordinate space.
      onDeckHover(info.x, info.y)

      // Resource / MBTA tooltip
      if (!info.object) {
        setTooltip(null)
        return
      }
      const layerId = info.layer?.id ?? ''
      if (layerId.startsWith('resource-')) {
        const resource = info.object as FrontendFoodResource
        const [rLng, rLat] = resource.coordinates
        const distanceKm = haversine(userLat, userLng, rLat, rLng)
        setTooltip({
          kind:     'resource',
          resource,
          position: { x: info.x, y: info.y },
          distanceKm,
        })
      } else if (layerId === 'mbta-stops') {
        const stop = info.object as MbtaStop
        setTooltip({
          kind:        'mbta',
          name:        stop.name,
          vehicleType: stop.vehicle_type,
          position:    { x: info.x, y: info.y },
        })
      } else {
        setTooltip(null)
      }
    },
    [onDeckHover, userLat, userLng],
  )

  // ─── DeckGL click — tract selection ──────────────────────────────────────────
  // Only fires for empty areas; resource/MBTA dot clicks are handled by their
  // own layer interactions (no selection needed for pins).

  const handleDeckClick = useCallback(
    (info: PickingInfo) => {
      // If a deck.gl object (resource dot, MBTA stop) was picked, don't
      // select a tract — the user clicked on a pin, not the background.
      if (info.object) return
      onDeckClick(info.x, info.y)
    },
    [onDeckClick],
  )

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '100%', position: 'relative', minHeight: '400px' }}
      onMouseLeave={clearHover}
    >
      {containerReady && (
        <DeckGL
          layers={deckLayers}
          initialViewState={INITIAL_VIEW}
          controller={true}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          onHover={handleDeckHover}
          onClick={handleDeckClick}
          getCursor={({ isDragging, isHovering }) => {
            if (isDragging) return 'grabbing'
            if (isHovering) return 'pointer'
            return cursor
          }}
        >
          {/*
            MapGL has NO onMouseMove / onMouseLeave / onClick.
            Those events do not fire when Map is a child of DeckGL because
            DeckGL's canvas captures all DOM pointer events. Tract interaction
            is handled by handleDeckHover / handleDeckClick above.
          */}
          <MapGL
            ref={mapRef}
            mapStyle={CARTO_DARK}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={['tract-fill']}
          >
            <Source id="tracts" type="geojson" data={tractData ?? BOSTON_TRACTS} generateId={false}>
              <Layer {...activeFillLayer} />
              <Layer {...BORDER_LAYER} />
            </Source>

            {mode === 'government' && (
              <Source id="county" type="geojson" data={SUFFOLK_COUNTY_GEOJSON}>
                <Layer {...COUNTY_BORDER_LAYER} />
              </Source>
            )}
          </MapGL>

          {/* Overlays — siblings to MapGL inside DeckGL's container */}
          <LayerTogglePanel />

          {tooltip?.kind === 'resource' && (
            <ResourceTooltip
              resource={tooltip.resource}
              position={tooltip.position}
              distanceKm={tooltip.distanceKm}
              containerWidth={containerSize.w}
              containerHeight={containerSize.h}
            />
          )}

          {tooltip?.kind === 'mbta' && (
            <MbtaTooltip
              name={tooltip.name}
              vehicleType={tooltip.vehicleType}
              position={tooltip.position}
              containerWidth={containerSize.w}
              containerHeight={containerSize.h}
            />
          )}
        </DeckGL>
      )}
    </div>
  )
}

// ─── Hex → RGB helper ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}
