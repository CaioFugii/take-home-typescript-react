export const UserRole = {
  admin: 'admin',
  viewer: 'viewer',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ProductCategory = {
  meal: 'meal',
  drink: 'drink',
  dessert: 'dessert',
  side: 'side',
} as const
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory]

export const OrderStatus = {
  pending: 'pending',
  preparing: 'preparing',
  ready: 'ready',
  delivering: 'delivering',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const VehicleType = {
  bicycle: 'bicycle',
  motorcycle: 'motorcycle',
  car: 'car',
} as const
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType]
