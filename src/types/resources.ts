/**
 * Backend-native food resource shape, matching the Django API response exactly.
 * Components receive this type from useResources() in api/hooks.ts.
 */
export type BackendResourceType = 'pantry' | 'grocery' | 'market' | 'mobile'

export interface BackendFoodResource {
  resource_id: string
  name: string
  type: BackendResourceType
  address: string
  coordinates: [number, number]  // [lng, lat]
  tract_id: string
  snap: boolean
  free: boolean
  hours?: string
  transit_minutes_est?: number
}

/**
 * Frontend resource shape used by ResidentSidebar / ResourceCard.
 * Derived from BackendFoodResource via mapResource() in api/hooks.ts.
 */
export type FrontendResourceType = 'pantry' | 'grocery' | 'farmers_market' | 'mobile'

export interface FrontendFoodResource {
  id: string
  name: string
  type: FrontendResourceType
  address: string
  coordinates: [number, number]
  transitMinutes: number
  tags: string[]
  hours?: string
}
