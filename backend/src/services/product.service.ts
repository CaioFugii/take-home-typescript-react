import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from '../routes/product.schema'
import type { ProductCategory } from '../domain/catalog'
import { DomainError } from '../domain/errors'
import type { ProductRecord } from '../domain/product-repository'
import { assertProductCanBeRemoved } from '../domain/rules'
import { repositories } from '../context'

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

function toProductDto(product: ProductRecord): ProductDto {
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

function pagination(query: ListProductsQuery, total: number) {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  }
}

export async function listProducts(query: ListProductsQuery): Promise<ProductListResult> {
  const result = await repositories().products.list(query)
  return {
    data: result.data.map(toProductDto),
    pagination: pagination(query, result.total),
  }
}

export async function getProduct(id: string): Promise<ProductDto> {
  const product = await repositories().products.findById(id)
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Produto nao encontrado')
  }
  return toProductDto(product)
}

export async function createProduct(input: CreateProductInput): Promise<ProductDto> {
  const product = await repositories().products.insert({
    name: input.name,
    description: input.description,
    price: input.price,
    category: input.category,
    imageUrl: toImageUrl(input.imageUrl) ?? null,
    isAvailable: input.isAvailable ?? true,
    preparationTime: input.preparationTime,
  })
  return toProductDto(product)
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDto> {
  const imageUrl = toImageUrl(input.imageUrl)
  const product = await repositories().products.update(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
    ...(input.preparationTime !== undefined ? { preparationTime: input.preparationTime } : {}),
  })
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Produto nao encontrado')
  }
  return toProductDto(product)
}

export async function deleteProduct(id: string): Promise<void> {
  const current = await repositories().products.findById(id)
  if (!current) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Produto nao encontrado')
  }
  assertProductCanBeRemoved(await repositories().products.isLinkedToOpenOrder(id))
  await repositories().products.delete(id)
}
