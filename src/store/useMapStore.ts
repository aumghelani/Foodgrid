import { create } from 'zustand'
import type { AppMode, ResourceFilter, ServiceFilter, InterventionType } from '../types'
import type { TractProperties } from '../types/map'
import type { StoreCategory } from '../types/resources'
import { PRICE_ORDER } from '../data/storeHierarchy'

// ─── Default user location ─────────────────────────────────────────────────────

export const DEFAULT_USER_LOCATION = {
  address: '665 Commonwealth Ave, Brookline, MA',
  lat:      42.35041642440795,
  lng:     -71.10325156153239,
} as const

// ─── Store interface ───────────────────────────────────────────────────────────

interface MapStore {
  // Mode
  mode: AppMode
  setMode: (mode: AppMode) => void

  // Selected census tract (government mode — locked on click)
  selectedTract: TractProperties | null
  setSelectedTract: (tract: TractProperties | null) => void

  // Hovered census tract (government mode — preview on mouse-over)
  hoveredTract: TractProperties | null
  setHoveredTract: (tract: TractProperties | null) => void

  // User location (resident mode)
  userLat:     number
  userLng:     number
  userAddress: string
  setUserLocation: (lat: number, lng: number, address: string) => void

  // Resident mode filters
  activeResourceFilters: ResourceFilter[]
  toggleResourceFilter: (filter: ResourceFilter) => void

  activeServiceFilters: ServiceFilter[]
  toggleServiceFilter: (filter: ServiceFilter) => void

  // Travel time limit (minutes)
  travelTimeLimit: number
  setTravelTimeLimit: (minutes: number) => void

  // Priority slider: 0–100 where 0 = cost-only, 100 = time-only.
  // Defaults to 50 (balanced). Sent to backend as time_weight / cost_weight.
  timeWeight: number
  setTimeWeight: (weight: number) => void

  // Visible map resource layers (by StoreCategory)
  visibleResourceLayers: Set<StoreCategory>
  toggleResourceLayer: (cat: StoreCategory) => void
  setAllLayersVisible: (visible: boolean) => void

  // MBTA stop layer visibility (off by default — declutters the map)
  showMbta: boolean
  toggleMbta: () => void

  // Interventions applied in simulate tab
  appliedInterventions: InterventionType[]
  toggleIntervention: (type: InterventionType) => void
  clearInterventions: () => void
}

// ─── Store implementation ──────────────────────────────────────────────────────

export const useMapStore = create<MapStore>((set) => ({
  mode: 'resident',
  setMode: (mode) => set({ mode, selectedTract: null }),

  selectedTract: null,
  setSelectedTract: (tract) => set({ selectedTract: tract }),

  hoveredTract: null,
  setHoveredTract: (tract) => set({ hoveredTract: tract }),

  userLat:     DEFAULT_USER_LOCATION.lat,
  userLng:     DEFAULT_USER_LOCATION.lng,
  userAddress: DEFAULT_USER_LOCATION.address,
  setUserLocation: (lat, lng, address) => set({ userLat: lat, userLng: lng, userAddress: address }),

  activeResourceFilters: ['pantry', 'grocery', 'farmers_market', 'mobile'],
  toggleResourceFilter: (filter) =>
    set((state) => ({
      activeResourceFilters: state.activeResourceFilters.includes(filter)
        ? state.activeResourceFilters.filter((f) => f !== filter)
        : [...state.activeResourceFilters, filter],
    })),

  activeServiceFilters: [],
  toggleServiceFilter: (filter) =>
    set((state) => ({
      activeServiceFilters: state.activeServiceFilters.includes(filter)
        ? state.activeServiceFilters.filter((f) => f !== filter)
        : [...state.activeServiceFilters, filter],
    })),

  travelTimeLimit: 30,
  setTravelTimeLimit: (minutes) => set({ travelTimeLimit: minutes }),

  timeWeight: 50,
  setTimeWeight: (weight) => set({ timeWeight: weight }),

  visibleResourceLayers: new Set<StoreCategory>(PRICE_ORDER as StoreCategory[]),
  toggleResourceLayer: (cat) =>
    set((state) => {
      const next = new Set(state.visibleResourceLayers)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return { visibleResourceLayers: next }
    }),
  setAllLayersVisible: (visible) =>
    set({
      visibleResourceLayers: visible
        ? new Set<StoreCategory>(PRICE_ORDER as StoreCategory[])
        : new Set<StoreCategory>(),
    }),

  showMbta: false,
  toggleMbta: () => set((state) => ({ showMbta: !state.showMbta })),

  appliedInterventions: [],
  toggleIntervention: (type) =>
    set((state) => ({
      appliedInterventions: state.appliedInterventions.includes(type)
        ? state.appliedInterventions.filter((i) => i !== type)
        : [...state.appliedInterventions, type],
    })),
  clearInterventions: () => set({ appliedInterventions: [] }),
}))
