import { haversineKm } from './haversine'
import { hungarian } from './hungarian'

const UNMATCHED_COST = 1_000_000

export type AssignmentOrder = {
  id: string
  address: string
  latitude: number
  longitude: number
}

export type AssignmentCourier = {
  id: string
  name: string
  latitude: number
  longitude: number
}

export type SuggestedAssignment = {
  orderId: string
  deliveryPersonId: string
  estimatedDistanceKm: number
  orderAddress: string
  deliveryPersonName: string
}

export type UnassignedOrder = {
  orderId: string
  orderAddress: string
  reason: 'No available delivery person'
}

export type AssignmentPlan = {
  assignments: SuggestedAssignment[]
  unassigned: UnassignedOrder[]
  totalDistanceKm: number
  algorithm: 'hungarian'
}

function roundKm(value: number): number {
  return Math.round(value * 100) / 100
}

export function optimizeAssignment(orders: AssignmentOrder[], couriers: AssignmentCourier[]): AssignmentPlan {
  if (orders.length === 0) {
    return { assignments: [], unassigned: [], totalDistanceKm: 0, algorithm: 'hungarian' }
  }
  if (couriers.length === 0) {
    return {
      assignments: [],
      unassigned: orders.map((order) => ({
        orderId: order.id,
        orderAddress: order.address,
        reason: 'No available delivery person',
      })),
      totalDistanceKm: 0,
      algorithm: 'hungarian',
    }
  }

  const size = Math.max(orders.length, couriers.length)
  const cost = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => {
      const order = orders[row]
      const courier = couriers[column]
      if (!order || !courier) {
        return UNMATCHED_COST
      }
      return haversineKm(courier.latitude, courier.longitude, order.latitude, order.longitude)
    }),
  )

  const columnByRow = hungarian(cost)
  const assignments: SuggestedAssignment[] = []
  for (let row = 0; row < orders.length; row += 1) {
    const order = orders[row]
    const column = columnByRow[row] ?? -1
    const courier = couriers[column]
    const distance = cost[row]?.[column]
    if (!order || !courier || distance === undefined || distance >= UNMATCHED_COST) {
      continue
    }
    assignments.push({
      orderId: order.id,
      deliveryPersonId: courier.id,
      estimatedDistanceKm: roundKm(distance),
      orderAddress: order.address,
      deliveryPersonName: courier.name,
    })
  }

  const assigned = new Set(assignments.map((item) => item.orderId))
  const totalDistanceKm = roundKm(assignments.reduce((sum, item) => sum + item.estimatedDistanceKm, 0))

  return {
    assignments,
    unassigned: orders
      .filter((order) => !assigned.has(order.id))
      .map((order) => ({
        orderId: order.id,
        orderAddress: order.address,
        reason: 'No available delivery person' as const,
      })),
    totalDistanceKm,
    algorithm: 'hungarian',
  }
}
