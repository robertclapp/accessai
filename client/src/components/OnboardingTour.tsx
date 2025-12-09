/**
 * OnboardingTour Component
 * 
 * Provides an interactive guided tour for new users to learn
 * key features of AccessAI including voice input, accessibility
 * checking, and the content calendar.
 * 
 * Features:
 * - Step-by-step walkthrough with spotlight effect
 * - Keyboard navigation (arrow keys, escape to skip)
 * - Screen reader optimized with ARIA live regions
 * - Progress indicator
 * - Persistent completion tracking
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  CheckCircle, 
  Calendar, 
  PenTool, 
  BookOpen,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Accessibility
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  icon: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  startStep?: number;
}

// ============================================
// TOUR STEPS CONFIGURATION
// ============================================

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to AccessAI! 🎉",
    description: "Let's take a quick tour of the features that make content creation accessible and effortless. This will only take about 2 minutes.",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "voice-input",
    title: "Hands-Free Voice Input",
    description: "Create content without typing! Click the microphone button to start speaking. Our Whisper-powered AI will transcribe your words in real-time. Perfect for users who prefer voice input or have mobility considerations.",
    targetSelector: "[data-tour='voice-input']",
    icon: <Mic className="h-8 w-8 text-blue-500" />,
    position: "bottom"
  },
  {
    id: "accessibility-checker",
    title: "Real-Time Accessibility Scoring",
    description: "Every piece of content you create is automatically checked for accessibility. We analyze readability, hashtag formatting (CamelCase for screen readers), alt text, and more. Aim for a score of 80+ for truly inclusive content.",
    targetSelector: "[data-tour='accessibility-checker']",
    icon: <Accessibility className="h-8 w-8 text-green-500" />,
    position: "left"
  },
  {
    id: "post-builder",
    title: "Smart Post Builder",
    description: "Create posts optimized for each platform. Our AI learns your writing style and suggests content that sounds like you. Choose from templates or let AI generate ideas based on your knowledge base.",
    targetSelector: "[data-tour='post-builder']",
    icon: <PenTool className="h-8 w-8 text-purple-500" />,
    position: "right"
  },
  {
    id: "content-calendar",
    title: "Visual Content Calendar",
    description: "Plan and schedule your content visually. Drag and drop posts to reschedule, see your posting frequency at a glance, and never miss an important date. Posts are automatically published when scheduled.",
    targetSelector: "[data-tour='content-calendar']",
    icon: <Calendar className="h-8 w-8 text-orange-500" />,
    position: "bottom"
  },
  {
    id: "knowledge-base",
    title: "Your Knowledge Base",
    description: "Store your brand guidelines, swipe files, and custom instructions. The AI uses this information to generate content that's perfectly aligned with your brand voice and messaging.",
    targetSelector: "[data-tour='knowledge-base']",
    icon: <BookOpen className="h-8 w-8 text-teal-500" />,
    position: "bottom"
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description: "You now know the key features of AccessAI. Start creating accessible content that reaches everyone. You can restart this tour anytime from Settings.",
    icon: <CheckCircle className="h-8 w-8 text-green-500" />,
    position: "center"
  }
];

// ============================================
// SPOTLIGHT OVERLAY COMPONENT
// ============================================

interface SpotlightProps {
  targetRect: DOMRect | null;
  isVisible: boolean;
}

function Spotlight({ targetRect, isVisible }: SpotlightProps) {
  if (!isVisible || !targetRect) {
    return (
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity duration-300 z-40"
        aria-hidden="true"
      />
    );
  }

  const padding = 8;
  const borderRadius = 8;

  return (
    <div className="fixed inset-0 z-40" aria-hidden="true">
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#spotlight-mask)"
        />
        {/* Highlight border around target */}
        <rect
          x={targetRect.left - padding}
          y={targetRect.top - padding}
          width={targetRect.width + padding * 2}
          height={targetRect.height + padding * 2}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

// ============================================
// TOUR TOOLTIP COMPONENT
// ============================================

interface TourTooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
}

