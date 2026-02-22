/**
 * City-stats API call — returns the city-wide aggregate metrics
 * displayed in the GovernmentSidebar overview and CityStatsBar overlay.
 */
import { apiFetch } from './index'

export interface CityStats {
  equity_score: number
  transit_coverage: number
  high_risk_tracts: number
  total_tracts: number
}

export async function fetchCityStats(): Promise<CityStats> {
  return apiFetch<CityStats>('tracts/stats/')
}
