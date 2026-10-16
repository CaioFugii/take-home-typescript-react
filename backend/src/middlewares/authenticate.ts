import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors'
import { verifyAccessToken } from '../services/auth.service'

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization')
  if (!header) {
    next(new AppError(401, 'INVALID_TOKEN', 'Token mal formado ou invalido'))
    return
  }

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'INVALID_TOKEN', 'Token mal formado ou invalido'))
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch (error) {
    next(error)
  }
}
