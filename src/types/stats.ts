/**
 * City-wide aggregate statistics returned by GET /api/v1/tracts/stats/.
 */
export interface CityStats {
  equity_score: number       // 0–1, higher = more equitable
  transit_coverage: number   // 0–1
  high_risk_tracts: number   // count of tracts with food_risk_score > 0.65
  total_tracts: number
}
