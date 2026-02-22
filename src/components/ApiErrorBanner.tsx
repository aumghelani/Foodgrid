import { useState } from 'react'
import { WifiOff, X, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Dismissible banner shown when the Django backend is unreachable.
 *
 * Usage:
 *   <ApiErrorBanner visible={isError} />
 *
 * The banner includes a "Retry" button that invalidates all React Query
 * caches so all hooks re-fetch simultaneously.
 */
export default function ApiErrorBanner({ visible }: { visible: boolean }) {
  const [dismissed, setDismissed] = useState(false)
  const queryClient = useQueryClient()

  if (!visible || dismissed) return null

  const handleRetry = () => {
    setDismissed(false)
    queryClient.invalidateQueries()
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-3 px-4 py-2.5 bg-red-950/80 border-b border-red-800/50 text-sm"
    >
      <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
      <span className="flex-1 font-mono text-[11px] text-red-300">
        Backend offline — showing cached data. Run{' '}
        <code className="bg-red-900/50 px-1 rounded">npm run dev:full</code>{' '}
        to start the API.
      </span>
      <button
        onClick={handleRetry}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-700 text-red-300 hover:bg-red-900/50 transition-colors text-[11px] font-mono flex-shrink-0"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-red-400 hover:text-red-200 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
