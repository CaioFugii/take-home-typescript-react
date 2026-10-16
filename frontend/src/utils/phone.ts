const phoneDigitLimit = 11

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, phoneDigitLimit)
  if (digits.length === 0) {
    return ''
  }
  if (digits.length <= 2) {
    return `(${digits}`
  }
  const area = digits.slice(0, 2)
  const prefix = digits.slice(2, 7)
  if (digits.length <= 7) {
    return `(${area}) ${prefix}`
  }
  return `(${area}) ${prefix}-${digits.slice(7)}`
}

export function applyPhoneMask(previous: string, next: string): string {
  const previousDigits = previous.replace(/\D/g, '')
  const nextDigits = next.replace(/\D/g, '')
  const removedFormatting = next.length < previous.length && nextDigits === previousDigits && previousDigits.length > 0
  if (removedFormatting) {
    return formatPhone(previousDigits.slice(0, -1))
  }
  return formatPhone(next)
}
