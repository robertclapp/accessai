/**
 * Onboarding Context
 * 
 * Manages the state and logic for the user onboarding flow.
 * Tracks whether the user has completed the tour and provides
 * methods to start, skip, or restart the tour.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ============================================
// TYPES
// ============================================

interface OnboardingState {
  hasCompletedTour: boolean;
  showWelcomeModal: boolean;
  showTour: boolean;
  currentTourStep: number;
}

interface OnboardingContextValue extends OnboardingState {
  startTour: () => void;
  skipTour: () => void;
  completeTour: () => void;
  restartTour: () => void;
  dismissWelcomeModal: () => void;
  isLoading: boolean;
}

// ============================================
// CONTEXT
// ============================================

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  
  const [state, setState] = useState<OnboardingState>({
    hasCompletedTour: true, // Default to true to prevent flash
    showWelcomeModal: false,
    showTour: false,
    currentTourStep: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch onboarding status from server
  const { data: onboardingStatus } = trpc.settings.getOnboardingStatus.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      staleTime: Infinity // Only fetch once per session
    }
  );

  // Update onboarding status mutation
  const updateOnboardingMutation = trpc.settings.updateOnboardingStatus.useMutation({
    onSuccess: () => {
      utils.settings.getOnboardingStatus.invalidate();
    }
  });

  // Initialize state from server data
  useEffect(() => {
    if (onboardingStatus !== undefined) {
      const hasCompleted = onboardingStatus?.hasCompletedTour ?? false;
      setState(prev => ({
        ...prev,
        hasCompletedTour: hasCompleted,
        // Show welcome modal for new users who haven't completed the tour
        showWelcomeModal: !hasCompleted && isAuthenticated
      }));
      setIsLoading(false);
    }
  }, [onboardingStatus, isAuthenticated]);

  // Start the tour
  const startTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      showWelcomeModal: false,
      showTour: true,
      currentTourStep: 0
    }));
  }, []);

  // Skip the tour (dismiss without completing)
  const skipTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      showWelcomeModal: false,
      showTour: false,
      hasCompletedTour: true
    }));
    
    // Save to server
    updateOnboardingMutation.mutate({
      hasCompletedTour: true,
      tourSkipped: true
    });
  }, [updateOnboardingMutation]);

  // Complete the tour
  const completeTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      showTour: false,
      hasCompletedTour: true
    }));
    
    // Save to server
    updateOnboardingMutation.mutate({
      hasCompletedTour: true,
      tourCompletedAt: new Date().toISOString()
    });
  }, [updateOnboardingMutation]);

  // Restart the tour (from settings)
  const restartTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      showWelcomeModal: false,
      showTour: true,
      currentTourStep: 0
    }));
  }, []);

  // Dismiss welcome modal without starting tour
  const dismissWelcomeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showWelcomeModal: false
    }));
  }, []);

  const value: OnboardingContextValue = {
    ...state,
    startTour,
    skipTour,
    completeTour,
    restartTour,
    dismissWelcomeModal,
    isLoading
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  
  return context;
}

export default OnboardingContext;
