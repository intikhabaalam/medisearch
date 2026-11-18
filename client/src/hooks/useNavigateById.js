import { useNavigate } from 'react-router-dom';

export const ROUTES = {
  landing: '/',
  login: '/login',
  register: '/register',
  pharmacy: '/pharmacy',
  doctors: '/doctors',
  lab: '/lab',
  'product-detail': '/pharmacy',
  'doctor-booking': '/doctors',
  'lab-booking': '/lab',
  dashboard: '/auth/dashboard',
  orders: '/auth/orders',
  'my-appointments': '/auth/my-appointments',
  'my-lab-appointments': '/auth/my-lab-appointments',
  'doctor-apply': '/auth/doctor-apply',
  'pathologist-apply': '/auth/pathologist-apply',
  'ai-hub': '/auth/ai-hub',
  'ai-chat': '/auth/ai-chat',
  'ai-prescription': '/auth/ai-prescription',
  'ai-symptoms': '/auth/ai-symptoms',
  admin: '/auth/admin'
};

export default function useNavigateById() {
  const navigate = useNavigate();
  return (id) => {
    if (!id) return;
    const target = ROUTES[id] ?? (id.startsWith('/') ? id : `/${id}`);
    navigate(target);
  };
}
