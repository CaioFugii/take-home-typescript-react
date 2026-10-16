import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { AuthProvider } from '../context/AuthContext'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function installFetch(login: Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.startsWith('/api/auth/refresh')) {
        return Promise.resolve(json(401, { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh invalido', details: [] } }))
      }
      if (url.startsWith('/api/auth/login')) {
        return Promise.resolve(login)
      }
      if (url.startsWith('/api/orders')) {
        return Promise.resolve(json(200, { data: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } }))
      }
      return Promise.reject(new Error(`Chamada inesperada: ${url}`))
    }),
  )
}

function renderAtLogin(): void {
  render(
    <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('mostra o formulario de entrada', async () => {
    installFetch(json(500, {}))
    renderAtLogin()

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('preenche a conta de admin ao clicar no atalho', async () => {
    installFetch(json(500, {}))
    renderAtLogin()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Entrar' })

    await user.click(screen.getByRole('button', { name: 'Preencher Admin' }))

    expect(screen.getByLabelText('Email')).toHaveValue('admin@fastmeals.com')
    expect(screen.getByLabelText('Senha')).toHaveValue('Admin@123')
  })

  it('exige email e senha antes de chamar a API', async () => {
    installFetch(json(500, {}))
    renderAtLogin()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Entrar' })

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe o email')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha')).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).startsWith('/api/auth/login'))).toBe(false)
  })

  it('mostra o erro quando a credencial e recusada', async () => {
    installFetch(json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais invalidas', details: [] } }))
    renderAtLogin()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Entrar' })

    await user.click(screen.getByRole('button', { name: 'Preencher Admin' }))
    await user.clear(screen.getByLabelText('Senha'))
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou senha inválidos')
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('entra no painel de pedidos com uma conta valida', async () => {
    installFetch(
      json(200, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'admin@fastmeals.com', role: 'admin' },
      }),
    )
    renderAtLogin()
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Entrar' })

    await user.click(screen.getByRole('button', { name: 'Preencher Admin' }))
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument()
    expect(screen.getByText('admin@fastmeals.com')).toBeInTheDocument()
    expect(screen.getByText('Nenhum pedido neste filtro.')).toBeInTheDocument()
  })
})
