import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'

const accounts = [
  { label: 'Admin', email: 'admin@fastmeals.com', password: 'Admin@123' },
  { label: 'Leitura', email: 'viewer@fastmeals.com', password: 'Viewer@123' },
] as const

type FieldErrors = {
  email?: string
  password?: string
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) {
    errors.email = 'Informe o email'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Email inválido'
  }
  if (!password) {
    errors.password = 'Informe a senha'
  }
  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const errors = validate(email, password)
    setFieldErrors(errors)
    setFormError(null)
    if (errors.email || errors.password) {
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/pedidos', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError('Email ou senha inválidos')
      } else {
        setFormError('Não foi possível entrar. Tente de novo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-moss px-12 py-10 text-[#f6f1e7] lg:flex">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#d7c7a4]">FastMeals</p>
          <h1 className="mt-6 max-w-md font-display text-6xl leading-[0.95]">
            A cozinha, a rua e o pedido no mesmo painel.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-[#e7dcc8]">
          Operação interna para acompanhar pedidos, cardápio, métricas e a saída dos entregadores.
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={(event) => void handleSubmit(event)} className="w-full max-w-md" noValidate>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a7b68] lg:hidden">FastMeals</p>
          <h2 className="mt-2 font-display text-4xl">Entrar</h2>
          <p className="mt-2 text-sm text-[#6d6256]">Use uma conta do painel para continuar.</p>

          <div className="mt-6 flex gap-2">
            {accounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-[#5c5146] hover:border-ink"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setFieldErrors({})
                  setFormError(null)
                }}
              >
                Preencher {account.label}
              </button>
            ))}
          </div>

          <label className="mt-8 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-ember focus:ring-2"
          />
          {fieldErrors.email ? (
            <p id="email-error" className="mt-2 text-sm text-ember">
              {fieldErrors.email}
            </p>
          ) : null}

          <label className="mt-5 block text-sm font-medium" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-ember focus:ring-2"
          />
          {fieldErrors.password ? (
            <p id="password-error" className="mt-2 text-sm text-ember">
              {fieldErrors.password}
            </p>
          ) : null}

          {formError ? (
            <p role="alert" className="mt-5 rounded-2xl bg-[#fde8e1] px-4 py-3 text-sm text-[#9a3412]">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-ember px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b84322] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  )
}
