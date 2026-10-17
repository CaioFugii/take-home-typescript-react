import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { config } from '../config'
import { DomainError, type ErrorCode } from '../domain/errors'
import { logger } from '../utils/logger'
import { AppError } from '../utils/errors'

const domainStatus: Partial<Record<ErrorCode, number>> = {
  PRODUCT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  DELIVERY_PERSON_NOT_FOUND: 404,
  PRODUCT_IN_USE: 409,
  DELIVERY_PERSON_IN_USE: 409,
  INVALID_STATUS_TRANSITION: 422,
  UNAVAILABLE_PRODUCT: 422,
  DELIVERY_PERSON_UNAVAILABLE: 422,
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof DomainError) {
    res.status(domainStatus[error.code] ?? 422).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    })
    return
  }

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
