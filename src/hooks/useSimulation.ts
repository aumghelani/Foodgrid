import { useMutation } from '@tanstack/react-query'
import { runSimulation } from '../api/simulation'
import type { InterventionType } from '../types'

/**
 * React Query mutation hook for running policy simulations.
 *
 * Usage:
 *   const sim = useSimulation()
 *   sim.mutate({ tractId: '25025010100', interventions: ['pantry', 'mobile'] })
 *   sim.data  // SimulationResult | undefined
 *   sim.isPending // true while request is in flight
 */
export function useSimulation() {
  return useMutation({
    mutationFn: ({
      tractId,
      interventions,
    }: {
      tractId: string
      interventions: InterventionType[]
    }) => runSimulation(tractId, interventions),
  })
}
