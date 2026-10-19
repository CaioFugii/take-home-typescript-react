import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Email invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
})