function TourTooltip({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  isLastStep,
  isFirstStep
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;

    let top = 0;
    let left = 0;

    if (step.position === "center" || !targetRect) {
      // Center in viewport
      top = (viewportHeight - tooltipRect.height) / 2;
      left = (viewportWidth - tooltipRect.width) / 2;
    } else {
      // Position relative to target
      switch (step.position) {
        case "top":
          top = targetRect.top - tooltipRect.height - margin;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case "bottom":
          top = targetRect.bottom + margin;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case "left":
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - margin;
          break;
        case "right":
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + margin;
          break;
        default:
          top = targetRect.bottom + margin;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      }

      // Keep tooltip in viewport
      if (left < margin) left = margin;
      if (left + tooltipRect.width > viewportWidth - margin) {
        left = viewportWidth - tooltipRect.width - margin;
      }
      if (top < margin) top = margin;
      if (top + tooltipRect.height > viewportHeight - margin) {
        top = viewportHeight - tooltipRect.height - margin;
      }
    }

    setPosition({ top, left });
  }, [step, targetRect]);

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Card
      ref={tooltipRef}
      className={cn(
        "fixed z-50 w-[400px] max-w-[90vw] shadow-2xl",
        "animate-in fade-in-0 zoom-in-95 duration-300"
      )}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-description"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {step.icon}
            <div>
              <CardTitle id="tour-title" className="text-lg">
                {step.title}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Step {currentStep + 1} of {totalSteps}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-2 -mt-2"
            onClick={onSkip}
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p id="tour-description" className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
        
        {step.action && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={step.action.onClick}
          >
            {step.action.label}
          </Button>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-3 pt-0">
        <Progress value={progress} className="h-1" aria-label={`Tour progress: ${Math.round(progress)}%`} />
        
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={onNext}
            className="gap-1"
          >
            {isLastStep ? (
              <>
                Get Started
                <CheckCircle className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// ============================================
// MAIN ONBOARDING TOUR COMPONENT
// ============================================

export function OnboardingTour({ isOpen, onComplete, onSkip, startStep = 0 }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(startStep);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(step.targetSelector!);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll target into view if needed
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    // Initial find
    findTarget();

    // Re-find on resize
    window.addEventListener("resize", findTarget);
    return () => window.removeEventListener("resize", findTarget);
  }, [isOpen, step]);

  // Announce step changes to screen readers
  useEffect(() => {
    if (announcerRef.current && step) {
      announcerRef.current.textContent = `Step ${currentStep + 1} of ${tourSteps.length}: ${step.title}. ${step.description}`;
    }
  }, [currentStep, step]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowRight":
      case "Enter":
        if (!isLastStep) {
          setCurrentStep(prev => prev + 1);
        } else {
          onComplete();
        }
        break;
      case "ArrowLeft":
        if (!isFirstStep) {
          setCurrentStep(prev => prev - 1);
        }
        break;
      case "Escape":
        onSkip();
        break;
    }
  }, [isOpen, isFirstStep, isLastStep, onComplete, onSkip]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when tour is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen || !step) return null;

  return createPortal(
    <>
      {/* Screen reader announcer */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Spotlight overlay */}
      <Spotlight 
        targetRect={targetRect} 
        isVisible={!!step.targetSelector && !!targetRect}
      />

      {/* Tour tooltip */}
      <TourTooltip
        step={step}
        currentStep={currentStep}
        totalSteps={tourSteps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={onSkip}
        isLastStep={isLastStep}
        isFirstStep={isFirstStep}
      />
    </>,
    document.body
  );
}

// ============================================
// WELCOME MODAL COMPONENT
// ============================================

interface WelcomeModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
  userName?: string;
}

export function WelcomeModal({ isOpen, onStartTour, onSkip, userName }: WelcomeModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <Card className="w-[500px] max-w-[90vw] animate-in fade-in-0 zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Accessibility className="h-8 w-8 text-primary" />
          </div>
          <CardTitle id="welcome-title" className="text-2xl">
            Welcome to AccessAI{userName ? `, ${userName}` : ""}! 👋
          </CardTitle>
          <CardDescription className="text-base mt-2">
            The accessibility-first content creation platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            We're excited to have you here! AccessAI helps you create inclusive 
            social media content with voice input, real-time accessibility checking, 
            and AI that learns your unique style.
          </p>
          
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mic className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Voice Input</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium">WCAG Checker</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium">Smart AI</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={onStartTour}
          >
            Take a Quick Tour (2 min)
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={onSkip}
          >
            Skip for now, I'll explore on my own
          </Button>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}

export default OnboardingTour;
