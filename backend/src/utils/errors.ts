import type { ErrorCode, ErrorDetail } from '../domain/errors'

export type { ErrorCode, ErrorDetail }

export class AppError extends Error {
  readonly statusCode: number
  readonly code: ErrorCode
  readonly details: ErrorDetail[]

  constructor(statusCode: number, code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}
