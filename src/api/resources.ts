/**
 * Food-resource API calls.
 *
 * The backend uses `type: 'market'`; the frontend uses `'farmers_market'`.
 * This module normalises the mapping in both directions so the rest of
 * the app never sees the backend's internal type label.
 */
import type { FoodResource, ResourceFilter, ServiceFilter } from '../types'
import { apiFetch } from './index'

// ── Backend response shape ─────────────────────────────────────────────────

interface ApiResource {
  resource_id: string
  name: string
  type: string
  address: string
  coordinates: [number, number] | null
  snap: boolean | null
  free: boolean | null
  transit_minutes_est?: number
  hours?: string
  tract_id?: string
}

interface ApiResourceList {
  count: number
  results: ApiResource[]
}

// ── Type mapping ───────────────────────────────────────────────────────────

/** Convert backend 'market' → frontend 'farmers_market'. */
function mapType(apiType: string): FoodResource['type'] {
  if (apiType === 'market') return 'farmers_market'
  return apiType as FoodResource['type']
}

/** Convert frontend 'farmers_market' → backend 'market' for query params. */
function backendType(frontendType: ResourceFilter): string {
  if (frontendType === 'farmers_market') return 'market'
  return frontendType
}

function mapResource(r: ApiResource): FoodResource {
  const tags: FoodResource['tags'] = []
  if (r.snap) tags.push('SNAP')
  if (r.free) tags.push('Free')

  return {
    id: r.resource_id,
    name: r.name,
    type: mapType(r.type),
    address: r.address ?? '',
    coordinates: r.coordinates ?? [0, 0],
    transitMinutes: r.transit_minutes_est ?? 30,
    tags,
    hours: r.hours,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface ResourceParams {
  types?: ResourceFilter[]
  serviceFilters?: ServiceFilter[]
  /** User latitude — enables distance-based sorting and travel-time labels. */
  lat?: number
  lng?: number
  maxMinutes?: number
}

/**
 * Fetch filtered food resources from the API.
 *
 * When lat/lng are provided, the backend sorts results by estimated transit
 * time and adds `transit_minutes_est` to each record.
 * Without lat/lng, results are returned alphabetically.
 */
export async function fetchResources(params: ResourceParams = {}): Promise<FoodResource[]> {
  const qs = new URLSearchParams()

  for (const t of params.types ?? []) {
    qs.append('type', backendType(t))
  }

  if (params.serviceFilters?.includes('snap')) qs.set('snap', 'true')
  if (params.serviceFilters?.includes('free')) qs.set('free', 'true')
  if (params.serviceFilters?.includes('open_now')) qs.set('open_now', 'true')

  if (params.lat !== undefined && params.lng !== undefined) {
    qs.set('lat', String(params.lat))
    qs.set('lng', String(params.lng))
    qs.set('max_minutes', String(params.maxMinutes ?? 60))
  }

  const data = await apiFetch<ApiResourceList>(`resources/?${qs.toString()}`)
  return data.results.map(mapResource)
}
