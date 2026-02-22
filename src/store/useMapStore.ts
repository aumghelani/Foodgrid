import { create } from 'zustand'
import type { AppMode, ResourceFilter, ServiceFilter, InterventionType } from '../types'
import type { TractProperties } from '../types/map'

interface MapStore {
  // Mode
  mode: AppMode
  setMode: (mode: AppMode) => void

  // Selected census tract (government mode)
  selectedTract: TractProperties | null
  setSelectedTract: (tract: TractProperties | null) => void

  // Resident mode filters
  activeResourceFilters: ResourceFilter[]
  toggleResourceFilter: (filter: ResourceFilter) => void

  activeServiceFilters: ServiceFilter[]
  toggleServiceFilter: (filter: ServiceFilter) => void

  // Travel time limit (minutes)
  travelTimeLimit: number
  setTravelTimeLimit: (minutes: number) => void

  // Interventions applied in simulate tab
  appliedInterventions: InterventionType[]
  toggleIntervention: (type: InterventionType) => void
  clearInterventions: () => void
}

export const useMapStore = create<MapStore>((set) => ({
  mode: 'resident',
  setMode: (mode) => set({ mode, selectedTract: null }),

  selectedTract: null,
  setSelectedTract: (tract) => set({ selectedTract: tract }),

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

  appliedInterventions: [],
  toggleIntervention: (type) =>
    set((state) => ({
      appliedInterventions: state.appliedInterventions.includes(type)
        ? state.appliedInterventions.filter((i) => i !== type)
        : [...state.appliedInterventions, type],
    })),
  clearInterventions: () => set({ appliedInterventions: [] }),
}))
