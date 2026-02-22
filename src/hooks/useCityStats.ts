import { useQuery } from '@tanstack/react-query'
import { fetchCityStats, type CityStats } from '../api/cityStats'
import { cityStats as fallback } from '../data/censusTracts'

/** Fallback city stats (from static data) used while the API is loading. */
const FALLBACK: CityStats = {
  equity_score:     fallback.equityScore,
  transit_coverage: fallback.transitCoverage,
  high_risk_tracts: fallback.highRiskTracts,
  total_tracts:     fallback.totalTracts,
}

/**
 * React Query hook for city-wide aggregate statistics.
 *
 * Returns the static fallback instantly, then replaces it with live data
 * once the API responds.
 */
export function useCityStats() {
  return useQuery({
    queryKey: ['city-stats'],
    queryFn: fetchCityStats,
    placeholderData: FALLBACK,
    staleTime: 5 * 60_000, // 5 minutes
  })
}
