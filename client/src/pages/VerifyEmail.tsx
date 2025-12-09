/**
 * Email Verification Page
 * 
 * Handles the email verification flow when users click the link in their email.
 * Displays success/error states with accessible feedback.
 */

import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ============================================
// TYPES
// ============================================

type VerificationState = "loading" | "success" | "error" | "expired" | "already_used";

// ============================================
// COMPONENT
// ============================================

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  // Verify email mutation
  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setState("success");
        setMessage(result.message);
      } else {
        // Determine specific error state
        if (result.message.includes("expired")) {
          setState("expired");
        } else if (result.message.includes("already been used")) {
          setState("already_used");
        } else {
          setState("error");
        }
        setMessage(result.message);
      }
    },
    onError: (error) => {
      setState("error");
      setMessage(String(error));
    },
  });

  // Verify token on mount
  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setState("error");
      setMessage("No verification token provided. Please check your email link.");
    }
  }, [token]);

  // Render based on state
  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <div className="text-center py-8" role="status" aria-live="polite">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">Verifying your email...</h2>
            <p className="mt-2 text-muted-foreground">Please wait while we confirm your email address.</p>
          </div>
        );

      case "success":
        return (
          <div className="text-center py-8" role="status" aria-live="polite">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-green-800">Email Verified!</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">{message}</p>
            <div className="mt-6 space-y-3">
              <Button onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              {!isAuthenticated && (
                <p className="text-sm text-muted-foreground">
                  Please log in to access your dashboard.
                </p>
              )}
            </div>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-8" role="alert" aria-live="assertive">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-amber-600" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-amber-800">Link Expired</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">{message}</p>
            <div className="mt-6">
              {isAuthenticated ? (
                <Button onClick={() => navigate("/settings")} variant="outline">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Request New Verification Email
                </Button>
              ) : (
                <Button onClick={() => navigate("/")} variant="outline">
                  Go to Home
                </Button>
              )}
            </div>
          </div>
        );

      case "already_used":
        return (
          <div className="text-center py-8" role="status" aria-live="polite">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-blue-600" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-blue-800">Already Verified</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">{message}</p>
            <div className="mt-6">
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        );

      case "error":
      default:
        return (
          <div className="text-center py-8" role="alert" aria-live="assertive">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-red-800">Verification Failed</h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">{message}</p>
            <div className="mt-6 space-y-3">
              {isAuthenticated ? (
                <Button onClick={() => navigate("/settings")} variant="outline">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Request New Verification Email
                </Button>
              ) : (
                <Button onClick={() => navigate("/")} variant="outline">
                  Go to Home
                </Button>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            Confirming your email address for AccessAI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-background px-4 py-2 rounded-md shadow-lg"
      >
        Skip to main content
      </a>
    </div>
  );
}
