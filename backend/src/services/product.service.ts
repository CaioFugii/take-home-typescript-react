import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from '../routes/product.schema'
import { dataSource } from '../database/data-source'
import { OrderItem, OrderStatus, Product, type ProductCategory } from '../database/entities'
import { AppError } from '../utils/errors'

export type ProductDto = {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  imageUrl: string | null
  isAvailable: boolean
  preparationTime: number
  createdAt: string
  updatedAt: string
}

export type ProductListResult = {
  data: ProductDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function toImageUrl(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  return value === '' ? null : value
}

export function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
    preparationTime: product.preparationTime,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export async function listProducts(query: ListProductsQuery): Promise<ProductListResult> {
  const qb = dataSource.getRepository(Product).createQueryBuilder('product')
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
  return {
    data: products.map(toProductDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  }
}

export async function getProduct(id: string): Promise<ProductDto> {
  const product = await dataSource.getRepository(Product).findOne({ where: { id } })
  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto nao encontrado')
  }
  return toProductDto(product)
}

export async function createProduct(input: CreateProductInput): Promise<ProductDto> {
  const products = dataSource.getRepository(Product)
  const product = await products.save(
    products.create({
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      imageUrl: toImageUrl(input.imageUrl) ?? null,
      isAvailable: input.isAvailable ?? true,
      preparationTime: input.preparationTime,
    }),
  )
  return toProductDto(product)
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDto> {
  const products = dataSource.getRepository(Product)
  const current = await products.findOne({ where: { id } })
  if (!current) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto nao encontrado')
  }
  const imageUrl = toImageUrl(input.imageUrl)
  if (input.name !== undefined) current.name = input.name
  if (input.description !== undefined) current.description = input.description
  if (input.price !== undefined) current.price = input.price
  if (input.category !== undefined) current.category = input.category
  if (imageUrl !== undefined) current.imageUrl = imageUrl
  if (input.isAvailable !== undefined) current.isAvailable = input.isAvailable
  if (input.preparationTime !== undefined) current.preparationTime = input.preparationTime
  return toProductDto(await products.save(current))
}

export async function deleteProduct(id: string): Promise<void> {
  const products = dataSource.getRepository(Product)
  const current = await products.findOne({ where: { id } })
  if (!current) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto nao encontrado')
  }
  const activeItem = await dataSource
    .getRepository(OrderItem)
    .createQueryBuilder('item')
    .innerJoin('item.order', 'order')
    .innerJoin('item.product', 'product')
    .where('product.id = :id', { id })
    .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.pending, OrderStatus.preparing] })
    .getOne()
  if (activeItem) {
    throw new AppError(
      409,
      'PRODUCT_IN_USE',
      "Nao e possivel deletar este produto pois ele esta vinculado a pedidos com status 'pending' ou 'preparing'",
    )
  }
  await products.delete(id)
}
