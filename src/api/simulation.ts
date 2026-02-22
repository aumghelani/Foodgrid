/**
 * Simulation API call.
 *
 * Frontend InterventionType values map to backend action names:
 *   'pantry' → 'add_pantry'
 *   'mobile' → 'add_mobile'
 *   'hours'  → 'extend_hours'
 */
import type { InterventionType } from '../types'
import { apiFetch } from './index'

const INTERVENTION_MAP: Record<InterventionType, string> = {
  pantry: 'add_pantry',
  mobile: 'add_mobile',
  hours:  'extend_hours',
}

export interface SimulationScores {
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
  interventions: string[]
  before: SimulationScores
  after: SimulationScores
  delta: {
    food_risk_score: number
    equity_score: number
    transit_coverage: number
  }
  households_reached: number
}

/**
 * Run a policy simulation against a census tract.
 *
 * @param tractId       Backend tract_id (e.g. "25025010100")
 * @param interventions Frontend intervention types to apply
 */
export async function runSimulation(
  tractId: string,
  interventions: InterventionType[],
): Promise<SimulationResult> {
  return apiFetch<SimulationResult>('simulation/run/', {
    method: 'POST',
    body: JSON.stringify({
      tract_id: tractId,
      interventions: interventions.map((i) => INTERVENTION_MAP[i]),
    }),
  })
}
