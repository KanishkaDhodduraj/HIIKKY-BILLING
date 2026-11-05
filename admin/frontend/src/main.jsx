import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import OwnersPage from './pages/OwnersPage';
import OrganizationsPage from './pages/OrganizationsPage';
import AccountsPage from './pages/AccountsPage';
import ProfilePage from './pages/ProfilePage';
import RequestsPage from './pages/RequestsPage';
import GatewaysPage from './pages/GatewaysPage';
import AnalyticsPage from './pages/AnalyticsPage';
import RevenuePage from './pages/RevenuePage';
import SupportPage from './pages/SupportPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import PlansPage from './pages/PlansPage';
import ReportsPage from './pages/ReportsPage';
import { Listing } from './pages/AdminPages';
import './styles/index.css';

function RoleHome() { const { user } = useAuth(); return <Navigate to={user ? '/admin/dashboard' : '/login'} replace />; }
function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<RoleHome/>}/><Route path="/login" element={<Login/>}/>
    <Route element={<ProtectedRoute roles={['ADMIN','SUPER_ADMIN']}/> }><Route path="/admin" element={<AdminLayout/>}>
      <Route index element={<RoleHome/>}/><Route path="dashboard" element={<DashboardPage/>}/><Route path="business-requests" element={<RequestsPage/>}/>
      <Route element={<ProtectedRoute roles={['SUPER_ADMIN']}/> }><Route path="owners" element={<OwnersPage/>}/><Route path="plans" element={<PlansPage/>}/><Route path="analytics" element={<AnalyticsPage/>}/><Route path="revenue" element={<RevenuePage/>}/><Route path="support" element={<SupportPage/>}/><Route path="accounts" element={<AccountsPage/>}/><Route path="notifications" element={<NotificationsPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="reports" element={<ReportsPage/>}/></Route>
      <Route path="payment-gateway" element={<GatewaysPage/>}/><Route path="organizations" element={<OrganizationsPage/>}/><Route path="profile" element={<ProfilePage/>}/>
    </Route></Route><Route path="*" element={<RoleHome/>}/>
  </Routes></BrowserRouter></AuthProvider>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
