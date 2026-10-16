import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/pedidos', label: 'Pedidos', hint: 'Fila e status' },
  { to: '/produtos', label: 'Produtos', hint: 'Cardápio' },
  { to: '/entregadores', label: 'Entregadores', hint: 'Equipe' },
  { to: '/relatorios', label: 'Relatórios', hint: 'Métricas' },
  { to: '/atribuicao', label: 'Atribuição', hint: 'Rotas' },
]

const roleLabel = {
  admin: 'Admin',
  viewer: 'Leitura',
} as const

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-paper text-ink">
      <aside className="flex flex-col bg-moss px-5 py-6 text-[#f6f1e7]">
        <div className="px-2">
          <p className="text-xs uppercase tracking-[0.22em] text-[#d7c7a4]">FastMeals</p>
          <h1 className="mt-2 font-display text-3xl leading-none">Operação</h1>
        </div>
        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Seções">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-3 transition ${
                  isActive ? 'bg-[#f4efe6] text-ink' : 'text-[#efe6d6] hover:bg-white/10'
                }`
              }
            >
              <span className="block text-sm font-medium">{link.label}</span>
              <span className="block text-xs opacity-70">{link.hint}</span>
            </NavLink>
          ))}
        </nav>
        <p className="px-2 text-xs text-[#d7c7a4]">Painel interno de entrega</p>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-line px-8 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a7b68]">Sessão</p>
            <p className="mt-1 text-sm">
              {user?.email}
              <span className="ml-2 rounded-full bg-[#efe4d2] px-2 py-0.5 text-xs font-medium">
                {user ? roleLabel[user.role] : ''}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="rounded-full border border-ink px-4 py-2 text-sm font-medium transition hover:bg-ink hover:text-paper"
          >
            Sair
          </button>
        </header>
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
