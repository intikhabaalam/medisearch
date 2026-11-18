const { execSync } = require('child_process');

const editedFiles = [
  'src/hooks/useNavigateById.js',
  'src/components/layout/Footer.jsx',
  'src/pages/LandingPage.jsx',
  'src/pages/admin/AdminAllUsersPage.jsx',
  'src/pages/admin/AdminDashboardPage.jsx',
  'src/pages/admin/AdminDoctorsPage.jsx',
  'src/pages/admin/AdminOrdersPage.jsx',
  'src/pages/admin/AdminPathologistsPage.jsx',
  'src/pages/admin/AdminProductsPage.jsx',
  'src/pages/ai/AiChatPage.jsx',
  'src/pages/ai/AiHubPage.jsx',
  'src/pages/ai/FindMedicinesBySymptomPage.jsx',
  'src/pages/ai/PrescriptionExplainerPage.jsx',
  'src/pages/auth/LoginPage.jsx',
  'src/pages/auth/RegisterPage.jsx',
  'src/pages/dashboard/UserDashboardPage.jsx',
  'src/pages/doctors/DoctorApplicationPage.jsx',
  'src/pages/doctors/DoctorBookingPage.jsx',
  'src/pages/doctors/DoctorListingPage.jsx',
  'src/pages/doctors/MyAppointmentsPage.jsx',
  'src/pages/lab/BookLabTestPage.jsx',
  'src/pages/lab/LabTestListingPage.jsx',
  'src/pages/lab/MyLabAppointmentsPage.jsx',
  'src/pages/lab/PathologistApplicationPage.jsx',
  'src/pages/orders/MyOrdersPage.jsx',
  'src/pages/pharmacy/ProductDetailPage.jsx',
  'src/pages/pharmacy/ProductListingPage.jsx',
  'src/components/layout/Navbar.jsx',
  'src/App.jsx',
  'src/components/AdminRoute.jsx',
  'src/components/PrivateComponent.jsx',
  'src/pages/admin/AddProductModal.jsx',
  'src/services/medicalService.jsx',
  'src/services/adminService.jsx',
  'src/components/ProfileForm.jsx',
  'src/components/admin/AdminSidebar.jsx',
  'src/components/common/Sidebar.jsx',
  'src/services/authService.jsx',
  'src/hooks/useAuthStatus.jsx',
  'tailwind.config.js',
  'vite.config.js',
  'src/main.jsx'
];

const stdout = execSync('npx oxlint -f json', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const json = JSON.parse(stdout);

const byFile = {};

for (const item of json.diagnostics) {
  const file = item.filename.replace(/\\/g, '/');
  const matched = editedFiles.find(f => file.endsWith(f));
  if (!matched) continue;
  if (!byFile[matched]) byFile[matched] = [];
  byFile[matched].push({
    rule: item.code || item.ruleId,
    msg: item.message
  });
}

for (const [f, items] of Object.entries(byFile)) {
  console.log('=== ' + f + ' ===');
  for (const it of items) {
    console.log(`  [${it.rule}] ${it.msg}`);
  }
}
