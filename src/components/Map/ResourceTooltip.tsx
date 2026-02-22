/**
 * ResourceTooltip.tsx
 *
 * Absolutely-positioned tooltip rendered by MapView when a resource pin
 * or MBTA stop is hovered via deck.gl onHover.
 *
 * - pointer-events: none (never blocks map interaction)
 * - z-index 9999 (above all other overlays)
 * - Viewport-clamped so it never overflows the map container
 * - Renders price dots (●●●○○) for resource pins
 * - Shows hours and phone when available
 * - Renders a simpler chip for MBTA stops
 */

import type { FrontendFoodResource } from '../../types/resources'

// ─── Shared tooltip position ──────────────────────────────────────────────────

export interface TooltipPosition {
  x: number
  y: number
}

// ─── Resource Tooltip ─────────────────────────────────────────────────────────

interface ResourceTooltipProps {
  resource: FrontendFoodResource
  position: TooltipPosition
  distanceKm: number
  containerWidth:  number
  containerHeight: number
}

/**
 * Tooltip shown when hovering a food resource pin.
 */
export function ResourceTooltip({
  resource,
  position,
  distanceKm,
  containerWidth,
  containerHeight,
}: ResourceTooltipProps) {
  // Estimate tooltip size for clamping (px)
  const TW = 240
  const TH = resource.hours || resource.phone ? 120 : 96

  const rawLeft = position.x + 14
  const rawTop  = position.y - TH / 2

  const left = Math.min(Math.max(rawLeft, 4), containerWidth  - TW - 4)
  const top  = Math.min(Math.max(rawTop,  4), containerHeight - TH - 4)

  const filledDots   = resource.priceDots
  const unfilledDots = 5 - filledDots
  const isFree       = resource.priceScore === 0

  return (
    <div
      style={{
        position:      'absolute',
        left,
        top,
        pointerEvents: 'none',
        zIndex:        9999,
        minWidth:      TW,
      }}
      className="rounded-xl border border-[#1e3358] bg-[#0a1628]/95 backdrop-blur-sm shadow-2xl p-3"
    >
      {/* Name + type badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-sans font-semibold text-sm text-white leading-tight line-clamp-2 flex-1">
          {resource.name}
        </p>
        <span
          className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full border"
          style={{
            color:            resource.hexColor,
            backgroundColor:  resource.hexColor + '1a',
            borderColor:      resource.hexColor + '4d',
          }}
        >
          {resource.priceTier}
        </span>
      </div>

      {/* Address */}
      <p className="font-mono text-[10px] text-[#7a93b8] mb-1.5 truncate">
        {resource.address}
      </p>

      {/* Hours — only shown when available */}
      {resource.hours && (
        <p className="font-mono text-[10px] text-emerald-400/80 mb-1.5 truncate">
          {resource.hours}
        </p>
      )}

      {/* Phone — only shown when available */}
      {resource.phone && (
        <p className="font-mono text-[10px] text-[#7a93b8]/70 mb-1.5">
          {resource.phone}
        </p>
      )}

      {/* Price dots row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {isFree ? (
            <span className="font-mono text-[10px] text-emerald-400 font-semibold">
              FREE
            </span>
          ) : (
            <>
              {Array.from({ length: filledDots }).map((_, i) => (
                <span key={`f${i}`} style={{ color: resource.hexColor }} className="text-xs leading-none">
                  ●
                </span>
              ))}
              {Array.from({ length: unfilledDots }).map((_, i) => (
                <span key={`u${i}`} className="text-xs leading-none text-[#1e3358]">
                  ●
                </span>
              ))}
              <span className="ml-1 font-mono text-[10px] text-[#7a93b8]">
                {resource.priceLabel}
              </span>
            </>
          )}
        </div>

        {/* Real-time distance from user location */}
        <span className="font-mono text-[10px] text-emerald-400 ml-auto">
          {distanceKm < 1
            ? `${Math.round(distanceKm * 1000)} m`
            : `${distanceKm.toFixed(1)} km`}
          {' · '}
          {Math.max(1, Math.round(distanceKm / 5 * 60))} min walk
        </span>
      </div>

      {/* Tags */}
      {resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-mono px-1 py-0.5 rounded-full border border-[#1e3358] text-[#7a93b8]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MBTA Stop Tooltip ────────────────────────────────────────────────────────

interface MbtaTooltipProps {
  name:            string
  vehicleType:     string
  position:        TooltipPosition
  containerWidth:  number
  containerHeight: number
}

export function MbtaTooltip({
  name,
  vehicleType,
  position,
  containerWidth,
  containerHeight,
}: MbtaTooltipProps) {
  const TW = 160
  const TH = 44

  const left = Math.min(Math.max(position.x + 14, 4), containerWidth  - TW - 4)
  const top  = Math.min(Math.max(position.y - TH / 2, 4), containerHeight - TH - 4)

  const label = vehicleType === 'light_rail' ? 'Green Line' : 'Rapid Transit'

  return (
    <div
      style={{
        position:      'absolute',
        left,
        top,
        pointerEvents: 'none',
        zIndex:        9999,
        minWidth:      TW,
      }}
      className="rounded-lg border border-red-800/50 bg-[#0a1628]/95 backdrop-blur-sm shadow-xl px-3 py-2"
    >
      <p className="font-sans text-xs text-white font-medium leading-tight">{name}</p>
      <p className="font-mono text-[10px] text-red-400 mt-0.5">{label}</p>
    </div>
  )
}
