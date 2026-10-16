import type { CookieOptions } from 'express'
import { config } from '../config'

export const REFRESH_COOKIE = 'refreshToken'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/api/auth',
  }
}

export function refreshCookieSetOptions(): CookieOptions {
  return {
    ...refreshCookieOptions(),
    maxAge: SEVEN_DAYS_MS,
  }
}
