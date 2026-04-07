import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import MfaPromptModal from './components/ui/MfaPromptModal';
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
import { AllRecordingsPage } from './features/case-management/AllRecordingsPage';
import { AllVisitationsPage } from './features/case-management/AllVisitationsPage';
import { AllEducationPage } from './features/case-management/AllEducationPage';
import { AllHealthPage } from './features/case-management/AllHealthPage';
import { AllInterventionsPage } from './features/case-management/AllInterventionsPage';
import { AllIncidentsPage } from './features/case-management/AllIncidentsPage';
import { SupportersList } from './features/donors/SupportersList';
import { SupporterDetail } from './features/donors/SupporterDetail';
import { DonationsList } from './features/donors/DonationsList';
import { AllocationsList } from './features/donors/AllocationsList';
import { ReportsPage } from './features/reports/ReportsPage';
import { SocialAnalyticsPage } from './features/social-media/SocialAnalyticsPage';
import { SocialEditorPage } from './features/social-media/SocialEditorPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { DonatePage } from './features/donate/DonatePage';
import { UserManagementPage } from './features/admin/UserManagementPage';
import { PartnersList } from './features/partners/PartnersList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function NotFoundRedirect() {
  const { isAuthenticated } = useAuthStore();
  return <Navigate to={isAuthenticated ? '/admin' : '/'} replace />;
}

function AppContent() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaPromptShown, setMfaPromptShown] = useState(false);

  useEffect(() => {
    initialize().finally(() => setReady(true));
  }, [initialize]);

  useEffect(() => {
    if (!ready || !user || user.has2fa || mfaPromptShown) return;
    const key = `nd_mfa_prompt_${user.email}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      setShowMfaPrompt(true);
      setMfaPromptShown(true);
      return;
    }
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(stored).getTime() > sixMonths) {
      setShowMfaPrompt(true);
      setMfaPromptShown(true);
    }
  }, [ready, user?.email, user?.has2fa, mfaPromptShown]);

  function handleMfaSetupNow() {
    setShowMfaPrompt(false);
    navigate('/admin/profile');
  }

  function handleMfaRemindLater() {
    if (user?.email) {
      localStorage.setItem(`nd_mfa_prompt_${user.email}`, new Date().toISOString());
    }
    setShowMfaPrompt(false);
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-dark-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <MfaPromptModal
        isOpen={showMfaPrompt}
        onSetupNow={handleMfaSetupNow}
        onRemindLater={handleMfaRemindLater}
      />
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
        <Route path="/admin/case/recordings" element={<AllRecordingsPage />} />
        <Route path="/admin/case/visits" element={<AllVisitationsPage />} />
        <Route path="/admin/case/education" element={<AllEducationPage />} />
        <Route path="/admin/case/health" element={<AllHealthPage />} />
        <Route path="/admin/case/interventions" element={<AllInterventionsPage />} />
        <Route path="/admin/case/incidents" element={<AllIncidentsPage />} />
        <Route path="/admin/case/:residentId/recordings" element={<ProcessRecordingsPage />} />
        <Route path="/admin/case/:residentId/visits" element={<HomeVisitationsPage />} />
        <Route path="/admin/case/:residentId/education" element={<EducationRecordsPage />} />
        <Route path="/admin/case/:residentId/health" element={<HealthRecordsPage />} />
        <Route path="/admin/case/:residentId/interventions" element={<InterventionPlansPage />} />
        <Route path="/admin/case/:residentId/incidents" element={<IncidentReportsPage />} />
        <Route path="/admin/supporters" element={<SupportersList />} />
        <Route path="/admin/supporters/:id" element={<SupporterDetail />} />
        <Route path="/admin/donations" element={<DonationsList />} />
        <Route path="/admin/allocations" element={<AllocationsList />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/social" element={<SocialAnalyticsPage />} />
        <Route path="/admin/social/editor" element={<SocialEditorPage />} />
        <Route path="/admin/partners" element={
          <ProtectedRoute requiredRole="Admin">
            <PartnersList />
          </ProtectedRoute>
        } />
        <Route path="/admin/profile" element={<ProfilePage />} />
        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole="Admin">
            <UserManagementPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch-all: redirect instead of blank page */}
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
    </>
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
