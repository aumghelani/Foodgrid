import { useQuery } from '@tanstack/react-query'
import { fetchResources, type ResourceParams } from '../api/resources'

/**
 * React Query hook for food resources.
 *
 * Re-fetches whenever filter params change. Falls back to an empty array
 * while loading or on error so the sidebar never crashes.
 */
export function useResources(params: ResourceParams) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: () => fetchResources(params),
    placeholderData: [],
    staleTime: 60_000, // 1 minute
  })
}
