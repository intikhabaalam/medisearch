import { useSelector } from 'react-redux';
import { Outlet, Navigate } from 'react-router-dom';

export default function AdminRoute() {
  const { user } = useSelector((s) => s.auth);
  return user?.userType === 'ADMIN' ? <Outlet /> : <Navigate to="/auth/dashboard" replace />;
}
