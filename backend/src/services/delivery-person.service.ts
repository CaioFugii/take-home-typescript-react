import type { SelectQueryBuilder } from 'typeorm'
import type {
  CreateDeliveryPersonInput,
  ListDeliveryPersonsQuery,
  UpdateDeliveryPersonInput,
} from '../routes/delivery-person.schema'
import { dataSource } from '../database/data-source'
import { DeliveryPerson, Order, OrderStatus, type VehicleType } from '../database/entities'
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

function personQuery(): SelectQueryBuilder<DeliveryPerson> {
  return dataSource
    .getRepository(DeliveryPerson)
    .createQueryBuilder('person')
    .leftJoinAndSelect('person.orders', 'activeOrder', 'activeOrder.status = :delivering', {
      delivering: OrderStatus.delivering,
    })
}

function toDto(person: DeliveryPerson): DeliveryPersonDto {
  return {
    id: person.id,
    name: person.name,
    phone: person.phone,
    vehicleType: person.vehicleType,
    isActive: person.isActive,
    currentLatitude: person.currentLatitude,
    currentLongitude: person.currentLongitude,
    currentOrderId: person.orders[0]?.id ?? null,
  }
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(8))
}

async function findPerson(id: string): Promise<DeliveryPerson> {
  const person = await personQuery().where('person.id = :id', { id }).getOne()
  if (!person) {
    throw new AppError(404, 'DELIVERY_PERSON_NOT_FOUND', 'Entregador nao encontrado')
  }
  return person
}

export async function listDeliveryPersons(query: ListDeliveryPersonsQuery): Promise<{ data: DeliveryPersonDto[] }> {
  const qb = personQuery().orderBy('person.name', 'ASC')
  if (query.isActive !== undefined) {
    qb.andWhere('person.isActive = :isActive', { isActive: query.isActive })
  }
  if (query.available) {
    qb.andWhere('activeOrder.id IS NULL')
  }
  const people = await qb.getMany()
  return { data: people.map(toDto) }
}

export async function createDeliveryPerson(input: CreateDeliveryPersonInput): Promise<DeliveryPersonDto> {
  const people = dataSource.getRepository(DeliveryPerson)
  const saved = await people.save(
    people.create({
      name: input.name,
      phone: input.phone,
      vehicleType: input.vehicleType,
      isActive: input.isActive ?? true,
      currentLatitude: input.currentLatitude === undefined || input.currentLatitude === null ? null : roundCoordinate(input.currentLatitude),
      currentLongitude: input.currentLongitude === undefined || input.currentLongitude === null ? null : roundCoordinate(input.currentLongitude),
    }),
  )
  return toDto(await findPerson(saved.id))
}

export async function updateDeliveryPerson(id: string, input: UpdateDeliveryPersonInput): Promise<DeliveryPersonDto> {
  const current = await findPerson(id)
  const nextLatitude = input.currentLatitude === undefined ? current.currentLatitude : input.currentLatitude
  const nextLongitude = input.currentLongitude === undefined ? current.currentLongitude : input.currentLongitude
  if ((nextLatitude === null) !== (nextLongitude === null)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados invalidos', [
      { field: 'currentLatitude', message: 'Informe latitude e longitude juntas' },
    ])
  }

  if (input.name !== undefined) current.name = input.name
  if (input.phone !== undefined) current.phone = input.phone
  if (input.vehicleType !== undefined) current.vehicleType = input.vehicleType
  if (input.isActive !== undefined) current.isActive = input.isActive
  if (input.currentLatitude !== undefined) {
    current.currentLatitude = input.currentLatitude === null ? null : roundCoordinate(input.currentLatitude)
  }
  if (input.currentLongitude !== undefined) {
    current.currentLongitude = input.currentLongitude === null ? null : roundCoordinate(input.currentLongitude)
  }
  await dataSource.getRepository(DeliveryPerson).save(current)
  return toDto(await findPerson(id))
}

export async function deleteDeliveryPerson(id: string): Promise<void> {
  await findPerson(id)
  const activeDelivery = await dataSource.getRepository(Order).findOne({
    where: { deliveryPerson: { id }, status: OrderStatus.delivering },
    select: { id: true },
  })
  if (activeDelivery) {
    throw new AppError(
      409,
      'DELIVERY_PERSON_IN_USE',
      'Nao e possivel remover este entregador pois ele esta atribuido a um pedido em entrega',
    )
  }
  await dataSource.getRepository(DeliveryPerson).delete(id)
}
