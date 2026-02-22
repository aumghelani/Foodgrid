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
import type { TractFeatureCollection, TractProperties, TractDetail } from '../types/map'
import type { FrontendFoodResource, BackendFoodResource, BackendResourceType, FrontendResourceType, StoreCategory } from '../types/resources'
import { classifyStoreType, getChainPriceScore, STORE_HIERARCHY } from '../data/storeHierarchy'
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

  // Resolve store category — prefer backend-enriched value, fall back to client-side
  const category: StoreCategory = (r.category as StoreCategory | undefined)
    ?? classifyStoreType(r.type, r.name)
  const tier = STORE_HIERARCHY[category]

  // Allow chain-level price score override; use backend value if present
  const chainScore = getChainPriceScore(r.name)
  const priceScore =
    r.price_score != null
      ? r.price_score
      : chainScore ?? tier.priceScore

  return {
    id:             r.resource_id,
    name:           r.name,
    type:           TYPE_MAP[r.type] ?? 'pantry',
    address:        r.address,
    coordinates:    r.coordinates,
    transitMinutes: r.transit_minutes_est ?? 30,
    tags,
    hours:          r.hours,
    phone:          r.phone,
    category,
    priceScore,
    priceTier:  r.price_tier  ?? tier.priceTier,
    priceLabel: r.price_label ?? tier.priceLabel,
    priceDots:  r.price_dots  ?? tier.priceDots,
    hexColor:   r.hex_color   ?? tier.hexColor,
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
  /** 0–100 priority weight for transit time (default 50) */
  timeWeight?:     number
  /** 0–100 priority weight for cost (default 50) */
  costWeight?:     number
}

function buildResourceQuery(params: ResourceParams): string {
  const q = new URLSearchParams()
  params.types?.forEach((t) => {
    q.append('type', t === 'farmers_market' ? 'market' : t)
  })
  if (params.serviceFilters?.includes('snap'))     q.set('snap', 'true')
  if (params.serviceFilters?.includes('free'))     q.set('free', 'true')
  if (params.serviceFilters?.includes('open_now')) q.set('open_now', 'true')
  if (params.lat != null)        q.set('lat', String(params.lat))
  if (params.lng != null)        q.set('lng', String(params.lng))
  if (params.maxMinutes != null) q.set('max_minutes', String(params.maxMinutes))
  if (params.tractId)            q.set('tract_id', params.tractId)
  if (params.timeWeight != null) q.set('time_weight', String(params.timeWeight))
  if (params.costWeight != null) q.set('cost_weight', String(params.costWeight))
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
 * All food resources without any filtering — used for map pins.
 * Returns coordinates as [lng, lat] per GeoJSON convention.
 */
export function useAllResources() {
  return useQuery<FrontendFoodResource[]>({
    queryKey:       ['resources', 'all'],
    queryFn:        async () => {
      const data = await apiFetch<{ count: number; results: BackendFoodResource[] }>('resources/?all=true')
      return data.results.map(mapResource)
    },
    placeholderData: [],
    staleTime:       600_000,
    gcTime:          900_000,
  })
}

/**
 * All census tracts as a GeoJSON FeatureCollection.
 *
 * BOSTON_TRACTS (from the TIGER/Line shapefile) is the authoritative source of
 * geometry — the backend's geometry may differ. We always keep the static
 * geometry and overlay live risk-score properties from the backend API when a
 * matching tract_id is found.
 */
export function useTracts() {
  return useQuery<TractFeatureCollection>({
    queryKey: ['tracts'],
    queryFn: async () => {
      const apiData = await apiFetch<TractFeatureCollection>('tracts/')
      const liveByTractId = new Map<string, TractProperties>(
        apiData.features.map((f) => [f.properties.tract_id, f.properties])
      )
      return {
        ...BOSTON_TRACTS,
        features: BOSTON_TRACTS.features.map((f) => {
          const live = liveByTractId.get(f.properties.tract_id)
          return live ? { ...f, properties: { ...f.properties, ...live } } : f
        }),
      }
    },
    placeholderData: BOSTON_TRACTS,
    staleTime: 5 * 60_000,
  })
}

/**
 * Single tract detail including equity component breakdown.
 * Only fetches when tractId is provided.
 */
export function useTractDetail(tractId: string | null | undefined) {
  return useQuery<TractDetail>({
    queryKey: ['tract-detail', tractId],
    queryFn:  () => apiFetch<TractDetail>(`tracts/${tractId}/`),
    enabled:  !!tractId,
    staleTime: 2 * 60_000,
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

// ─── County Scores ────────────────────────────────────────────────────────────

export interface CountyScores {
  county_fips:        string
  county_name:        string
  tract_count:        number
  avg_equity_score:   number
  avg_food_risk:      number
  high_risk_count:    number
  lila_count:         number
  avg_mhhinc:         number
  avg_transit_coverage: number
}

/**
 * Suffolk County aggregate scores computed by MongoDB aggregation pipeline.
 */
export function useCountyScores() {
  return useQuery<CountyScores[]>({
    queryKey:  ['county-scores'],
    queryFn:   () => apiFetch<CountyScores[]>('tracts/county-scores/'),
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
