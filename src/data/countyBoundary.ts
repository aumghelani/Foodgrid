/**
 * countyBoundary.ts — Suffolk County, MA approximate boundary polygon.
 *
 * Derived from the Census TIGER/Line county shapefile for FIPS 25025.
 * Simplified to a coarse polygon sufficient for visual overlay.
 * Used by MapView.tsx in government mode to draw a dashed amber border.
 *
 * Coordinate order: [longitude, latitude] per GeoJSON convention.
 */

import type { GeoJSON } from 'geojson'

export const SUFFOLK_COUNTY_GEOJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    FIPS:    '25025',
    NAME:    'Suffolk County',
    STATE:   'MA',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      // West shore / Charles River mouth
      [-71.1912, 42.3394],
      [-71.1875, 42.3500],
      [-71.1760, 42.3610],
      [-71.1650, 42.3720],
      [-71.1550, 42.3820],
      [-71.1400, 42.3930],
      // Northern boundary (Everett / Chelsea / Revere)
      [-71.1100, 42.4050],
      [-71.0900, 42.4230],
      [-71.0700, 42.4340],
      [-71.0480, 42.4370],
      [-71.0200, 42.4310],
      [-71.0000, 42.4220],
      // East: Winthrop / Boston Harbor
      [-70.9900, 42.3950],
      [-70.9820, 42.3750],
      [-70.9800, 42.3600],
      // South: Dorchester / Mattapan boundary
      [-70.9880, 42.3350],
      [-71.0000, 42.3100],
      [-71.0200, 42.2920],
      [-71.0500, 42.2760],
      [-71.0820, 42.2680],
      [-71.1100, 42.2700],
      // West-south through Hyde Park / Roslindale
      [-71.1300, 42.2780],
      [-71.1450, 42.2890],
      [-71.1550, 42.3000],
      [-71.1680, 42.3120],
      [-71.1780, 42.3220],
      // Back to start
      [-71.1912, 42.3394],
    ]],
  },
}
