import { describe, expect, it } from 'vitest'
import { applyPhoneMask, formatPhone } from './phone'

describe('formatPhone', () => {
  it('monta a máscara conforme os dígitos entram', () => {
    expect(formatPhone('1')).toBe('(1')
    expect(formatPhone('11')).toBe('(11')
    expect(formatPhone('119')).toBe('(11) 9')
    expect(formatPhone('1198888')).toBe('(11) 98888')
    expect(formatPhone('11988880000')).toBe('(11) 98888-0000')
  })

  it('ignora caracteres que não são dígitos e limita a 11 números', () => {
    expect(formatPhone('(11) 98888-0000999')).toBe('(11) 98888-0000')
  })
})

describe('applyPhoneMask', () => {
  it('apaga o dígito anterior quando o backspace remove só a pontuação', () => {
    expect(applyPhoneMask('(11) 9', '(11 9')).toBe('(11')
  })
})
