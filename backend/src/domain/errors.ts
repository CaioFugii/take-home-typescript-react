export type ErrorDetail = {
  field?: string
  message?: string
  productId?: string
  productName?: string
  reason?: string
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'INVALID_REFRESH_TOKEN'
  | 'FORBIDDEN'
  | 'PRODUCT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'DELIVERY_PERSON_NOT_FOUND'
  | 'PRODUCT_IN_USE'
  | 'INVALID_STATUS_TRANSITION'
  | 'UNAVAILABLE_PRODUCT'
  | 'DELIVERY_PERSON_UNAVAILABLE'
  | 'DELIVERY_PERSON_IN_USE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'

export class DomainError extends Error {
  readonly code: ErrorCode
  readonly details: ErrorDetail[]

  constructor(code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}
