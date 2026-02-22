import type { CensusTracts } from '../types'

// Simplified Boston census tract polygons (representative, not exact boundaries)
// Each polygon represents a major neighborhood.
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
        tractId: 'TRACT_001',
        tractName: 'Roxbury',
        foodRiskScore: 0.88,
        equityScore: 0.31,
        transitCoverage: 0.62,
        foodInsecurityRate: 0.29,
        povertyRate: 0.34,
        snapRate: 0.41,
        population: 28400,
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
        tractId: 'TRACT_002',
        tractName: 'Dorchester',
        foodRiskScore: 0.76,
        equityScore: 0.38,
        transitCoverage: 0.71,
        foodInsecurityRate: 0.24,
        povertyRate: 0.27,
        snapRate: 0.34,
        population: 45200,
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
        tractId: 'TRACT_003',
        tractName: 'Mattapan',
        foodRiskScore: 0.82,
        equityScore: 0.29,
        transitCoverage: 0.49,
        foodInsecurityRate: 0.31,
        povertyRate: 0.36,
        snapRate: 0.44,
        population: 21600,
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
        tractId: 'TRACT_004',
        tractName: 'South End',
        foodRiskScore: 0.42,
        equityScore: 0.61,
        transitCoverage: 0.88,
        foodInsecurityRate: 0.12,
        povertyRate: 0.14,
        snapRate: 0.18,
        population: 34100,
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
        tractId: 'TRACT_005',
        tractName: 'Downtown Boston',
        foodRiskScore: 0.22,
        equityScore: 0.79,
        transitCoverage: 0.97,
        foodInsecurityRate: 0.07,
        povertyRate: 0.09,
        snapRate: 0.08,
        population: 18900,
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
        tractId: 'TRACT_006',
        tractName: 'East Boston',
        foodRiskScore: 0.71,
        equityScore: 0.44,
        transitCoverage: 0.68,
        foodInsecurityRate: 0.21,
        povertyRate: 0.23,
        snapRate: 0.28,
        population: 44300,
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
        tractId: 'TRACT_007',
        tractName: 'Charlestown',
        foodRiskScore: 0.35,
        equityScore: 0.67,
        transitCoverage: 0.84,
        foodInsecurityRate: 0.10,
        povertyRate: 0.11,
        snapRate: 0.13,
        population: 17800,
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
        tractId: 'TRACT_008',
        tractName: 'Jamaica Plain',
        foodRiskScore: 0.48,
        equityScore: 0.58,
        transitCoverage: 0.76,
        foodInsecurityRate: 0.15,
        povertyRate: 0.16,
        snapRate: 0.19,
        population: 38200,
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
        tractId: 'TRACT_009',
        tractName: 'Hyde Park',
        foodRiskScore: 0.64,
        equityScore: 0.47,
        transitCoverage: 0.54,
        foodInsecurityRate: 0.19,
        povertyRate: 0.21,
        snapRate: 0.26,
        population: 29500,
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
        tractId: 'TRACT_010',
        tractName: 'Allston-Brighton',
        foodRiskScore: 0.53,
        equityScore: 0.52,
        transitCoverage: 0.72,
        foodInsecurityRate: 0.17,
        povertyRate: 0.19,
        snapRate: 0.22,
        population: 51000,
      }
    },
  ]
}

// Compute a risk color (RGBA) from a 0–1 food risk score
export function getRiskColor(score: number): [number, number, number, number] {
  if (score > 0.75) return [239, 68, 68, 190]    // red
  if (score > 0.5)  return [249, 115, 22, 180]   // orange
  if (score > 0.35) return [234, 179, 8, 170]    // yellow
  return [34, 197, 94, 160]                       // green
}

// City-wide aggregate stats
export const cityStats = {
  equityScore: 0.61,
  transitCoverage: 0.73,
  highRiskTracts: 4,
  totalTracts: 10,
}
