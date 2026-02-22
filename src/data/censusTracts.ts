/**
 * Static fallback data for FoodGrid Boston.
 *
 * BOSTON_TRACTS — used as placeholderData in useTracts() so the map renders
 * immediately. Live data from GET /api/v1/tracts/ replaces it once Django responds.
 *
 * cityStats — used as placeholderData in useCityStats().
 *
 * In components, always use the hooks instead of importing these directly:
 *   import { useTracts, useCityStats } from '../api/hooks'
 */
import type { CensusTracts } from '../types'
import type { TractFeatureCollection } from '../types/map'

// ─── Legacy camelCase export (used by GovernmentSidebar, CityStatsBar) ────────
// Kept for backward compatibility with existing sidebar components.
// New map code should use BOSTON_TRACTS below.

/** @deprecated Use BOSTON_TRACTS for MapLibre-native layer rendering. */
export const bostonCensusTracts: CensusTracts = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.100, 42.318], [-71.075, 42.318], [-71.075, 42.338], [-71.100, 42.338], [-71.100, 42.318]
        ]]
      },
      properties: {
        tractId: 'TRACT_001', tractName: 'Roxbury',
        foodRiskScore: 0.88, equityScore: 0.31, transitCoverage: 0.62,
        foodInsecurityRate: 0.29, povertyRate: 0.34, snapRate: 0.41, population: 28400,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.075, 42.295], [-71.045, 42.295], [-71.045, 42.325], [-71.075, 42.325], [-71.075, 42.295]
        ]]
      },
      properties: {
        tractId: 'TRACT_002', tractName: 'Dorchester',
        foodRiskScore: 0.76, equityScore: 0.38, transitCoverage: 0.71,
        foodInsecurityRate: 0.24, povertyRate: 0.27, snapRate: 0.34, population: 45200,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.110, 42.285], [-71.080, 42.285], [-71.080, 42.315], [-71.110, 42.315], [-71.110, 42.285]
        ]]
      },
      properties: {
        tractId: 'TRACT_003', tractName: 'Mattapan',
        foodRiskScore: 0.82, equityScore: 0.29, transitCoverage: 0.49,
        foodInsecurityRate: 0.31, povertyRate: 0.36, snapRate: 0.44, population: 21600,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.082, 42.338], [-71.055, 42.338], [-71.055, 42.358], [-71.082, 42.358], [-71.082, 42.338]
        ]]
      },
      properties: {
        tractId: 'TRACT_004', tractName: 'South End',
        foodRiskScore: 0.42, equityScore: 0.61, transitCoverage: 0.88,
        foodInsecurityRate: 0.12, povertyRate: 0.14, snapRate: 0.18, population: 34100,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.065, 42.355], [-71.040, 42.355], [-71.040, 42.375], [-71.065, 42.375], [-71.065, 42.355]
        ]]
      },
      properties: {
        tractId: 'TRACT_005', tractName: 'Downtown Boston',
        foodRiskScore: 0.22, equityScore: 0.79, transitCoverage: 0.97,
        foodInsecurityRate: 0.07, povertyRate: 0.09, snapRate: 0.08, population: 18900,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.040, 42.365], [-71.010, 42.365], [-71.010, 42.390], [-71.040, 42.390], [-71.040, 42.365]
        ]]
      },
      properties: {
        tractId: 'TRACT_006', tractName: 'East Boston',
        foodRiskScore: 0.71, equityScore: 0.44, transitCoverage: 0.68,
        foodInsecurityRate: 0.21, povertyRate: 0.23, snapRate: 0.28, population: 44300,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.080, 42.375], [-71.055, 42.375], [-71.055, 42.395], [-71.080, 42.395], [-71.080, 42.375]
        ]]
      },
      properties: {
        tractId: 'TRACT_007', tractName: 'Charlestown',
        foodRiskScore: 0.35, equityScore: 0.67, transitCoverage: 0.84,
        foodInsecurityRate: 0.10, povertyRate: 0.11, snapRate: 0.13, population: 17800,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.115, 42.308], [-71.090, 42.308], [-71.090, 42.330], [-71.115, 42.330], [-71.115, 42.308]
        ]]
      },
      properties: {
        tractId: 'TRACT_008', tractName: 'Jamaica Plain',
        foodRiskScore: 0.48, equityScore: 0.58, transitCoverage: 0.76,
        foodInsecurityRate: 0.15, povertyRate: 0.16, snapRate: 0.19, population: 38200,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.130, 42.265], [-71.095, 42.265], [-71.095, 42.290], [-71.130, 42.290], [-71.130, 42.265]
        ]]
      },
      properties: {
        tractId: 'TRACT_009', tractName: 'Hyde Park',
        foodRiskScore: 0.64, equityScore: 0.47, transitCoverage: 0.54,
        foodInsecurityRate: 0.19, povertyRate: 0.21, snapRate: 0.26, population: 29500,
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.145, 42.335], [-71.115, 42.335], [-71.115, 42.360], [-71.145, 42.360], [-71.145, 42.335]
        ]]
      },
      properties: {
        tractId: 'TRACT_010', tractName: 'Allston-Brighton',
        foodRiskScore: 0.53, equityScore: 0.52, transitCoverage: 0.72,
        foodInsecurityRate: 0.17, povertyRate: 0.19, snapRate: 0.22, population: 51000,
      }
    },
  ]
}

