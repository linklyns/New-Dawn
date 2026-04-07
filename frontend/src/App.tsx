import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { LandingPage } from './features/landing/LandingPage';
import { ImpactDashboard } from './features/impact/ImpactDashboard';
import { PrivacyPolicyPage } from './features/privacy/PrivacyPolicyPage';
import { CookieConsentBanner } from './features/privacy/CookieConsentBanner';
import { AdminDashboard } from './features/dashboard/AdminDashboard';
import { ResidentsList } from './features/residents/ResidentsList';
import { ResidentDetail } from './features/residents/ResidentDetail';
import { ProcessRecordingsPage } from './features/case-management/ProcessRecordingsPage';
import { HomeVisitationsPage } from './features/case-management/HomeVisitationsPage';
import { EducationRecordsPage } from './features/case-management/EducationRecordsPage';
import { HealthRecordsPage } from './features/case-management/HealthRecordsPage';
import { InterventionPlansPage } from './features/case-management/InterventionPlansPage';
import { IncidentReportsPage } from './features/case-management/IncidentReportsPage';
import { SupportersList } from './features/donors/SupportersList';
import { SupporterDetail } from './features/donors/SupporterDetail';
import { DonationsList } from './features/donors/DonationsList';
import { ReportsPage } from './features/reports/ReportsPage';
import { SocialAnalyticsPage } from './features/social-media/SocialAnalyticsPage';
import { SocialEditorPage } from './features/social-media/SocialEditorPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { DonatePage } from './features/donate/DonatePage';
import { UserManagementPage } from './features/admin/UserManagementPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppContent() {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AppShell variant="public" />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/impact" element={<ImpactDashboard />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Admin routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell variant="admin" />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/residents" element={<ResidentsList />} />
        <Route path="/admin/residents/new" element={<ResidentDetail />} />
        <Route path="/admin/residents/:id" element={<ResidentDetail />} />
        <Route path="/admin/case/:residentId/recordings" element={<ProcessRecordingsPage />} />
        <Route path="/admin/case/:residentId/visits" element={<HomeVisitationsPage />} />
        <Route path="/admin/case/:residentId/education" element={<EducationRecordsPage />} />
        <Route path="/admin/case/:residentId/health" element={<HealthRecordsPage />} />
        <Route path="/admin/case/:residentId/interventions" element={<InterventionPlansPage />} />
        <Route path="/admin/case/:residentId/incidents" element={<IncidentReportsPage />} />
        <Route path="/admin/supporters" element={<SupportersList />} />
        <Route path="/admin/supporters/:id" element={<SupporterDetail />} />
        <Route path="/admin/donations" element={<DonationsList />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/social" element={<SocialAnalyticsPage />} />
        <Route path="/admin/social/editor" element={<SocialEditorPage />} />
        <Route path="/admin/profile" element={<ProfilePage />} />
        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole="Admin">
            <UserManagementPage />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
        <CookieConsentBanner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
