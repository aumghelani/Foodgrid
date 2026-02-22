import { useRef, useCallback } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { TractProperties } from '../../types/map'

/**
 * Return type of `useMapInteraction`.
 * Handlers are typed as `MapLayerMouseEvent` because that is exactly what
 * react-map-gl passes to `onMouseMove`, `onClick`, and `onMouseLeave` on the
 * `<Map>` component.  `handleMouseLeave` accepts no arguments because
 * TypeScript allows omitting trailing parameters in callback types.
 */
export interface MapInteractionHandlers {
  /** Wire to <Map onMouseMove={…}> — updates hover feature-state. */
  handleMouseMove: (e: MapLayerMouseEvent) => void
  /** Wire to <Map onMouseLeave={…}> — clears hover state when cursor exits the canvas. */
  handleMouseLeave: () => void
  /** Wire to <Map onClick={…}> — selects a tract and fires onTractSelected. */
  handleClick: (e: MapLayerMouseEvent) => void
}

/**
 * Custom hook that wires MapLibre feature-state (hover + selected) to
 * react-map-gl mouse event props without touching React state.
 *
 * ### Why refs instead of useState?
 * `setFeatureState` is a side-effect that modifies the MapLibre style directly.
 * Storing hoveredId / selectedId in React state would trigger a re-render on
 * every mouse-move, causing visible flicker and unnecessary reconciliation.
 * Refs give us mutable storage that survives re-renders without causing them.
 *
 * ### Why not map.on() inside useEffect?
 * react-map-gl v7 exposes `onMouseMove`, `onClick`, etc. as React props.
 * Using those props keeps event wiring declarative, avoids memory-leak risks
 * from missing cleanup, and plays well with React Strict Mode double-invocation.
 *
 * @param mapRef     - ref attached to the react-map-gl `<Map>` component
 * @param onSelected - callback fired with the clicked tract's properties
 */
export function useMapInteraction(
  mapRef: React.RefObject<MapRef>,
  onSelected: (properties: TractProperties) => void,
): MapInteractionHandlers {
  /**
   * ID of the tract currently under the cursor.
   * Stored as a ref so that updating it never triggers a React re-render.
   */
  const hoveredIdRef = useRef<number | null>(null)

  /**
   * ID of the tract the user has clicked and selected.
   * Kept in a ref for the same reason as hoveredIdRef.
   */
  const selectedIdRef = useRef<number | null>(null)

  // ── Hover ────────────────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap()
      if (!map) return

      if (!map.getLayer('tract-fill')) return

      const features = map.queryRenderedFeatures(e.point, { layers: ['tract-fill'] })

      if (!features.length) {
        // Cursor moved to empty map space — clear hover but keep cursor as-is.
        // Full cursor reset happens in handleMouseLeave (when exiting the canvas).
        if (hoveredIdRef.current !== null) {
          map.setFeatureState(
            { source: 'tracts', id: hoveredIdRef.current },
            { hover: false },
          )
          hoveredIdRef.current = null
        }
        map.getCanvas().style.cursor = ''
        return
      }

      const feature = features[0]
      // feature.id is `string | number | undefined` per MapLibre types.
      // We assert to `number` here because all features in BOSTON_TRACTS carry
      // explicit numeric IDs — no string IDs or auto-generated IDs are used.
      const newId = feature.id as number

      // Clear hover on the previously-hovered tract (if different).
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== newId) {
        map.setFeatureState(
          { source: 'tracts', id: hoveredIdRef.current },
          { hover: false },
        )
      }

      // Apply hover to the tract now under the cursor.
      map.setFeatureState(
        { source: 'tracts', id: newId },
        { hover: true },
      )
      hoveredIdRef.current = newId

      // Show pointer cursor to signal interactivity.
      map.getCanvas().style.cursor = 'pointer'
    },
    [mapRef],
  )

  // ── Mouse-leave (entire canvas) ───────────────────────────────────────────

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    if (hoveredIdRef.current !== null) {
      map.setFeatureState(
        { source: 'tracts', id: hoveredIdRef.current },
        { hover: false },
      )
      hoveredIdRef.current = null
    }

    // Reset cursor to the browser default.
    map.getCanvas().style.cursor = ''
  }, [mapRef])

  // ── Click / select ────────────────────────────────────────────────────────

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap()
      if (!map) return

      if (!map.getLayer('tract-fill')) return
      const features = map.queryRenderedFeatures(e.point, { layers: ['tract-fill'] })
      if (!features.length) return

      const feature = features[0]
      // Same rationale as in handleMouseMove: asserting `number` is safe because
      // all BOSTON_TRACTS features have explicit numeric IDs.
      const clickedId = feature.id as number

      // Deselect the previously selected tract (if any).
      if (selectedIdRef.current !== null) {
        map.setFeatureState(
          { source: 'tracts', id: selectedIdRef.current },
          { selected: false },
        )
      }

      // Apply selected state to the clicked tract.
      map.setFeatureState(
        { source: 'tracts', id: clickedId },
        { selected: true },
      )
      selectedIdRef.current = clickedId

      // feature.properties is `{ [name: string]: any }` in MapLibre's types.
      // We cast to TractProperties because the source is BOSTON_TRACTS, whose
      // properties are fully typed and structurally match TractProperties.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      onSelected(feature.properties as TractProperties)
    },
    [mapRef, onSelected],
  )

  return { handleMouseMove, handleMouseLeave, handleClick }
}