/**
 * Compute a WebGL-ready RGBA color from a 0–1 food risk score.
 * Used by legacy deck.gl layer code paths.
 * @deprecated New code should use MapLibre's fill-color expression in layers.ts.
 */
export function getRiskColor(score: number): [number, number, number, number] {
  if (score > 0.75) return [239, 68, 68, 190]
  if (score > 0.5)  return [249, 115, 22, 180]
  if (score > 0.35) return [234, 179, 8, 170]
  return [34, 197, 94, 160]
}

/** City-wide aggregate statistics displayed in the Government Mode header bar. */
export const cityStats = {
  equityScore: 0.61,
  transitCoverage: 0.73,
  highRiskTracts: 4,
  totalTracts: 10,
}

// ─── MapLibre-native format ───────────────────────────────────────────────────
// Features use numeric top-level IDs (required for setFeatureState) and
// snake_case properties for direct use in MapLibre paint expressions.
//
// Risk tiers:
//   High   (0.75–0.92): Roxbury, Dorchester North & South, Mattapan
//   Med-Hi (0.60–0.74): East Boston, Hyde Park
//   Medium (0.40–0.59): South End, Jamaica Plain
//   Low    (0.15–0.39): Charlestown, Downtown / Financial District

/**
 * GeoJSON FeatureCollection of Boston census tracts, formatted for MapLibre GL JS.
 * Each feature carries a top-level numeric `id` for `setFeatureState` compatibility.
 */
