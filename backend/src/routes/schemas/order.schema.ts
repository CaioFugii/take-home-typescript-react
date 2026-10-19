import { z } from 'zod'

const statuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'] as const

const phonePattern = /^\(\d{2}\) \d{5}-\d{4}$/

function blankToUndefined(value: unknown): unknown {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed === '' ? undefined : trimmed
  }
  return raw === undefined ? undefined : raw
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  }, 'Data invalida')

export const listOrdersQuerySchema = z
  .object({
    page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
    status: z.preprocess(blankToUndefined, z.enum(statuses).optional()),
    sortBy: z.preprocess(blankToUndefined, z.enum(['createdAt', 'totalAmount']).default('createdAt')),
    sortOrder: z.preprocess(blankToUndefined, z.enum(['asc', 'desc']).default('desc')),
    startDate: z.preprocess(blankToUndefined, isoDate.optional()),
    endDate: z.preprocess(blankToUndefined, isoDate.optional()),
  })
  .refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
    message: 'A data inicial nao pode ser posterior a data final',
    path: ['startDate'],
  })

export const orderIdSchema = z.object({
  id: z.string().uuid('ID invalido'),
})

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, 'O nome deve ter entre 3 e 100 caracteres')
    .max(100, 'O nome deve ter entre 3 e 100 caracteres'),
  customerPhone: z.string().trim().regex(phonePattern, 'O telefone deve estar no formato (XX) XXXXX-XXXX'),
  deliveryAddress: z
    .string()
    .trim()
    .min(10, 'O endereco deve ter entre 10 e 300 caracteres')
    .max(300, 'O endereco deve ter entre 10 e 300 caracteres'),
  latitude: z.number().min(-90, 'Latitude invalida').max(90, 'Latitude invalida'),
  longitude: z.number().min(-180, 'Longitude invalida').max(180, 'Longitude invalida'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Produto invalido'),
        quantity: z.number().int('A quantidade deve ser um numero inteiro').positive('A quantidade deve ser maior que zero'),
      }),
    )
    .min(1, 'O pedido deve ter ao menos um item')
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      message: 'Cada produto deve aparecer uma unica vez no pedido',
    }),
})

export const updateStatusSchema = z.object({
  status: z.enum(statuses, { errorMap: () => ({ message: 'Status invalido' }) }),
})

export const assignOrderSchema = z.object({
  deliveryPersonId: z.string().uuid('Entregador invalido'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>
