import { useRef, useCallback } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { TractProperties } from '../../types/map'

export interface MapInteractionHandlers {
  /**
   * Called from DeckGL's onHover with the cursor's canvas pixel position.
   * Queries MapLibre's rendered features at that position and updates
   * hover feature-state for the 'tracts' source.
   *
   * Must be called from DeckGL — NOT wired to MapGL events.
   * When MapGL is a child of DeckGL, MapGL's onMouseMove / onClick do not
   * fire because DeckGL's canvas intercepts all DOM pointer events first.
   */
  onDeckHover: (x: number, y: number) => void

  /**
   * Called from DeckGL's onClick.
   * Queries MapLibre at the click position; if a tract is found,
   * updates selected feature-state and fires onTractSelected.
   */
  onDeckClick: (x: number, y: number) => void

  /**
   * Clears hover state — wire to the map container's onMouseLeave.
   * Required because DeckGL's onHover does not fire when the cursor
   * exits the canvas entirely.
   */
  clearHover: () => void
}

export interface MapInteractionOptions {
  /**
   * Called when a tract is hovered (preview). Null when mouse leaves all tracts.
   * Used to update the government-mode info panel on hover (not just click).
   */
  onHovered?: (properties: TractProperties | null) => void
  /**
   * Cursor state updater from MapView React state. DeckGL reads this in its
   * getCursor callback. Do NOT manipulate canvas.style.cursor directly.
   */
  setCursor?: (cursor: string) => void
}

/**
 * Manages MapLibre feature-state (hover + selected) for census tracts,
 * driven by DeckGL pointer events rather than MapGL event props.
 *
 * WHY DeckGL-based events?
 * When react-map-gl's <Map> is rendered as a child of <DeckGL>, DeckGL's
 * canvas sits on top and captures all DOM pointer events. MapLibre's own
 * canvas never receives raw mousemove / click events, so <Map onMouseMove>
 * and <Map onClick> do not fire. We instead call queryRenderedFeatures()
 * manually using the pixel coordinates from DeckGL's PickingInfo.
 *
 * Cursor is communicated via `setCursor` so DeckGL's getCursor prop can
 * compose it with its own isHovering / isDragging flags.
 *
 * Refs (not state) track hovered/selected IDs — no React re-render on
 * every mouse-move.
 */
export function useMapInteraction(
  mapRef: React.RefObject<MapRef>,
  onSelected: (properties: TractProperties) => void,
  options?: MapInteractionOptions,
): MapInteractionHandlers {
  const hoveredIdRef  = useRef<number | null>(null)
  const selectedIdRef = useRef<number | null>(null)

  const { onHovered, setCursor } = options ?? {}

  // ── Hover ─────────────────────────────────────────────────────────────────

  const onDeckHover = useCallback(
    (x: number, y: number) => {
      const map = mapRef.current?.getMap()
      if (!map || !map.getLayer('tract-fill')) return

      // queryRenderedFeatures with pixel coords from DeckGL PickingInfo.
      // These coords are in the same canvas space as MapLibre's canvas,
      // so the query is accurate even though MapLibre never received the
      // raw DOM mouse event.
      const features = map.queryRenderedFeatures([x, y], { layers: ['tract-fill'] })

      if (!features.length) {
        // Cursor moved off all tracts — clear hover state.
        if (hoveredIdRef.current !== null) {
          map.setFeatureState(
            { source: 'tracts', id: hoveredIdRef.current },
            { hover: false },
          )
          hoveredIdRef.current = null
          onHovered?.(null)
        }
        setCursor?.('default')
        return
      }

      const feature = features[0]
      const newId   = feature.id as number

      // Clear previous tract's hover before setting the new one.
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== newId) {
        map.setFeatureState(
          { source: 'tracts', id: hoveredIdRef.current },
          { hover: false },
        )
      }

      map.setFeatureState({ source: 'tracts', id: newId }, { hover: true })
      hoveredIdRef.current = newId

      // crosshair = "data polygon"; pointer is reserved for resource dots
      // (DeckGL's isHovering flag already handles that via getCursor).
      setCursor?.('crosshair')

      onHovered?.(feature.properties as TractProperties)
    },
    [mapRef, onHovered, setCursor],
  )

  // ── Clear hover (cursor exits map canvas) ─────────────────────────────────

  const clearHover = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    if (hoveredIdRef.current !== null) {
      map.setFeatureState(
        { source: 'tracts', id: hoveredIdRef.current },
        { hover: false },
      )
      hoveredIdRef.current = null
      onHovered?.(null)
    }

    setCursor?.('default')
  }, [mapRef, onHovered, setCursor])

  // ── Click / select ─────────────────────────────────────────────────────────

  const onDeckClick = useCallback(
    (x: number, y: number) => {
      const map = mapRef.current?.getMap()
      if (!map || !map.getLayer('tract-fill')) return

      const features = map.queryRenderedFeatures([x, y], { layers: ['tract-fill'] })
      if (!features.length) return

      const feature   = features[0]
      const clickedId = feature.id as number

      // Clear the previously selected tract.
      if (selectedIdRef.current !== null) {
        map.setFeatureState(
          { source: 'tracts', id: selectedIdRef.current },
          { selected: false },
        )
      }

      map.setFeatureState({ source: 'tracts', id: clickedId }, { selected: true })
      selectedIdRef.current = clickedId

      onSelected(feature.properties as TractProperties)
    },
    [mapRef, onSelected],
  )

  return { onDeckHover, onDeckClick, clearHover }
}
