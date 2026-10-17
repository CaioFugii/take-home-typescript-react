import type {
  CreateDeliveryPersonInput,
  ListDeliveryPersonsQuery,
  UpdateDeliveryPersonInput,
} from '../routes/delivery-person.schema'
import type { VehicleType } from '../domain/catalog'
import { DomainError } from '../domain/errors'
import type { DeliveryPersonRecord } from '../domain/delivery-person-repository'
import { assertCourierCanBeRemoved } from '../domain/rules'
import { repositories } from '../context'
import { AppError } from '../utils/errors'

export type DeliveryPersonDto = {
  id: string
  name: string
  phone: string
  vehicleType: VehicleType
  isActive: boolean
  currentLatitude: number | null
  currentLongitude: number | null
  currentOrderId: string | null
}

function toDto(person: DeliveryPersonRecord): DeliveryPersonDto {
  return { ...person }
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(8))
}

function optionalCoordinate(value: number | null | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  return value === null ? null : roundCoordinate(value)
}

async function requirePerson(id: string): Promise<DeliveryPersonRecord> {
  const person = await repositories().deliveryPersons.findById(id)
  if (!person) {
    throw new DomainError('DELIVERY_PERSON_NOT_FOUND', 'Entregador nao encontrado')
  }
  return person
}

export async function listDeliveryPersons(query: ListDeliveryPersonsQuery): Promise<{ data: DeliveryPersonDto[] }> {
  const people = await repositories().deliveryPersons.list(query)
  return { data: people.map(toDto) }
}

export async function createDeliveryPerson(input: CreateDeliveryPersonInput): Promise<DeliveryPersonDto> {
  const saved = await repositories().deliveryPersons.insert({
    name: input.name,
    phone: input.phone,
    vehicleType: input.vehicleType,
    isActive: input.isActive ?? true,
    currentLatitude: optionalCoordinate(input.currentLatitude) ?? null,
    currentLongitude: optionalCoordinate(input.currentLongitude) ?? null,
  })
  return toDto(saved)
}

export async function updateDeliveryPerson(id: string, input: UpdateDeliveryPersonInput): Promise<DeliveryPersonDto> {
  const current = await requirePerson(id)
  const nextLatitude = input.currentLatitude === undefined ? current.currentLatitude : input.currentLatitude
  const nextLongitude = input.currentLongitude === undefined ? current.currentLongitude : input.currentLongitude
  if ((nextLatitude === null) !== (nextLongitude === null)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados invalidos', [
      { field: 'currentLatitude', message: 'Informe latitude e longitude juntas' },
    ])
  }

  const saved = await repositories().deliveryPersons.update(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.currentLatitude !== undefined ? { currentLatitude: optionalCoordinate(input.currentLatitude) ?? null } : {}),
    ...(input.currentLongitude !== undefined
      ? { currentLongitude: optionalCoordinate(input.currentLongitude) ?? null }
      : {}),
  })
  if (!saved) {
    throw new DomainError('DELIVERY_PERSON_NOT_FOUND', 'Entregador nao encontrado')
  }
  return toDto(saved)
}

export async function deleteDeliveryPerson(id: string): Promise<void> {
  await requirePerson(id)
  assertCourierCanBeRemoved(await repositories().orders.isCourierDelivering(id))
  await repositories().deliveryPersons.delete(id)
}
