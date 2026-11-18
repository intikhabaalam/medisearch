import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProductListingPage from './pages/pharmacy/ProductListingPage';
import ProductDetailPage from './pages/pharmacy/ProductDetailPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import DoctorListingPage from './pages/doctors/DoctorListingPage';
import DoctorBookingPage from './pages/doctors/DoctorBookingPage';
import MyAppointmentsPage from './pages/doctors/MyAppointmentsPage';
import DoctorApplicationPage from './pages/doctors/DoctorApplicationPage';
import LabTestListingPage from './pages/lab/LabTestListingPage';
import BookLabTestPage from './pages/lab/BookLabTestPage';
import MyLabAppointmentsPage from './pages/lab/MyLabAppointmentsPage';
import PathologistApplicationPage from './pages/lab/PathologistApplicationPage';
import AiHubPage from './pages/ai/AiHubPage';
import AiChatPage from './pages/ai/AiChatPage';
import PrescriptionExplainerPage from './pages/ai/PrescriptionExplainerPage';
import FindMedicinesBySymptomPage from './pages/ai/FindMedicinesBySymptomPage';
import UserDashboardPage from './pages/dashboard/UserDashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import PrivateComponent from './components/PrivateComponent';
import { useSelector } from 'react-redux';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminDoctorsPage from './pages/admin/AdminDoctorsPage';
import AdminPathologistsPage from './pages/admin/AdminPathologistsPage';
import AdminAllUsersPage from './pages/admin/AdminAllUsersPage';
import AdminRoute from './components/AdminRoute';

// Create a client
const queryClient = new QueryClient();

export default function App() {

  const { user } = useSelector(state => state.auth)


  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pharmacy" element={<ProductListingPage />} />
          <Route path="/pharmacy/:id" element={<ProductDetailPage />} />
          <Route path="/doctors" element={<DoctorListingPage />} />
          <Route path="/doctors/:id/book" element={<DoctorBookingPage />} />
          <Route path="/lab" element={<LabTestListingPage />} />
          <Route path="/lab/book" element={<BookLabTestPage />} />
          {/* Top-level AI route aliases routing to protected auth routes */}
          <Route path="/ai-hub" element={<Navigate to="/auth/ai-hub" replace />} />
          <Route path="/ai-chat" element={<Navigate to="/auth/ai-chat" replace />} />
          <Route path="/ai-prescription" element={<Navigate to="/auth/ai-prescription" replace />} />
          <Route path="/ai-symptoms" element={<Navigate to="/auth/ai-symptoms" replace />} />
          <Route path="/dashboard" element={<Navigate to="/auth/dashboard" replace />} />
          <Route path="/orders" element={<Navigate to="/auth/orders" replace />} />
          <Route path='/auth' element={<PrivateComponent />}>
            <Route path="dashboard" element={<UserDashboardPage />} />
            <Route path="orders" element={<MyOrdersPage />} />
            <Route path="my-appointments" element={<MyAppointmentsPage />} />
            <Route path="my-lab-appointments" element={<MyLabAppointmentsPage />} />
            <Route path="doctor-apply" element={<DoctorApplicationPage />} />
            <Route path="pathologist-apply" element={<PathologistApplicationPage />} />
            <Route path="ai-hub" element={<AiHubPage />} />
            <Route path="ai-chat" element={<AiChatPage />} />
            <Route path="ai-prescription" element={<PrescriptionExplainerPage />} />
            <Route path="ai-symptoms" element={<FindMedicinesBySymptomPage />} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="admin/orders" element={<AdminOrdersPage />} />
              <Route path="admin/products" element={<AdminProductsPage />} />
              <Route path="admin/doctors" element={<AdminDoctorsPage />} />
              <Route path="admin/pathologists" element={<AdminPathologistsPage />} />
              <Route path="admin/users" element={<AdminAllUsersPage />} />
            </Route>
          </Route>
        </Routes>
        {
          user?.userType !== "ADMIN" && <Footer />
        }
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
