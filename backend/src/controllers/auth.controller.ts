import type { Request, Response } from 'express'
import { login, refreshSession, revokeRefreshToken } from '../services/auth.service'
import { REFRESH_COOKIE, refreshCookieOptions, refreshCookieSetOptions } from '../utils/cookies'
import { AppError } from '../utils/errors'
import { loginSchema, refreshSchema } from '../routes/schemas/auth.schema'

function readCookie(req: Request): string | undefined {
  const value = req.cookies?.[REFRESH_COOKIE]
  return typeof value === 'string' ? value : undefined
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body)
  const session = await login(email, password)
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieSetOptions())
  res.status(200).json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  })
}

export async function refreshController(req: Request, res: Response): Promise<void> {
  const body = refreshSchema.parse(req.body ?? {})
  const refreshToken = body.refreshToken ?? readCookie(req)
  if (!refreshToken) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invalido ou expirado')
  }

  const session = await refreshSession(refreshToken)
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieSetOptions())
  res.status(200).json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
}

export async function logoutController(req: Request, res: Response): Promise<void> {
  const bodyToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined
  await revokeRefreshToken(bodyToken ?? readCookie(req))
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions())
  res.status(204).send()
}

export async function meController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token mal formado ou invalido')
  }
  res.status(200).json(req.user)
}
