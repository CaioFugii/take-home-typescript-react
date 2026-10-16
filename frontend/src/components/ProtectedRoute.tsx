import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink">
        <p className="font-display text-2xl">Abrindo o painel...</p>
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink">
        <p className="font-display text-2xl">Abrindo o painel...</p>
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/pedidos" replace />
  }

  return <Outlet />
}
