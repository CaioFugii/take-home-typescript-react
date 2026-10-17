import type { ProductCategory } from './catalog'

export type ProductRecord = {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  imageUrl: string | null
  isAvailable: boolean
  preparationTime: number
  createdAt: Date
  updatedAt: Date
}

export type ProductListQuery = {
  page: number
  limit: number
  search?: string
  category?: ProductCategory
  isAvailable?: boolean
  sortBy: 'name' | 'price' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

export type NewProduct = {
  name: string
  description: string
  price: number
  category: ProductCategory
  imageUrl: string | null
  isAvailable: boolean
  preparationTime: number
}

export type ProductPatch = Partial<NewProduct>

export interface ProductRepository {
  list(query: ProductListQuery): Promise<{ data: ProductRecord[]; total: number }>
  findById(id: string): Promise<ProductRecord | null>
  findByIds(ids: string[]): Promise<ProductRecord[]>
  insert(input: NewProduct): Promise<ProductRecord>
  update(id: string, patch: ProductPatch): Promise<ProductRecord | null>
  delete(id: string): Promise<void>
  isLinkedToOpenOrder(id: string): Promise<boolean>
}
