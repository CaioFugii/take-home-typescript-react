import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema, ZodTypeAny, output } from 'zod'
import { AppError } from '../utils/errors'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Dados invalidos',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          })),
        ),
      )
      return
    }
    req.body = result.data
    next()
  }
}

export function parseSchema<Schema extends ZodTypeAny>(schema: Schema, value: unknown): output<Schema> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Dados invalidos',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'query',
        message: issue.message,
      })),
    )
  }
  return result.data as output<Schema>
}
