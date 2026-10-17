import { And, type DataSource, type FindOptionsWhere, LessThan, MoreThanOrEqual } from 'typeorm'
import { OrderStatus } from '../../domain/catalog'
import { DomainError } from '../../domain/errors'
import type { NewOrder, OrderListQuery, OrderRecord, OrderRepository, ReadyOrder } from '../../domain/order-repository'
import { assertStatusTransition } from '../../domain/order-status'
import { assertCourierCanDeliver, assertOrderCanReceiveCourier } from '../../domain/rules'
import { DeliveryPerson, Order, OrderItem, OrderStatusEvent, Product } from './entities'

const orderRelations = { items: { product: true }, deliveryPerson: true } as const

function toRecord(order: Order): OrderRecord {
  const items = [...order.items].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    latitude: order.latitude,
    longitude: order.longitude,
    status: order.status,
    totalAmount: order.totalAmount,
    deliveryPerson: order.deliveryPerson
      ? {
          id: order.deliveryPerson.id,
          name: order.deliveryPerson.name,
          phone: order.deliveryPerson.phone,
          vehicleType: order.deliveryPerson.vehicleType,
        }
      : null,
    items: items.map((item) => ({
      id: item.id,
      product: { id: item.product.id, name: item.product.name },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export class TypeOrmOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: OrderListQuery): Promise<{ data: OrderRecord[]; total: number }> {
    const createdAt =
      query.start && query.end
        ? And(MoreThanOrEqual(query.start), LessThan(query.end))
        : query.start
          ? MoreThanOrEqual(query.start)
          : query.end
            ? LessThan(query.end)
            : undefined

    const where: FindOptionsWhere<Order> = {
      ...(query.status ? { status: query.status } : {}),
      ...(createdAt ? { createdAt } : {}),
    }

    const [orders, total] = await this.dataSource.getRepository(Order).findAndCount({
      where,
      relations: orderRelations,
      order: {
        [query.sortBy]: query.sortOrder,
        items: { createdAt: 'ASC' },
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    })

    return { data: orders.map(toRecord), total }
  }

  async findById(id: string): Promise<OrderRecord | null> {
    const order = await this.dataSource.getRepository(Order).findOne({ where: { id }, relations: orderRelations })
    return order ? toRecord(order) : null
  }

  async create(input: NewOrder): Promise<OrderRecord> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const products = await manager.getRepository(Product).find({
        where: input.items.map((item) => ({ id: item.productId })),
      })
      const byId = new Map(products.map((product) => [product.id, product]))
      const order = manager.create(Order, {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        deliveryAddress: input.deliveryAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        status: OrderStatus.pending,
        totalAmount: input.totalAmount,
        deliveryPerson: null,
        items: input.items.map((item) => {
          const product = byId.get(item.productId)
          if (!product) {
            throw new DomainError('UNAVAILABLE_PRODUCT', 'Um ou mais produtos nao estao disponiveis')
          }
          return manager.create(OrderItem, { product, quantity: item.quantity, unitPrice: item.unitPrice })
        }),
        statusEvents: [manager.create(OrderStatusEvent, { fromStatus: null, toStatus: OrderStatus.pending })],
      })
      return manager.save(order)
    })

    const created = await this.findById(saved.id)
    if (!created) {
      throw new DomainError('ORDER_NOT_FOUND', 'Pedido nao encontrado')
    }
    return created
  }

  async changeStatus(id: string, status: OrderStatus): Promise<OrderRecord | null> {
    const changed = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Order, { where: { id }, relations: { deliveryPerson: true } })
      if (!current) {
        return false
      }
      assertStatusTransition(current.status, status, current.deliveryPerson !== null)
      const fromStatus = current.status
      current.status = status
      await manager.save(current)
      await manager.save(manager.create(OrderStatusEvent, { order: current, fromStatus, toStatus: status }))
      return true
    })

    if (!changed) {
      return null
    }
    return this.findById(id)
  }

  async assignCourier(orderId: string, deliveryPersonId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Order, { where: { id: orderId } })
      if (!current) {
        throw new DomainError('ORDER_NOT_FOUND', 'Pedido nao encontrado')
      }
      assertOrderCanReceiveCourier(current.status)

      const person = await manager.findOne(DeliveryPerson, { where: { id: deliveryPersonId } })
      if (!person) {
        throw new DomainError('DELIVERY_PERSON_NOT_FOUND', 'Entregador nao encontrado')
      }

      const busy = await manager
        .createQueryBuilder(Order, 'order')
        .innerJoin('order.deliveryPerson', 'person')
        .where('person.id = :deliveryPersonId', { deliveryPersonId })
        .andWhere('order.status = :status', { status: OrderStatus.delivering })
        .andWhere('order.id <> :orderId', { orderId })
        .getOne()
      assertCourierCanDeliver(person.isActive, busy !== null)

      current.deliveryPerson = person
      await manager.save(current)
    })
  }

  async listReady(): Promise<ReadyOrder[]> {
    const orders = await this.dataSource.getRepository(Order).find({
      where: { status: OrderStatus.ready },
      order: { createdAt: 'ASC' },
    })
    return orders.map((order) => ({
      id: order.id,
      address: order.deliveryAddress,
      latitude: order.latitude,
      longitude: order.longitude,
    }))
  }

  async isCourierDelivering(deliveryPersonId: string, exceptOrderId?: string): Promise<boolean> {
    const qb = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .innerJoin('order.deliveryPerson', 'person')
      .where('person.id = :deliveryPersonId', { deliveryPersonId })
      .andWhere('order.status = :status', { status: OrderStatus.delivering })
    if (exceptOrderId) {
      qb.andWhere('order.id <> :exceptOrderId', { exceptOrderId })
    }
    const busy = await qb.getOne()
    return busy !== null
  }
}
