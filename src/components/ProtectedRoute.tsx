import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const jwt = useAuthStore((s) => s.jwt);
  if (!jwt) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
