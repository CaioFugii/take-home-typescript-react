import type { AssignmentPlan } from '../types/assignment'
import type { CreateOrderInput, Order, OrderListResponse, OrderStatus } from '../types/order'
import { api } from './api'

export type OrderListParams = {
  page: number
  limit: number
  status?: OrderStatus
  startDate?: string
  endDate?: string
}

export function listOrders(params: OrderListParams): Promise<OrderListResponse> {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  if (params.status) {
    search.set('status', params.status)
  }
  if (params.startDate) {
    search.set('startDate', params.startDate)
  }
  if (params.endDate) {
    search.set('endDate', params.endDate)
  }
  return api<OrderListResponse>(`/api/orders?${search.toString()}`)
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return api<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return api<Order>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function suggestAssignment(): Promise<AssignmentPlan> {
  return api<AssignmentPlan>('/api/orders/optimize-assignment', { method: 'POST' })
}

export function assignOrder(id: string, deliveryPersonId: string): Promise<Order> {
  return api<Order>(`/api/orders/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ deliveryPersonId }),
  })
}
