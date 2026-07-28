import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { School } from 'lucide-react';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import ScrollRestoration from './components/ScrollRestoration';
import ErrorBoundary from './components/ErrorBoundary';
import SyncStatus from './components/SyncStatus';
import { ToastProvider } from './context/ToastContext';
import SEO from './components/SEO';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const Invitations = lazy(() => import('./pages/admin/Invitations'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetails = lazy(() => import('./pages/StudentDetails'));
const Payments = lazy(() => import('./pages/Payments'));
const Settings = lazy(() => import('./pages/Settings'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentReportCard = lazy(() => import('./pages/StudentReportCard'));
const LandingCMS = lazy(() => import('./pages/admin/LandingCMS'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const UserDetail = lazy(() => import('./pages/admin/UserDetail'));
const PendingApprovals = lazy(() => import('./pages/admin/PendingApprovals'));
const MinistryReports = lazy(() => import('./pages/admin/MinistryReports'));
const NotificationCenter = lazy(() => import('./pages/admin/NotificationCenter'));
const Registrations = lazy(() => import('./pages/admin/Registrations'));

function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <SEO title="Page Not Found" noindex />
      <div className="text-center space-y-4">
        <School className="w-16 h-16 text-primary mx-auto" />
        <h1 className="text-3xl font-bold text-on-background">404</h1>
        <p className="text-secondary">Page not found</p>
        <a href="/" className="inline-block text-sm text-primary hover:underline">Go home</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
      <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin', 'teacher', 'accountant', 'supervisor']}><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetails />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
          <Route path="pending" element={<PendingApprovals />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="invitations" element={<ProtectedRoute roles={['admin']}><Invitations /></ProtectedRoute>} />
          <Route path="landing" element={<ProtectedRoute roles={['admin']}><LandingCMS /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute roles={['admin', 'supervisor']}><MinistryReports /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute roles={['admin']}><NotificationCenter /></ProtectedRoute>} />
          <Route path="registrations" element={<ProtectedRoute roles={['admin']}><Registrations /></ProtectedRoute>} />
        </Route>
        <Route path="/parent" element={<ProtectedRoute roles={['parent']}><PortalLayout icon="school" label="Parent Portal" /></ProtectedRoute>}>
          <Route index element={<ParentDashboard />} />
        </Route>
        <Route path="/student" element={<ProtectedRoute roles={['student']}><PortalLayout icon="graduation" label="Student Portal" /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path="report-card" element={<StudentReportCard />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      <ScrollRestoration />
      <ScrollToTop />
      <SyncStatus />
    </ToastProvider>
  );
}