export const BOSTON_TRACTS: TractFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // ── 1. Roxbury ─────────────────────────────────────────────────────────
    {
      id: 1,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.100, 42.318], [-71.075, 42.318],
          [-71.075, 42.338], [-71.100, 42.338],
          [-71.100, 42.318],
        ]],
      },
      properties: {
        id: 1, tract_id: '25025010100', tract_name: 'Roxbury',
        food_risk_score: 0.88, equity_score: 0.31, transit_coverage: 0.62,
        food_insecurity_rate: 0.29, poverty_rate: 0.34, snap_rate: 0.41, population: 28400,
      },
    },
    // ── 2. Dorchester North ────────────────────────────────────────────────
    {
      id: 2,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.075, 42.310], [-71.047, 42.310],
          [-71.047, 42.330], [-71.075, 42.330],
          [-71.075, 42.310],
        ]],
      },
      properties: {
        id: 2, tract_id: '25025010200', tract_name: 'Dorchester North',
        food_risk_score: 0.80, equity_score: 0.36, transit_coverage: 0.69,
        food_insecurity_rate: 0.26, poverty_rate: 0.29, snap_rate: 0.36, population: 31800,
      },
    },
    // ── 3. Dorchester South ────────────────────────────────────────────────
    {
      id: 3,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.075, 42.290], [-71.045, 42.290],
          [-71.045, 42.310], [-71.075, 42.310],
          [-71.075, 42.290],
        ]],
      },
      properties: {
        id: 3, tract_id: '25025010300', tract_name: 'Dorchester South',
        food_risk_score: 0.76, equity_score: 0.38, transit_coverage: 0.71,
        food_insecurity_rate: 0.24, poverty_rate: 0.27, snap_rate: 0.34, population: 38600,
      },
    },
    // ── 4. Mattapan ────────────────────────────────────────────────────────
    {
      id: 4,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.110, 42.277], [-71.080, 42.277],
          [-71.080, 42.297], [-71.110, 42.297],
          [-71.110, 42.277],
        ]],
      },
      properties: {
        id: 4, tract_id: '25025010400', tract_name: 'Mattapan',
        food_risk_score: 0.84, equity_score: 0.29, transit_coverage: 0.49,
        food_insecurity_rate: 0.31, poverty_rate: 0.36, snap_rate: 0.44, population: 21600,
      },
    },
    // ── 5. South End ───────────────────────────────────────────────────────
    {
      id: 5,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.082, 42.338], [-71.055, 42.338],
          [-71.055, 42.355], [-71.082, 42.355],
          [-71.082, 42.338],
        ]],
      },
      properties: {
        id: 5, tract_id: '25025020100', tract_name: 'South End',
        food_risk_score: 0.42, equity_score: 0.61, transit_coverage: 0.88,
        food_insecurity_rate: 0.12, poverty_rate: 0.14, snap_rate: 0.18, population: 34100,
      },
    },
    // ── 6. East Boston ─────────────────────────────────────────────────────
    {
      id: 6,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.040, 42.365], [-71.010, 42.365],
          [-71.010, 42.390], [-71.040, 42.390],
          [-71.040, 42.365],
        ]],
      },
      properties: {
        id: 6, tract_id: '25025020200', tract_name: 'East Boston',
        food_risk_score: 0.70, equity_score: 0.44, transit_coverage: 0.68,
        food_insecurity_rate: 0.21, poverty_rate: 0.23, snap_rate: 0.28, population: 44300,
      },
    },
    // ── 7. Charlestown ─────────────────────────────────────────────────────
    {
      id: 7,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.080, 42.373], [-71.055, 42.373],
          [-71.055, 42.393], [-71.080, 42.393],
          [-71.080, 42.373],
        ]],
      },
      properties: {
        id: 7, tract_id: '25025020300', tract_name: 'Charlestown',
        food_risk_score: 0.32, equity_score: 0.68, transit_coverage: 0.84,
        food_insecurity_rate: 0.09, poverty_rate: 0.10, snap_rate: 0.12, population: 17800,
      },
    },
    // ── 8. Jamaica Plain ───────────────────────────────────────────────────
    {
      id: 8,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.118, 42.305], [-71.090, 42.305],
          [-71.090, 42.328], [-71.118, 42.328],
          [-71.118, 42.305],
        ]],
      },
      properties: {
        id: 8, tract_id: '25025030100', tract_name: 'Jamaica Plain',
        food_risk_score: 0.48, equity_score: 0.58, transit_coverage: 0.76,
        food_insecurity_rate: 0.15, poverty_rate: 0.16, snap_rate: 0.19, population: 38200,
      },
    },
    // ── 9. Hyde Park ───────────────────────────────────────────────────────
    {
      id: 9,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.132, 42.255], [-71.095, 42.255],
          [-71.095, 42.278], [-71.132, 42.278],
          [-71.132, 42.255],
        ]],
      },
      properties: {
        id: 9, tract_id: '25025030200', tract_name: 'Hyde Park',
        food_risk_score: 0.63, equity_score: 0.47, transit_coverage: 0.54,
        food_insecurity_rate: 0.19, poverty_rate: 0.21, snap_rate: 0.26, population: 29500,
      },
    },
    // ── 10. Downtown / Financial District ─────────────────────────────────
    {
      id: 10,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.065, 42.352], [-71.040, 42.352],
          [-71.040, 42.370], [-71.065, 42.370],
          [-71.065, 42.352],
        ]],
      },
      properties: {
        id: 10, tract_id: '25025030300', tract_name: 'Downtown / Financial District',
        food_risk_score: 0.20, equity_score: 0.81, transit_coverage: 0.97,
        food_insecurity_rate: 0.06, poverty_rate: 0.08, snap_rate: 0.07, population: 18900,
      },
    },
  ],
}
