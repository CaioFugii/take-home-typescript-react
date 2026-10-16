export const vehicleTypes = ['bicycle', 'motorcycle', 'car'] as const

export type VehicleType = (typeof vehicleTypes)[number]

export const vehicleLabels: Record<VehicleType, string> = {
  bicycle: 'Bicicleta',
  motorcycle: 'Moto',
  car: 'Carro',
}

export type DeliveryPerson = {
  id: string
  name: string
  phone: string
  vehicleType: VehicleType
  isActive: boolean
  currentLatitude: number | null
  currentLongitude: number | null
  currentOrderId: string | null
}

export type DeliveryPersonInput = {
  name: string
  phone: string
  vehicleType: VehicleType
  isActive: boolean
  currentLatitude: number | null
  currentLongitude: number | null
}
