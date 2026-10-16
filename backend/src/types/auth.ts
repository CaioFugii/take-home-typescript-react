export type UserRole = 'admin' | 'viewer'

export type AuthenticatedUser = {
  id: string
  email: string
  role: UserRole
}
