/**
 * Account Deletion Dialog
 * 
 * GDPR-compliant account deletion with:
 * - Confirmation flow requiring user to type "DELETE"
 * - Option to export data before deletion
 * - Choice between immediate or scheduled deletion
 * - Clear warnings about data loss
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  AlertTriangle, 
  Loader2, 
  Download, 
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface AccountDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDeletionDialog({ open, onOpenChange }: AccountDeletionDialogProps) {
  const { logout } = useAuth();
  const [step, setStep] = useState<"options" | "confirm" | "success">("options");
  const [confirmationText, setConfirmationText] = useState("");
  const [exportData, setExportData] = useState(true);
  const [deletionType, setDeletionType] = useState<"scheduled" | "immediate">("scheduled");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionResult, setDeletionResult] = useState<{
    success: boolean;
    message: string;
    scheduledDate?: string;
    exportUrl?: string;
  } | null>(null);

  const deletionMutation = trpc.settings.scheduleAccountDeletion.useMutation({
    onSuccess: (result) => {
      setIsDeleting(false);
      if (result.success) {
        setDeletionResult({
          success: true,
          message: result.message,
          scheduledDate: result.scheduledDeletionDate?.toString(),
          exportUrl: result.exportUrl,
        });
        setStep("success");
        
        if (deletionType === "immediate") {
          // Log out after immediate deletion
          setTimeout(() => {
            logout();
            window.location.href = "/";
          }, 3000);
        }
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error(error.message || "Failed to process deletion request");
    },
  });

  const handleProceedToConfirm = () => {
    setStep("confirm");
  };

  const handleConfirmDeletion = () => {
    if (confirmationText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setIsDeleting(true);
    deletionMutation.mutate({
      immediate: deletionType === "immediate",
      exportData,
      confirmationText,
    });
  };

  const handleClose = () => {
    if (step === "success" && deletionType === "immediate") {
      // Don't allow closing after immediate deletion
      return;
    }
    setStep("options");
    setConfirmationText("");
    setDeletionResult(null);
    onOpenChange(false);
  };

  const isConfirmDisabled = confirmationText !== "DELETE" || isDeleting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "options" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Account
              </DialogTitle>
              <DialogDescription>
                This will permanently delete your account and all associated data.
                Please review your options carefully.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Deletion Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Deletion Type</Label>
                <RadioGroup
                  value={deletionType}
                  onValueChange={(v) => setDeletionType(v as "scheduled" | "immediate")}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="scheduled" className="font-medium cursor-pointer flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Scheduled Deletion (Recommended)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Your account will be deleted in 30 days. You can cancel anytime before then.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer border-red-200">
                    <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="immediate" className="font-medium cursor-pointer flex items-center gap-2 text-red-600">
                        <Clock className="h-4 w-4" />
                        Immediate Deletion
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Your account will be deleted immediately. This cannot be undone.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Data Export Option */}
              <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30">
                <Checkbox
                  id="export-data"
                  checked={exportData}
                  onCheckedChange={(checked) => setExportData(checked as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="export-data" className="font-medium cursor-pointer flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export my data before deletion
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your posts, analytics, and other data.
                  </p>
                </div>
              </div>

              {/* Warning */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    <li>All your posts and content will be permanently deleted</li>
                    <li>Your knowledge base and templates will be removed</li>
                    <li>Team memberships will be revoked</li>
                    <li>Active subscriptions will be cancelled</li>
                    <li>Connected social accounts will be disconnected</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleProceedToConfirm}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Confirm Account Deletion
              </DialogTitle>
              <DialogDescription>
                {deletionType === "immediate" 
                  ? "Your account will be permanently deleted immediately."
                  : "Your account will be scheduled for deletion in 30 days."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Final Confirmation Required</AlertTitle>
                <AlertDescription>
                  Type <strong>DELETE</strong> below to confirm you want to delete your account.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
                <Input
                  id="confirm-delete"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE here"
                  className="font-mono"
                  autoComplete="off"
                  aria-describedby="confirm-hint"
                />
                <p id="confirm-hint" className="text-sm text-muted-foreground">
                  {confirmationText === "DELETE" ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmation text matches
                    </span>
                  ) : confirmationText.length > 0 ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Please type DELETE exactly
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Summary:</strong></p>
                <p>• Deletion type: {deletionType === "immediate" ? "Immediate" : "Scheduled (30 days)"}</p>
                <p>• Export data: {exportData ? "Yes" : "No"}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("options")} disabled={isDeleting}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDeletion}
                disabled={isConfirmDisabled}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletionType === "immediate" ? "Delete Now" : "Schedule Deletion"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && deletionResult && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {deletionType === "immediate" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Account Deleted
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5 text-yellow-600" />
                    Deletion Scheduled
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant={deletionType === "immediate" ? "default" : "default"}>
                <AlertDescription>
                  {deletionResult.message}
                </AlertDescription>
              </Alert>

              {deletionResult.exportUrl && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="font-medium mb-2">Your data export is ready:</p>
                  <Button variant="outline" asChild>
                    <a href={deletionResult.exportUrl} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download Data Export
                    </a>
                  </Button>
                </div>
              )}

              {deletionType === "immediate" && (
                <p className="text-sm text-muted-foreground">
                  You will be logged out automatically in a few seconds...
                </p>
              )}

              {deletionType === "scheduled" && (
                <p className="text-sm text-muted-foreground">
                  You can cancel this deletion anytime from your Settings page before the scheduled date.
                </p>
              )}
            </div>

            <DialogFooter>
              {deletionType === "scheduled" && (
                <Button onClick={handleClose}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Scheduled Deletion Banner
 * Shows when user has a pending account deletion
 */
export function ScheduledDeletionBanner() {
  const { data: deletionStatus, isLoading } = trpc.settings.getDeletionStatus.useQuery();
  const cancelMutation = trpc.settings.cancelAccountDeletion.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel deletion");
    },
  });

  if (isLoading || !deletionStatus?.isScheduled) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Account Deletion Scheduled</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <span>
          Your account is scheduled for deletion in {deletionStatus.daysRemaining} days
          {deletionStatus.scheduledDate && (
            <> on {new Date(deletionStatus.scheduledDate).toLocaleDateString()}</>
          )}.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cancelling...
            </>
          ) : (
            "Cancel Deletion"
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
