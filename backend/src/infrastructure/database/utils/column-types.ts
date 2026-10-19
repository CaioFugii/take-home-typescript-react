import { decimalTransformer } from './columns.js'

export const money = decimalTransformer(2)
export const latitude = decimalTransformer(8)
export const longitude = decimalTransformer(8)

export function enumValues<T extends Record<string, string>>(record: T): Array<T[keyof T]> {
  return Object.values(record) as Array<T[keyof T]>
}
