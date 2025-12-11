/**
 * AccessAI Main Application
 * 
 * Accessible AI-powered social media content creation platform.
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OnboardingProvider, useOnboarding } from "./contexts/OnboardingContext";
import { OnboardingTour, WelcomeModal } from "./components/OnboardingTour";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Pages
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CreatePost from "./pages/CreatePost";
import KnowledgeBase from "./pages/KnowledgeBase";
import ContentCalendar from "./pages/ContentCalendar";
import Analytics from "./pages/Analytics";
import TeamManagement from "./pages/TeamManagement";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import VerifyEmail from "./pages/VerifyEmail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BlogAdmin from "./pages/BlogAdmin";
import TestimonialsAdmin from "./pages/TestimonialsAdmin";
import PlatformAnalytics from "./pages/PlatformAnalytics";
import ABTesting from "./pages/ABTesting";
import MastodonTemplates from "./pages/MastodonTemplates";
import Marketplace from "./pages/Marketplace";
import FollowedCollections from "./pages/FollowedCollections";

/** Protected Route wrapper */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    window.location.href = "/";
    return null;
  }
  
  return <Component />;
}

/** Onboarding wrapper for authenticated users */
function OnboardingWrapper() {
  const { user } = useAuth();
  const { 
    showWelcomeModal, 
    showTour, 
    startTour, 
    skipTour, 
    completeTour 
  } = useOnboarding();

  return (
    <>
      <WelcomeModal
        isOpen={showWelcomeModal}
        onStartTour={startTour}
        onSkip={skipTour}
        userName={user?.name?.split(" ")[0]}
      />
      <OnboardingTour
        isOpen={showTour}
        onComplete={completeTour}
        onSkip={skipTour}
      />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/create">{() => <ProtectedRoute component={CreatePost} />}</Route>
      <Route path="/knowledge">{() => <ProtectedRoute component={KnowledgeBase} />}</Route>
      <Route path="/calendar">{() => <ProtectedRoute component={ContentCalendar} />}</Route>
      <Route path="/analytics">{() => <ProtectedRoute component={Analytics} />}</Route>
      <Route path="/analytics/platforms">{() => <ProtectedRoute component={PlatformAnalytics} />}</Route>
      <Route path="/ab-testing">{() => <ProtectedRoute component={ABTesting} />}</Route>
      <Route path="/templates">{() => <ProtectedRoute component={MastodonTemplates} />}</Route>
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/followed-collections">{() => <ProtectedRoute component={FollowedCollections} />}</Route>
      <Route path="/team">{() => <ProtectedRoute component={TeamManagement} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/admin/blog">{() => <ProtectedRoute component={BlogAdmin} />}</Route>
      <Route path="/admin/testimonials">{() => <ProtectedRoute component={TestimonialsAdmin} />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  
  return (
    <>
      <Toaster />
      <Router />
      {isAuthenticated && <OnboardingWrapper />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <OnboardingProvider>
            <AppContent />
          </OnboardingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
