import type { DataSource } from 'typeorm'
import { OrderStatus } from '../../../domain/catalog'
import type {
  AvailableCourier,
  DeliveryPersonListQuery,
  DeliveryPersonPatch,
  DeliveryPersonRecord,
  DeliveryPersonRepository,
  NewDeliveryPerson,
} from '../../../domain/repositories/delivery-person-repository'
import { DeliveryPerson } from '../entities'

function toRecord(person: DeliveryPerson): DeliveryPersonRecord {
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

export class TypeOrmDeliveryPersonRepository implements DeliveryPersonRepository {
  constructor(private readonly dataSource: DataSource) {}

  private query() {
    return this.dataSource
      .getRepository(DeliveryPerson)
      .createQueryBuilder('person')
      .leftJoinAndSelect('person.orders', 'activeOrder', 'activeOrder.status = :delivering', {
        delivering: OrderStatus.delivering,
      })
  }

  async list(query: DeliveryPersonListQuery): Promise<DeliveryPersonRecord[]> {
    const qb = this.query().orderBy('person.name', 'ASC')
    if (query.isActive !== undefined) {
      qb.andWhere('person.isActive = :isActive', { isActive: query.isActive })
    }
    if (query.available) {
      qb.andWhere('activeOrder.id IS NULL')
    }
    const people = await qb.getMany()
    return people.map(toRecord)
  }

  async findById(id: string): Promise<DeliveryPersonRecord | null> {
    const person = await this.query().where('person.id = :id', { id }).getOne()
    return person ? toRecord(person) : null
  }

  async insert(input: NewDeliveryPerson): Promise<DeliveryPersonRecord> {
    const people = this.dataSource.getRepository(DeliveryPerson)
    const saved = await people.save(people.create(input))
    const created = await this.findById(saved.id)
    if (!created) {
      throw new Error('Entregador nao encontrado apos gravar')
    }
    return created
  }

  async update(id: string, patch: DeliveryPersonPatch): Promise<DeliveryPersonRecord | null> {
    const current = await this.dataSource.getRepository(DeliveryPerson).findOne({ where: { id } })
    if (!current) {
      return null
    }
    if (patch.name !== undefined) current.name = patch.name
    if (patch.phone !== undefined) current.phone = patch.phone
    if (patch.vehicleType !== undefined) current.vehicleType = patch.vehicleType
    if (patch.isActive !== undefined) current.isActive = patch.isActive
    if (patch.currentLatitude !== undefined) current.currentLatitude = patch.currentLatitude
    if (patch.currentLongitude !== undefined) current.currentLongitude = patch.currentLongitude
    await this.dataSource.getRepository(DeliveryPerson).save(current)
    return this.findById(id)
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(DeliveryPerson).delete(id)
  }

  async listAvailableForAssignment(): Promise<AvailableCourier[]> {
    const couriers = await this.dataSource
      .getRepository(DeliveryPerson)
      .createQueryBuilder('person')
      .leftJoin('person.orders', 'activeOrder', 'activeOrder.status = :delivering', {
        delivering: OrderStatus.delivering,
      })
      .where('person.isActive = true')
      .andWhere('person.currentLatitude IS NOT NULL')
      .andWhere('person.currentLongitude IS NOT NULL')
      .andWhere('activeOrder.id IS NULL')
      .orderBy('person.name', 'ASC')
      .getMany()

    return couriers.flatMap((courier) => {
      if (courier.currentLatitude === null || courier.currentLongitude === null) {
        return []
      }
      return [
        {
          id: courier.id,
          name: courier.name,
          latitude: courier.currentLatitude,
          longitude: courier.currentLongitude,
        },
      ]
    })
  }
}
