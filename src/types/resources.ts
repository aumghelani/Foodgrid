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
  phone?: string
  transit_minutes_est?: number
  // Enriched by backend store_hierarchy
  category?:    string
  price_score?: number
  price_tier?:  string
  price_label?: string
  price_dots?:  number
  hex_color?:   string
}

/**
 * Frontend resource shape used by ResidentSidebar / ResourceCard and MapView.
 * Derived from BackendFoodResource via mapResource() in api/hooks.ts.
 */
export type FrontendResourceType = 'pantry' | 'grocery' | 'farmers_market' | 'mobile'

/** StoreCategory — mirrors src/data/storeHierarchy.ts */
export type StoreCategory =
  | 'convenience'
  | 'supermarket'
  | 'grocery'
  | 'wholesale'
  | 'farmersmarket'
  | 'pantry'
  | 'mobile'

export interface FrontendFoodResource {
  id: string
  name: string
  type: FrontendResourceType
  address: string
  coordinates: [number, number]
  transitMinutes: number
  tags: string[]
  hours?: string
  phone?: string
  // Store hierarchy enrichment
  category:   StoreCategory
  priceScore: number
  priceTier:  string
  priceLabel: string
  priceDots:  number
  hexColor:   string
}
