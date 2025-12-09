/**
 * Email Verification Banner Component
 * 
 * Displays a prominent banner for users who haven't verified their email.
 * Includes resend functionality with rate limiting feedback.
 * Fully accessible with ARIA labels and keyboard navigation.
 */

import { useState, useEffect } from "react";
import { Mail, X, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

interface EmailVerificationBannerProps {
  /** Whether to show the banner in compact mode */
  compact?: boolean;
  /** Callback when verification is complete */
  onVerified?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function EmailVerificationBanner({
  compact = false,
  onVerified,
}: EmailVerificationBannerProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [countdown, setCountdown] = useState(0);

  // Fetch verification status
  const { data: verificationStatus, refetch: refetchStatus } = trpc.auth.verificationStatus.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch resend availability
  const { data: resendStatus, refetch: refetchResend } = trpc.auth.canResendVerification.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Send verification email mutation
  const sendEmailMutation = trpc.auth.sendVerificationEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Verification email sent!", {
          description: "Please check your inbox and spam folder.",
        });
        setShowEmailDialog(false);
        refetchResend();
      } else {
        toast.error("Failed to send email", {
          description: result.message,
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to send email", {
        description: String(error),
      });
    },
  });

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendStatus?.waitTimeSeconds && resendStatus.waitTimeSeconds > 0) {
      setCountdown(resendStatus.waitTimeSeconds);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            refetchResend();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendStatus?.waitTimeSeconds, refetchResend]);

  // Check if verified and call callback
  useEffect(() => {
    if (verificationStatus?.isVerified && onVerified) {
      onVerified();
    }
  }, [verificationStatus?.isVerified, onVerified]);

  // Don't show if verified or dismissed
  if (!user || verificationStatus?.isVerified || isDismissed) {
    return null;
  }

  const handleSendEmail = () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    sendEmailMutation.mutate({ email });
  };

  const canResend = resendStatus?.canResend && countdown === 0;

  // Compact mode - just a small indicator
  if (compact) {
    return (
      <button
        onClick={() => setShowEmailDialog(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        aria-label="Email not verified. Click to verify your email."
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span>Verify Email</span>
      </button>
    );
  }

  return (
    <>
      <Alert
        className="mb-4 border-amber-200 bg-amber-50"
        role="alert"
        aria-live="polite"
      >
        <Mail className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <AlertTitle className="text-amber-800">Verify your email</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p className="mb-3">
            Please verify your email address to unlock all features including post scheduling,
            team collaboration, and premium AI capabilities.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setShowEmailDialog(true)}
              disabled={!canResend}
              aria-describedby={countdown > 0 ? "resend-countdown" : undefined}
            >
              {countdown > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Resend in {countdown}s
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                  Send Verification Email
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss verification reminder"
            >
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Remind me later
            </Button>
          </div>
          {countdown > 0 && (
            <p id="resend-countdown" className="sr-only">
              You can resend the verification email in {countdown} seconds.
            </p>
          )}
          {resendStatus?.attemptsRemaining !== undefined && (
            <p className="text-xs mt-2 text-amber-600">
              {resendStatus.attemptsRemaining} verification attempts remaining today
            </p>
          )}
        </AlertDescription>
      </Alert>

      {/* Email Input Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
            <DialogDescription>
              Enter your email address to receive a verification link.
              The link will expire in 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verification-email">Email Address</Label>
              <Input
                id="verification-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="email-help"
                autoComplete="email"
              />
              <p id="email-help" className="text-sm text-muted-foreground">
                We'll send a verification link to this address.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || !email}
            >
              {sendEmailMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                  Send Verification Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// VERIFICATION SUCCESS INDICATOR
// ============================================

export function EmailVerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full"
      aria-label="Email verified"
    >
      <CheckCircle className="h-3 w-3" aria-hidden="true" />
      Verified
    </span>
  );
}

export default EmailVerificationBanner;
