/**
 * Base fetch wrapper for all FoodGrid API calls.
 *
 * All requests go to /api/v1/… which Vite proxies to http://localhost:8000
 * during development (configured in vite.config.ts).
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const body = await res.json()
      message = body?.error?.message ?? body?.detail ?? message
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}
