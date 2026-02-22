/**
 * censusTracts.ts — Real Boston census tract boundaries from TIGER/Line data.
 *
 * BOSTON_TRACTS is built at bundle time from boston_tracts.geojson (generated
 * by backend/scripts/convert_shapefile.py from the MA TIGER/Line shapefile).
 * Each feature gets risk scores from tractRiskScores.ts; tracts not in that
 * lookup receive DEFAULT_TRACT_SCORES so every polygon gets a choropleth color.
 *
 * In components, prefer the hooks over direct imports:
 *   import { useTracts, useCityStats } from '../api/hooks'
 */
import type { TractFeatureCollection, TractFeature } from '../types/map'
import type { Feature, Geometry } from 'geojson'
import rawTracts from './boston_tracts.geojson'
import { TRACT_RISK_SCORES, DEFAULT_TRACT_SCORES } from './tractRiskScores'

/**
 * Generate a deterministic but varied risk score for census tracts that are
 * not in the curated TRACT_RISK_SCORES lookup.
 *
 * Uses the numeric part of the GEOID to spread scores across a realistic
 * Boston distribution (heavy middle, some high and low tails).  The same
 * GEOID always produces the same score (stable across hot-reloads).
 *
 * Distribution shape (approximate):
 *   0.15–0.30  low risk      ~20% of tracts (Beacon Hill, Back Bay, etc.)
 *   0.30–0.50  moderate      ~35%
 *   0.50–0.70  elevated      ~30%
 *   0.70–0.88  high risk     ~15% (food-desert pockets)
 */
function deterministicRisk(geoid: string): number {
  // Mix the last 5 digits to get a 0–99 bucket
  const n   = parseInt(geoid.slice(-5), 10) || 0
  const mix = (n * 1619 + 37 * (n % 97) + 11) % 100
  // Piecewise to create a realistic distribution rather than uniform spread
  if (mix < 20) return 0.15 + (mix / 20) * 0.15        // 0.15–0.30
  if (mix < 55) return 0.30 + ((mix - 20) / 35) * 0.20 // 0.30–0.50
  if (mix < 85) return 0.50 + ((mix - 55) / 30) * 0.20 // 0.50–0.70
  return              0.70 + ((mix - 85) / 15) * 0.18   // 0.70–0.88
}

export const BOSTON_TRACTS: TractFeatureCollection = {
  type: 'FeatureCollection',
  features: (rawTracts.features as Feature<Geometry>[]).map(
    (feature, index): TractFeature => {
      const props     = feature.properties ?? {}
      const geoid     = (props['GEOID'] as string) ?? ''
      const tractce   = (props['TRACTCE'] as string) ?? ''
      const numericId = parseInt(tractce, 10) || index + 1

      const isFeatured = geoid in TRACT_RISK_SCORES
      const baseScores = isFeatured
        ? TRACT_RISK_SCORES[geoid]
        : (() => {
            const risk = deterministicRisk(geoid)
            return {
              ...DEFAULT_TRACT_SCORES,
              food_risk_score:      risk,
              equity_score:         Math.round((0.95 - risk) * 100) / 100,
              transit_coverage:     Math.round((0.55 + (1 - risk) * 0.4) * 100) / 100,
              food_insecurity_rate: Math.round(risk * 0.38 * 100) / 100,
              poverty_rate:         Math.round(risk * 0.44 * 100) / 100,
              snap_rate:            Math.round(risk * 0.50 * 100) / 100,
              vulnerability_index:  Math.round(risk * 0.92 * 100) / 100,
              need_score:           Math.round(risk * 0.95 * 100) / 100,
              supply_score:         Math.round((0.90 - risk * 0.75) * 100) / 100,
            }
          })()

      return {
        ...feature,
        type:     'Feature',
        id:       numericId,
        geometry: feature.geometry as TractFeature['geometry'],
        properties: {
          id:       numericId,
          tract_id: geoid,
          ...baseScores,
          tract_name: isFeatured
            ? baseScores.tract_name
            : (props['NAMELSAD'] as string) ?? `Tract ${tractce}`,
        },
      }
    }
  ),
}

// ── Legacy camelCase exports (kept for backward compatibility) ─────────────────
// GovernmentSidebar and CityStatsBar import these. Do not remove.
export { cityStats } from './cityStats'

/** @deprecated Use the useTracts() hook. BOSTON_TRACTS is the MapLibre-native export. */
export { BOSTON_TRACTS as bostonCensusTracts }

/**
 * Compute a WebGL-ready RGBA color from a 0–1 food risk score.
 * @deprecated New code uses MapLibre fill-color expressions in layers.ts.
 */
export function getRiskColor(score: number): [number, number, number, number] {
  if (score > 0.75) return [239, 68, 68, 190]
  if (score > 0.5)  return [249, 115, 22, 180]
  if (score > 0.35) return [234, 179, 8, 170]
  return [34, 197, 94, 160]
}
