import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './Toast'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
