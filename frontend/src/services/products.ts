import type { Product, ProductInput, ProductListQuery, ProductListResponse } from '../types/product'
import { api } from './api'

export function listProducts(query: ProductListQuery): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  })
  if (query.search) {
    params.set('search', query.search)
  }
  if (query.category) {
    params.set('category', query.category)
  }
  if (query.isAvailable !== undefined) {
    params.set('isAvailable', String(query.isAvailable))
  }
  return api<ProductListResponse>(`/api/products?${params.toString()}`)
}

export function createProduct(input: ProductInput): Promise<Product> {
  return api<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  return api<Product>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteProduct(id: string): Promise<void> {
  return api<void>(`/api/products/${id}`, { method: 'DELETE' })
}
