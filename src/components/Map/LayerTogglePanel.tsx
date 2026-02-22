/**
 * LayerTogglePanel.tsx
 *
 * Bottom-left collapsible map overlay that lets the user toggle
 * individual food resource layer visibility by StoreCategory.
 *
 * Layout:
 *   [Layers ▲]
 *   ┌─────────────────────────────────┐
 *   │ [•] Convenience   $$$$ ○       │
 *   │ [•] Supermarket   $$$  ●       │
 *   │  …  (7 categories)             │
 *   │ [Show All]  [Hide All]         │
 *   └─────────────────────────────────┘
 */

import { useState } from 'react'
import { Layers, ChevronDown, ChevronUp, Train } from 'lucide-react'
import { useMapStore } from '../../store/useMapStore'
import { PRICE_ORDER, STORE_HIERARCHY } from '../../data/storeHierarchy'
import type { StoreCategory } from '../../types/resources'

export default function LayerTogglePanel() {
  const [open, setOpen] = useState(true)

  const { visibleResourceLayers, toggleResourceLayer, setAllLayersVisible, showMbta, toggleMbta } =
    useMapStore()

  return (
    <div
      className="absolute bottom-8 left-4 z-10 select-none"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-xl bg-[#0a1628]/90 border border-[#1e3358] backdrop-blur-sm text-[#7a93b8] hover:text-white transition-colors duration-150"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-widest">Layers</span>
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )}
      </button>

      {/* Expandable body */}
      {open && (
        <div className="rounded-b-xl rounded-tr-xl bg-[#0a1628]/90 border border-t-0 border-[#1e3358] backdrop-blur-sm p-3 w-52">
          <div className="flex flex-col gap-1.5 mb-3">
            {(PRICE_ORDER as StoreCategory[]).map((cat) => {
              const tier    = STORE_HIERARCHY[cat]
              const visible = visibleResourceLayers.has(cat)

              return (
                <label
                  key={cat}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  {/* Color dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity duration-150"
                    style={{
                      backgroundColor: tier.hexColor,
                      opacity: visible ? 1 : 0.25,
                    }}
                  />

                  {/* Label */}
                  <span
                    className={`flex-1 font-sans text-xs transition-colors duration-150 ${
                      visible ? 'text-white' : 'text-[#7a93b8]/50'
                    }`}
                  >
                    {tier.shortLabel}
                  </span>

                  {/* Price label */}
                  <span className="font-mono text-[10px] text-[#7a93b8]/60 w-8 text-right">
                    {tier.priceLabel || 'Free'}
                  </span>

                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleResourceLayer(cat)}
                    aria-label={`Toggle ${tier.label}`}
                    className={`relative w-8 h-4 rounded-full border transition-all duration-200 flex-shrink-0 ${
                      visible
                        ? 'border-transparent'
                        : 'bg-[#1e3358] border-[#1e3358]'
                    }`}
                    style={{
                      backgroundColor: visible ? tier.hexColor + 'cc' : undefined,
                    }}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        visible ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              )
            })}
          </div>

          {/* MBTA stops row */}
          <div className="border-t border-[#1e3358] pt-2 mt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <Train
                className="w-2.5 h-2.5 flex-shrink-0 transition-opacity duration-150"
                style={{ color: '#da291c', opacity: showMbta ? 1 : 0.3 }}
              />
              <span className={`flex-1 font-sans text-xs transition-colors duration-150 ${showMbta ? 'text-white' : 'text-[#7a93b8]/50'}`}>
                T Stops
              </span>
              <span className="font-mono text-[10px] text-[#7a93b8]/60 w-8 text-right" />
              <button
                onClick={toggleMbta}
                aria-label="Toggle MBTA stops"
                className={`relative w-8 h-4 rounded-full border transition-all duration-200 flex-shrink-0 ${
                  showMbta ? 'border-transparent' : 'bg-[#1e3358] border-[#1e3358]'
                }`}
                style={{ backgroundColor: showMbta ? '#da291ccc' : undefined }}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    showMbta ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Show All / Hide All */}
          <div className="flex gap-2 border-t border-[#1e3358] pt-2">
            <button
              onClick={() => setAllLayersVisible(true)}
              className="flex-1 py-1 rounded text-[10px] font-mono text-[#7a93b8] hover:text-white border border-[#1e3358] hover:border-[#7a93b8] transition-colors duration-150"
            >
              Show All
            </button>
            <button
              onClick={() => setAllLayersVisible(false)}
              className="flex-1 py-1 rounded text-[10px] font-mono text-[#7a93b8] hover:text-white border border-[#1e3358] hover:border-[#7a93b8] transition-colors duration-150"
            >
              Hide All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
