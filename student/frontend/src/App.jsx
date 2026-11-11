import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import StudentLayout from './layouts/StudentLayout';
import { LoginPage, PasswordLinkPage, RegisterPage, RegistrationSubmittedPage } from './pages/AuthPages';
import DashboardPage from './pages/DashboardPage';
import { CourseDetailPage, CoursesPage } from './pages/CoursesPage';
import { InvoicesPage, PaymentsPage } from './pages/BillingPages';
import { AutoPayPage, AutoRenewPage, NotificationsPage, ProfilePage } from './pages/SettingsPages';
import SubscriptionPage from './pages/SubscriptionPage';

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
    <Route path="/student/login" element={<LoginPage />} />
    <Route path="/student/register" element={<RegisterPage />} />
    <Route path="/student/register/submitted" element={<RegistrationSubmittedPage />} />
    <Route path="/student/set-password" element={<PasswordLinkPage reset />} />
    <Route path="/student/reset-password" element={<PasswordLinkPage reset />} />
    <Route path="/student/forgot-password" element={<PasswordLinkPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="auto-pay" element={<AutoPayPage />} />
        <Route path="auto-renew" element={<AutoRenewPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
