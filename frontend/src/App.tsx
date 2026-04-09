import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useEffect, useState } from 'react';
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
import { DonatePage } from './features/donate/DonatePage';

const AdminDashboard = lazy(async () => ({ default: (await import('./features/dashboard/AdminDashboard')).AdminDashboard }));
const ResidentsList = lazy(async () => ({ default: (await import('./features/residents/ResidentsList')).ResidentsList }));
const ResidentDetail = lazy(async () => ({ default: (await import('./features/residents/ResidentDetail')).ResidentDetail }));
const ProcessRecordingsPage = lazy(async () => ({ default: (await import('./features/case-management/ProcessRecordingsPage')).ProcessRecordingsPage }));
const HomeVisitationsPage = lazy(async () => ({ default: (await import('./features/case-management/HomeVisitationsPage')).HomeVisitationsPage }));
const EducationRecordsPage = lazy(async () => ({ default: (await import('./features/case-management/EducationRecordsPage')).EducationRecordsPage }));
const HealthRecordsPage = lazy(async () => ({ default: (await import('./features/case-management/HealthRecordsPage')).HealthRecordsPage }));
const InterventionPlansPage = lazy(async () => ({ default: (await import('./features/case-management/InterventionPlansPage')).InterventionPlansPage }));
const IncidentReportsPage = lazy(async () => ({ default: (await import('./features/case-management/IncidentReportsPage')).IncidentReportsPage }));
const AllRecordingsPage = lazy(async () => ({ default: (await import('./features/case-management/AllRecordingsPage')).AllRecordingsPage }));
const AllVisitationsPage = lazy(async () => ({ default: (await import('./features/case-management/AllVisitationsPage')).AllVisitationsPage }));
const AllEducationPage = lazy(async () => ({ default: (await import('./features/case-management/AllEducationPage')).AllEducationPage }));
const AllHealthPage = lazy(async () => ({ default: (await import('./features/case-management/AllHealthPage')).AllHealthPage }));
const AllInterventionsPage = lazy(async () => ({ default: (await import('./features/case-management/AllInterventionsPage')).AllInterventionsPage }));
const AllIncidentsPage = lazy(async () => ({ default: (await import('./features/case-management/AllIncidentsPage')).AllIncidentsPage }));
const SupportersList = lazy(async () => ({ default: (await import('./features/donors/SupportersList')).SupportersList }));
const SupporterDetail = lazy(async () => ({ default: (await import('./features/donors/SupporterDetail')).SupporterDetail }));
const DonationsList = lazy(async () => ({ default: (await import('./features/donors/DonationsList')).DonationsList }));
const AllocationsList = lazy(async () => ({ default: (await import('./features/donors/AllocationsList')).AllocationsList }));
const ReportsPage = lazy(async () => ({ default: (await import('./features/reports/ReportsPage')).ReportsPage }));
const SocialAnalyticsPage = lazy(async () => ({ default: (await import('./features/social-media/SocialAnalyticsPage')).SocialAnalyticsPage }));
const SocialEditorPage = lazy(async () => ({ default: (await import('./features/social-media/SocialEditorPage')).SocialEditorPage }));
const ProfilePage = lazy(async () => ({ default: (await import('./features/profile/ProfilePage')).ProfilePage }));
const UserManagementPage = lazy(async () => ({ default: (await import('./features/admin/UserManagementPage')).UserManagementPage }));
const PartnersList = lazy(async () => ({ default: (await import('./features/partners/PartnersList')).PartnersList }));

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

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-3xl bg-white/70 dark:bg-slate-navy/40">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-blue border-t-transparent" />
    </div>
  );
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
        <Route path="/admin" element={<Suspense fallback={<RouteLoadingFallback />}><AdminDashboard /></Suspense>} />
        <Route path="/admin/residents" element={<Suspense fallback={<RouteLoadingFallback />}><ResidentsList /></Suspense>} />
        <Route path="/admin/residents/new" element={<Suspense fallback={<RouteLoadingFallback />}><ResidentDetail /></Suspense>} />
        <Route path="/admin/residents/:id" element={<Suspense fallback={<RouteLoadingFallback />}><ResidentDetail /></Suspense>} />
        <Route path="/admin/case/recordings" element={<Suspense fallback={<RouteLoadingFallback />}><AllRecordingsPage /></Suspense>} />
        <Route path="/admin/case/visits" element={<Suspense fallback={<RouteLoadingFallback />}><AllVisitationsPage /></Suspense>} />
        <Route path="/admin/case/education" element={<Suspense fallback={<RouteLoadingFallback />}><AllEducationPage /></Suspense>} />
        <Route path="/admin/case/health" element={<Suspense fallback={<RouteLoadingFallback />}><AllHealthPage /></Suspense>} />
        <Route path="/admin/case/interventions" element={<Suspense fallback={<RouteLoadingFallback />}><AllInterventionsPage /></Suspense>} />
        <Route path="/admin/case/incidents" element={<Suspense fallback={<RouteLoadingFallback />}><AllIncidentsPage /></Suspense>} />
        <Route path="/admin/case/:residentId/recordings" element={<Suspense fallback={<RouteLoadingFallback />}><ProcessRecordingsPage /></Suspense>} />
        <Route path="/admin/case/:residentId/visits" element={<Suspense fallback={<RouteLoadingFallback />}><HomeVisitationsPage /></Suspense>} />
        <Route path="/admin/case/:residentId/education" element={<Suspense fallback={<RouteLoadingFallback />}><EducationRecordsPage /></Suspense>} />
        <Route path="/admin/case/:residentId/health" element={<Suspense fallback={<RouteLoadingFallback />}><HealthRecordsPage /></Suspense>} />
        <Route path="/admin/case/:residentId/interventions" element={<Suspense fallback={<RouteLoadingFallback />}><InterventionPlansPage /></Suspense>} />
        <Route path="/admin/case/:residentId/incidents" element={<Suspense fallback={<RouteLoadingFallback />}><IncidentReportsPage /></Suspense>} />
        <Route path="/admin/supporters" element={<Suspense fallback={<RouteLoadingFallback />}><SupportersList /></Suspense>} />
        <Route path="/admin/supporters/:id" element={<Suspense fallback={<RouteLoadingFallback />}><SupporterDetail /></Suspense>} />
        <Route path="/admin/donations" element={<Suspense fallback={<RouteLoadingFallback />}><DonationsList /></Suspense>} />
        <Route path="/admin/allocations" element={<Suspense fallback={<RouteLoadingFallback />}><AllocationsList /></Suspense>} />
        <Route path="/admin/reports" element={<Suspense fallback={<RouteLoadingFallback />}><ReportsPage /></Suspense>} />
        <Route path="/admin/social" element={<Suspense fallback={<RouteLoadingFallback />}><SocialAnalyticsPage /></Suspense>} />
        <Route path="/admin/social/editor" element={<Suspense fallback={<RouteLoadingFallback />}><SocialEditorPage /></Suspense>} />
        <Route path="/admin/partners" element={
          <ProtectedRoute requiredRole="Admin">
            <Suspense fallback={<RouteLoadingFallback />}><PartnersList /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/admin/profile" element={<Suspense fallback={<RouteLoadingFallback />}><ProfilePage /></Suspense>} />
        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole="Admin">
            <Suspense fallback={<RouteLoadingFallback />}><UserManagementPage /></Suspense>
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
