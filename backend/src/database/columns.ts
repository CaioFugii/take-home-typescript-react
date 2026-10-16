export function decimalTransformer(scale: number): {
  to: (value: number | null) => string | null
  from: (value: string | number | null) => number | null
} {
  return {
    to(value: number | null): string | null {
      if (value === null || value === undefined) {
        return null
      }
      return value.toFixed(scale)
    },
    from(value: string | number | null): number | null {
      if (value === null || value === undefined) {
        return null
      }
      return Number(value)
    },
  }
}
