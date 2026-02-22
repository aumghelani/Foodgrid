import type * as GeoJSON from 'geojson'

/**
 * Properties stored on each Boston census tract GeoJSON feature.
 *
 * snake_case matches the data-pipeline convention and enables direct use in
 * MapLibre style expressions like `['get', 'food_risk_score']` without any
 * key transformation step.
 */
export interface TractProperties {
  /** Numeric ID mirrored in properties for expression access via `['get', 'id']`. */
  id: number
  /** Backend FIPS tract_id (e.g. "25025010100") — used for API calls. */
  tract_id: string
  tract_name: string
  /** 0.0–1.0. Higher values indicate worse food access conditions. */
  food_risk_score: number
  /** 0.0–1.0. Higher values indicate greater food-system equity. */
  equity_score: number
  /** Fraction of residents with MBTA access to a grocery store within 30 min. */
  transit_coverage: number
  /** Fraction of residents experiencing food insecurity (0.0–1.0). */
  food_insecurity_rate: number
  /** Fraction of residents below the federal poverty line (0.0–1.0). */
  poverty_rate: number
  /** Fraction of households receiving SNAP benefits (0.0–1.0). */
  snap_rate: number
  population: number
  /** Composite vulnerability index (0.0–1.0). Higher = more vulnerable. */
  vulnerability_index: number
  /** Composite food need score (0.0–1.0). Higher = greater unmet need. */
  need_score: number
  /** Food supply adequacy score (0.0–1.0). Higher = better supply. */
  supply_score: number
  /** Median household income (dollars). 0 when not yet ingested. */
  mhhinc: number
  /** USDA LILA (food desert) classification flag. 1 = LILA tract. */
  lila_flag: number
}

/** Per-component breakdown of the 5-factor equity score. */
export interface EquityComponents {
  need:        number   // 35% weight — food insecurity rate
  income_gap:  number   // 20% weight — inverse normalised income
  food_burden: number   // 15% weight — food spend / income ratio
  access:      number   // 20% weight — LILA + transit inverse
  resource:    number   // 10% weight — inverse supply density
}

/** Full tract detail response from /api/v1/tracts/<id>/ */
export interface TractDetail {
  tract:             TractProperties
  resources:         import('../types/resources').BackendFoodResource[]
  equity_components: EquityComponents
  ai_explanation:    string | null
}

/**
 * A single Boston census tract GeoJSON feature.
 *
 * The top-level numeric `id` (separate from `properties.id`) is required by
 * MapLibre's `setFeatureState` API. It must be present at the feature level—
 * not only inside `properties`—for hover and selection state to work.
 */
export interface TractFeature
  extends GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, TractProperties> {
  /** Numeric feature ID used by MapLibre's `setFeatureState`. */
  id: number
}

/**
 * GeoJSON FeatureCollection of Boston census tract polygons.
 * Enforces numeric feature IDs on every member feature.
 */
export interface TractFeatureCollection
  extends GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, TractProperties> {
  features: TractFeature[]
}

/**
 * Props accepted by the MapView component.
 *
 * `onTractSelected` and `selectedTractId` are intentionally optional so the
 * component can be rendered in read-only contexts (e.g. preview thumbnails)
 * without requiring parent state management.
 */
export interface MapViewProps {
  /** Determines which layer configuration is rendered. */
  mode: 'resident' | 'government'
  /**
   * Called when the user clicks a census tract polygon in government mode.
   * Receives the raw GeoJSON properties of the clicked tract.
   */
  onTractSelected?: (properties: TractProperties) => void
  /**
   * Numeric ID of the currently selected tract for controlled-state sync.
   * If provided, the map will reflect this selection on mount and when it
   * changes — useful when selection is driven by sidebar interactions.
   */
  selectedTractId?: number | null
}
