/**
 * Base API client for FoodGrid Boston.
 *
 * All requests go through apiFetch(), which:
 *   - Prefixes the path with /api/v1/ (proxied to Django by Vite in dev)
 *   - Sets Content-Type: application/json
 *   - Throws ApiError with status + message on non-2xx responses
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
  const url = `/api/v1/${path}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body?.detail ?? body?.error ?? message
    } catch {
      // ignore JSON parse failures
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}
