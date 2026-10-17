import type { VehicleType } from './catalog'

export type DeliveryPersonRecord = {
  id: string
  name: string
  phone: string
  vehicleType: VehicleType
  isActive: boolean
  currentLatitude: number | null
  currentLongitude: number | null
  currentOrderId: string | null
}

export type DeliveryPersonListQuery = {
  isActive?: boolean
  available?: boolean
}

export type NewDeliveryPerson = {
  name: string
  phone: string
  vehicleType: VehicleType
  isActive: boolean
  currentLatitude: number | null
  currentLongitude: number | null
}

export type DeliveryPersonPatch = Partial<NewDeliveryPerson>

export type AvailableCourier = {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface DeliveryPersonRepository {
  list(query: DeliveryPersonListQuery): Promise<DeliveryPersonRecord[]>
  findById(id: string): Promise<DeliveryPersonRecord | null>
  insert(input: NewDeliveryPerson): Promise<DeliveryPersonRecord>
  update(id: string, patch: DeliveryPersonPatch): Promise<DeliveryPersonRecord | null>
  delete(id: string): Promise<void>
  listAvailableForAssignment(): Promise<AvailableCourier[]>
}
