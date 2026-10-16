import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { config } from '../config'
import { logger } from '../utils/logger'
import { AppError } from '../utils/errors'

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados invalidos',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      },
    })
    return
  }

  logger.error({ err: error }, 'unhandled error')
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
      details: config.nodeEnv === 'development' && error instanceof Error ? [{ message: error.message }] : [],
    },
  })
}
