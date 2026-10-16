import { z } from 'zod'

const categories = ['meal', 'drink', 'dessert', 'side'] as const

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
}

function blankToUndefined(value: unknown): unknown {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed === '' ? undefined : trimmed
  }
  return raw === undefined ? undefined : raw
}

const imageUrlSchema = z
  .string()
  .trim()
  .max(500, 'A URL da imagem deve ter no maximo 500 caracteres')
  .refine((value) => value === '' || z.string().url().safeParse(value).success, 'A URL da imagem e invalida')

export const productBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'O nome deve ter entre 3 e 120 caracteres')
    .max(120, 'O nome deve ter entre 3 e 120 caracteres'),
  description: z
    .string()
    .trim()
    .min(10, 'A descricao deve ter entre 10 e 500 caracteres')
    .max(500, 'A descricao deve ter entre 10 e 500 caracteres'),
  price: z
    .number({ invalid_type_error: 'O preco deve ser um numero' })
    .positive('O preco deve ser maior que zero')
    .max(99_999_999.99, 'O preco excede o limite permitido')
    .refine(hasAtMostTwoDecimals, 'O preco deve ter no maximo 2 casas decimais'),
  category: z.enum(categories, { errorMap: () => ({ message: 'Categoria invalida' }) }),
  imageUrl: imageUrlSchema.optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z
    .number({ invalid_type_error: 'O tempo de preparo deve ser um numero inteiro' })
    .int('O tempo de preparo deve ser um numero inteiro')
    .min(1, 'O tempo de preparo deve estar entre 1 e 120 minutos')
    .max(120, 'O tempo de preparo deve estar entre 1 e 120 minutos'),
})

export const createProductSchema = productBodySchema

export const updateProductSchema = productBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
})

export const productIdSchema = z.object({
  id: z.string().uuid('ID invalido'),
})

export const listProductsQuerySchema = z.object({
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
  search: z.preprocess(blankToUndefined, z.string().trim().min(1).optional()),
  category: z.preprocess(blankToUndefined, z.enum(categories).optional()),
  isAvailable: z.preprocess(
    blankToUndefined,
    z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
  ),
  sortBy: z.preprocess(blankToUndefined, z.enum(['name', 'price', 'createdAt']).default('createdAt')),
  sortOrder: z.preprocess(blankToUndefined, z.enum(['asc', 'desc']).default('desc')),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
