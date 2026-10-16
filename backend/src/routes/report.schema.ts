import { z } from 'zod'

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

const optionalDate = z.preprocess(blankToUndefined, isoDate.optional())

function periodInOrder(value: { startDate?: string; endDate?: string }): boolean {
  return !value.startDate || !value.endDate || value.startDate <= value.endDate
}

export const revenueQuerySchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine(periodInOrder, {
    message: 'A data inicial nao pode ser posterior a data final',
    path: ['startDate'],
  })

export const topProductsQuerySchema = z
  .object({
    startDate: optionalDate,
    endDate: optionalDate,
    limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(50).default(10)),
  })
  .refine(periodInOrder, {
    message: 'A data inicial nao pode ser posterior a data final',
    path: ['startDate'],
  })

export const deliveryTimeQuerySchema = z
  .object({
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(periodInOrder, {
    message: 'A data inicial nao pode ser posterior a data final',
    path: ['startDate'],
  })

export type RevenueQuery = z.infer<typeof revenueQuerySchema>
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>
export type DeliveryTimeQuery = z.infer<typeof deliveryTimeQuerySchema>
