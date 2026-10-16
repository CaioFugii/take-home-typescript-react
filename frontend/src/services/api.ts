import type { ApiErrorBody, ApiFieldError, RefreshResponse } from '../types/auth'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiFieldError[]

  constructor(status: number, code: string, message: string, details: ApiFieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let accessToken: string | null = null
let unauthorizedHandler: (() => void) | null = null
let refreshInFlight: Promise<boolean> | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  return new ApiError(
    response.status,
    body?.error?.code ?? 'INTERNAL_ERROR',
    body?.error?.message ?? 'Nao foi possivel concluir a requisicao',
    body?.error?.details ?? [],
  )
}

export async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) {
        accessToken = null
        return false
      }
      const data = (await response.json()) as RefreshResponse
      accessToken = data.accessToken
      return true
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })

  const isAuthAttempt = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/refresh')
  if (response.status === 401 && retry && !isAuthAttempt) {
    const refreshed = await refreshSession()
    if (refreshed) {
      return api<T>(path, options, false)
    }
    unauthorizedHandler?.()
    throw await parseError(response)
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
