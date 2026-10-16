import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { AssignmentPage } from './pages/AssignmentPage'
import { DeliveryPersonsPage } from './pages/DeliveryPersonsPage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReportsPage } from './pages/ReportsPage'

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/pedidos" replace />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/entregadores" element={<DeliveryPersonsPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/atribuicao" element={<AssignmentPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/pedidos" replace />} />
    </Routes>
  )
}
