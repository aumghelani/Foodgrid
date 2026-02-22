/**
 * Consolidated React Query hooks for all FoodGrid Boston API calls.
 *
 * All hooks handle loading / error states. Components should always render
 * a skeleton when `isLoading` is true and an error UI when `isError` is true.
 *
 * Import from here instead of the individual hook files:
 *   import { useResources, useCityStats, useTracts, useRunSimulation } from '../api/hooks'
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiFetch } from './client'
import { BOSTON_TRACTS, cityStats as staticCityStats } from '../data/censusTracts'
import type { TractFeatureCollection } from '../types/map'
import type { FrontendFoodResource, BackendFoodResource, BackendResourceType, FrontendResourceType } from '../types/resources'
import type { CityStats } from '../types/stats'
import type { SimulationResult } from '../types/simulation'
import type { InterventionType } from '../types'

// ─── Resource mapping ─────────────────────────────────────────────────────────

/** Map backend type values to frontend type values. */
const TYPE_MAP: Record<BackendResourceType, FrontendResourceType> = {
  pantry:  'pantry',
  grocery: 'grocery',
  market:  'farmers_market',
  mobile:  'mobile',
}

/** Map backend action names to frontend InterventionType values. */
const INTERVENTION_MAP: Record<InterventionType, string> = {
  pantry: 'add_pantry',
  mobile: 'add_mobile',
  hours:  'extend_hours',
}

function mapResource(r: BackendFoodResource): FrontendFoodResource {
  const tags: string[] = []
  if (r.snap) tags.push('SNAP', 'EBT')
  if (r.free) tags.push('Free')

  return {
    id:             r.resource_id,
    name:           r.name,
    type:           TYPE_MAP[r.type] ?? 'pantry',
    address:        r.address,
    coordinates:    r.coordinates,
    transitMinutes: r.transit_minutes_est ?? 30,
    tags,
    hours:          r.hours,
  }
}

// ─── Filter param helpers ─────────────────────────────────────────────────────

export interface ResourceParams {
  types?:          string[]
  serviceFilters?: string[]
  lat?:            number
  lng?:            number
  maxMinutes?:     number
  tractId?:        string
}

function buildResourceQuery(params: ResourceParams): string {
  const q = new URLSearchParams()
  params.types?.forEach((t) => {
    // Map frontend farmers_market → backend market
    q.append('type', t === 'farmers_market' ? 'market' : t)
  })
  if (params.serviceFilters?.includes('snap'))     q.set('snap', 'true')
  if (params.serviceFilters?.includes('free'))     q.set('free', 'true')
  if (params.serviceFilters?.includes('open_now')) q.set('open_now', 'true')
  if (params.lat != null)       q.set('lat', String(params.lat))
  if (params.lng != null)       q.set('lng', String(params.lng))
  if (params.maxMinutes != null) q.set('max_minutes', String(params.maxMinutes))
  if (params.tractId)           q.set('tract_id', params.tractId)
  const qs = q.toString()
  return qs ? `resources/?${qs}` : 'resources/'
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Food resources with filtering. Falls back to [] while loading or on error.
 */
export function useResources(params: ResourceParams) {
  return useQuery<FrontendFoodResource[]>({
    queryKey:       ['resources', params],
    queryFn:        async () => {
      const data = await apiFetch<{ count: number; results: BackendFoodResource[] }>(
        buildResourceQuery(params)
      )
      return data.results.map(mapResource)
    },
    placeholderData: [],
    staleTime:       60_000,
  })
}

/**
 * All census tracts as GeoJSON FeatureCollection.
 * Falls back to static BOSTON_TRACTS while loading or on error.
 */
export function useTracts() {
  return useQuery<TractFeatureCollection>({
    queryKey:        ['tracts'],
    queryFn:         () => apiFetch<TractFeatureCollection>('tracts/'),
    placeholderData: BOSTON_TRACTS,
    staleTime:       5 * 60_000,
  })
}

/**
 * City-wide aggregate statistics.
 * Falls back to static cityStats while loading or on error.
 */
export function useCityStats() {
  return useQuery<CityStats>({
    queryKey: ['city-stats'],
    queryFn:  () => apiFetch<CityStats>('tracts/stats/'),
    placeholderData: {
      equity_score:     staticCityStats.equityScore,
      transit_coverage: staticCityStats.transitCoverage,
      high_risk_tracts: staticCityStats.highRiskTracts,
      total_tracts:     staticCityStats.totalTracts,
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * Policy simulation mutation.
 *
 * Usage:
 *   const sim = useRunSimulation()
 *   sim.mutate({ tractId: '25025010100', interventions: ['pantry', 'mobile'] })
 */
export function useRunSimulation() {
  return useMutation<
    SimulationResult,
    Error,
    { tractId: string; interventions: InterventionType[] }
  >({
    mutationFn: ({ tractId, interventions }) =>
      apiFetch<SimulationResult>('simulation/run/', {
        method: 'POST',
        body: JSON.stringify({
          tract_id:      tractId,
          interventions: interventions.map((i) => INTERVENTION_MAP[i]),
        }),
      }),
  })
}
