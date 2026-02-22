/**
 * Simulation types for POST /api/v1/simulation/run/.
 */

export interface SimulationRequest {
  tract_id: string
  interventions: string[]  // backend action names: add_pantry, add_mobile, extend_hours
}

export interface SimulationSnapshot {
  food_risk_score: number
  equity_score: number
  transit_coverage: number
  food_insecurity_rate: number
  poverty_rate: number
  snap_rate: number
}

export interface SimulationResult {
  tract_id: string
  tract_name: string
  interventions_applied: string[]
  before: SimulationSnapshot
  after: SimulationSnapshot
  delta: {
    food_risk_score: number
    equity_score: number
    transit_coverage: number
  }
  households_reached: number
}
