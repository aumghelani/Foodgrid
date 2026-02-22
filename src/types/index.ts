// ─── App Mode ────────────────────────────────────────────────────────────────
export type AppMode = 'resident' | 'government'

// ─── Food Resource (Resident Mode) ────────────────────────────────────────────
export type ResourceType = 'pantry' | 'grocery' | 'farmers_market' | 'mobile'

export interface FoodResource {
  id: string
  name: string
  type: ResourceType
  address: string
  coordinates: [number, number] // [lng, lat]
  transitMinutes: number
  tags: Array<'SNAP' | 'Open Now' | 'Free' | 'WIC' | 'EBT'>
  hours?: string
}

// ─── Census Tract (Government Mode) ──────────────────────────────────────────
export interface TractProperties {
  tractId: string
  tractName: string
  foodRiskScore: number    // 0–1, higher = worse
  equityScore: number      // 0–1, higher = better
  transitCoverage: number  // 0–1
  foodInsecurityRate: number // 0–1
  povertyRate: number      // 0–1
  snapRate: number         // 0–1
  population: number
}

export interface CensusTract {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  properties: TractProperties
}

export interface CensusTracts {
  type: 'FeatureCollection'
  features: CensusTract[]
}

// ─── Intervention Simulation ───────────────────────────────────────────────
export type InterventionType = 'pantry' | 'mobile' | 'hours'

export interface InterventionResult {
  type: InterventionType
  label: string
  beforeScore: number
  afterScore: number
  householdsReached: number
  equityDelta: number
  transitDelta: number
}

// ─── AI Explanation ────────────────────────────────────────────────────────
export interface AiExplanation {
  tractId: string
  text: string
  confidence: number
}

// ─── Filter State ──────────────────────────────────────────────────────────
export type ResourceFilter = 'pantry' | 'grocery' | 'farmers_market' | 'mobile'
export type ServiceFilter = 'open_now' | 'snap' | 'free'
