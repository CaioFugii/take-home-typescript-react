export const productCategories = ['meal', 'drink', 'dessert', 'side'] as const

export type ProductCategory = (typeof productCategories)[number]

export const categoryLabels: Record<ProductCategory, string> = {
  meal: 'Prato',
  drink: 'Bebida',
  dessert: 'Sobremesa',
  side: 'Acompanhamento',
}

export type Product = {
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

export type ProductInput = {
  name: string
  description: string
  price: number
  category: ProductCategory
  imageUrl?: string
  isAvailable: boolean
  preparationTime: number
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

export type ProductListResponse = {
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
