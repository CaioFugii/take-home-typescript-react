import type { DataSource } from 'typeorm'
import { OrderStatus } from '../../domain/catalog'
import type {
  NewProduct,
  ProductListQuery,
  ProductPatch,
  ProductRecord,
  ProductRepository,
} from '../../domain/product-repository'
import { OrderItem, Product } from './entities'

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function toRecord(product: Product): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
    preparationTime: product.preparationTime,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

export class TypeOrmProductRepository implements ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ProductListQuery): Promise<{ data: ProductRecord[]; total: number }> {
    const qb = this.dataSource.getRepository(Product).createQueryBuilder('product')
    if (query.search) {
      qb.andWhere(`product.name ILIKE :search ESCAPE '\\'`, { search: `%${escapeLike(query.search)}%` })
    }
    if (query.category) {
      qb.andWhere('product.category = :category', { category: query.category })
    }
    if (query.isAvailable !== undefined) {
      qb.andWhere('product.isAvailable = :isAvailable', { isAvailable: query.isAvailable })
    }

    const sortColumn =
      query.sortBy === 'name' ? 'product.name' : query.sortBy === 'price' ? 'product.price' : 'product.createdAt'
    qb.orderBy(sortColumn, query.sortOrder === 'asc' ? 'ASC' : 'DESC')
    qb.skip((query.page - 1) * query.limit).take(query.limit)

    const [products, total] = await qb.getManyAndCount()
    return { data: products.map(toRecord), total }
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const product = await this.dataSource.getRepository(Product).findOne({ where: { id } })
    return product ? toRecord(product) : null
  }

  async findByIds(ids: string[]): Promise<ProductRecord[]> {
    if (ids.length === 0) {
      return []
    }
    const products = await this.dataSource.getRepository(Product).find({ where: ids.map((id) => ({ id })) })
    return products.map(toRecord)
  }

  async insert(input: NewProduct): Promise<ProductRecord> {
    const products = this.dataSource.getRepository(Product)
    const saved = await products.save(products.create(input))
    return toRecord(saved)
  }

  async update(id: string, patch: ProductPatch): Promise<ProductRecord | null> {
    const products = this.dataSource.getRepository(Product)
    const current = await products.findOne({ where: { id } })
    if (!current) {
      return null
    }
    if (patch.name !== undefined) current.name = patch.name
    if (patch.description !== undefined) current.description = patch.description
    if (patch.price !== undefined) current.price = patch.price
    if (patch.category !== undefined) current.category = patch.category
    if (patch.imageUrl !== undefined) current.imageUrl = patch.imageUrl
    if (patch.isAvailable !== undefined) current.isAvailable = patch.isAvailable
    if (patch.preparationTime !== undefined) current.preparationTime = patch.preparationTime
    return toRecord(await products.save(current))
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(Product).delete(id)
  }

  async isLinkedToOpenOrder(id: string): Promise<boolean> {
    const activeItem = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .where('product.id = :id', { id })
      .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.pending, OrderStatus.preparing] })
      .getOne()
    return activeItem !== null
  }
}
