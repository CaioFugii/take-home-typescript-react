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
  reason: string
}

export type AssignmentPlan = {
  assignments: SuggestedAssignment[]
  unassigned: UnassignedOrder[]
  totalDistanceKm: number
  algorithm: 'hungarian'
  executionTimeMs: number
}
