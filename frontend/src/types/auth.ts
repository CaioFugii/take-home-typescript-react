export type UserRole = 'admin' | 'viewer'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type RefreshResponse = {
  accessToken: string
  refreshToken: string
}

export type ApiFieldError = {
  field?: string
  message?: string
}

export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: ApiFieldError[]
  }
}
