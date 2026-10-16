import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '../types/auth'
import { AppError } from '../utils/errors'

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'INVALID_TOKEN', 'Token mal formado ou invalido'))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Permissao insuficiente para esta acao'))
      return
    }
    next()
  }
}
