import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import OwnerLayout from './layouts/OwnerLayout';
import { ForgotPasswordPage, LoginPage, SetPasswordPage, SignupPage } from './pages/AuthPages';
import { RegistrationPage, RegistrationStatusPage, VerificationPage } from './pages/RegistrationPage';
import { DashboardPage, UsersPage, PlansPage, CoursesPage, RevenuePage, SubscriptionAnalyticsPage, DiscountsPage, ReportsPage, NotificationsPage } from './pages/OwnerPages';
import BillingPages from './pages/BillingPages';
import SettingsPage from './pages/SettingsPage';
import StudentsPage from './pages/StudentsPage';

export default function App(){return <BrowserRouter><AuthProvider><Routes>
 <Route path="/" element={<Navigate to="/owner/dashboard" replace/>}/>
 <Route path="/owner/login" element={<LoginPage/>}/><Route path="/owner/signup" element={<SignupPage/>}/><Route path="/owner/registration" element={<RegistrationPage/>}/><Route path="/owner/registration/verification" element={<VerificationPage/>}/><Route path="/owner/registration/status" element={<RegistrationStatusPage/>}/><Route path="/owner/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/owner/set-password" element={<SetPasswordPage/>}/>
 <Route path="/owner" element={<ProtectedRoute><OwnerLayout/></ProtectedRoute>}>
  <Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<DashboardPage/>}/><Route path="users" element={<UsersPage/>}/><Route path="students" element={<StudentsPage/>}/><Route path="subscription-plans" element={<PlansPage/>}/><Route path="courses" element={<CoursesPage/>}/><Route path="billing" element={<BillingPages/>}/><Route path="invoices" element={<BillingPages invoiceOnly/>}/><Route path="revenue-analytics" element={<RevenuePage/>}/><Route path="subscription-analytics" element={<SubscriptionAnalyticsPage/>}/><Route path="discounts" element={<DiscountsPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="notifications" element={<NotificationsPage/>}/><Route path="settings" element={<SettingsPage/>}/>
 </Route><Route path="*" element={<Navigate to="/owner/dashboard" replace/>}/>
</Routes></AuthProvider></BrowserRouter>}
