import './App.css'
import { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import OnboardingWizard from './pages/OnboardingWizard';
import AdminPortal from './pages/AdminPortal';
import MesDossiers from './pages/MesDossiers';
import AdminOverview from './pages/AdminOverview';
import ActesModificatifs from './pages/ActesModificatifs';
import EntrepreneurPortal from './pages/EntrepreneurPortal';
import Procedures from './pages/Procedures';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/mobile/PageTransition';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect on login based on role
  const ADMIN_EMAILS = ['remoz.giovanni@meras.io'];
  const ADMIN_PATHS = ['/AdminPortal', '/AdminOverview', '/ActesModificatifs'];
  const ENTREPRENEUR_PATHS = ['/entrepreneur', '/MesDossiers'];

  useEffect(() => {
    if (isLoadingAuth || !user) return;
    const path = location.pathname;
    const isAdmin = user.role === 'admin' || user.role === 'agent' || ADMIN_EMAILS.includes(user.email);

    if (isAdmin) {
      // Admin/Agent landing on entrepreneur-only pages or root → send to admin portal
      if (path === '/' || ENTREPRENEUR_PATHS.some(p => path.startsWith(p))) {
        navigate('/AdminPortal', { replace: true });
      }
    } else {
      // Entrepreneur landing on admin-only pages or root → send to entrepreneur portal
      if (path === '/' || ADMIN_PATHS.some(p => path.startsWith(p))) {
        navigate('/entrepreneur', { replace: true });
      }
    }
  }, [isLoadingAuth, user, location.pathname, navigate]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPublicPage = location.pathname === '/' || location.pathname === '/onboarding';

  if (authError && !isPublicPage) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <PageTransition><MainPage /></PageTransition>
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <PageTransition><Page /></PageTransition>
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/AdminPortal" element={<LayoutWrapper currentPageName="AdminPortal"><AdminPortal /></LayoutWrapper>} />
        <Route path="/MesDossiers" element={<LayoutWrapper currentPageName="MesDossiers"><MesDossiers /></LayoutWrapper>} />
        <Route path="/ActesModificatifs" element={<LayoutWrapper currentPageName="ActesModificatifs"><ActesModificatifs /></LayoutWrapper>} />
        <Route path="/entrepreneur" element={<LayoutWrapper currentPageName="EntrepreneurPortal"><EntrepreneurPortal /></LayoutWrapper>} />
        <Route path="/procedures" element={<Procedures />} />
        <Route
          path="/AdminOverview"
          element={
            <LayoutWrapper currentPageName="AdminOverview">
              <PageTransition><AdminOverview /></PageTransition>
            </LayoutWrapper>
          }
        />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App