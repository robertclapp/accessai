/**
 * Settings Page
 * 
 * Comprehensive settings page for managing:
 * - Profile information
 * - Accessibility preferences
 * - Notification settings
 * - Connected social accounts
 * - Subscription and billing
 * - Data management
 */

import { useState } from "react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  User, 
  Accessibility, 
  Bell, 
  Link2, 
  CreditCard, 
  Shield,
  Save,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Download,
  Mail,
  Send,
  Eye,
  Pause,
  Play,
  Calendar,
  GripVertical
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { HelpCircle } from "lucide-react";
import { AccountDeletionDialog, ScheduledDeletionBanner } from "@/components/AccountDeletionDialog";

type FontSize = "small" | "medium" | "large" | "xlarge";
type Formality = "casual" | "professional" | "academic";
type DigestFrequency = "realtime" | "daily" | "weekly" | "never";

interface AccessibilityPreferences {
  highContrast?: boolean;
  dyslexiaFont?: boolean;
  fontSize?: FontSize;
  reduceMotion?: boolean;
  screenReaderOptimized?: boolean;
  voiceInputEnabled?: boolean;
  keyboardShortcutsEnabled?: boolean;
}

interface WritingStyleProfile {
  tone?: string;
  formality?: Formality;
  industry?: string;
  targetAudience?: string;
}

/** Digest Delivery Stats Component */
function DigestDeliveryStats() {
  const { data: stats, isLoading } = trpc.settings.getDigestDeliveryStats.useQuery();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!stats || stats.totalSent === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Delivery Analytics</h3>
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No digest emails sent yet. Send a test digest to see delivery analytics.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Delivery Analytics</h3>
      <p className="text-sm text-muted-foreground">
        Track how your digest emails are performing
      </p>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalSent}</div>
          <div className="text-xs text-muted-foreground">Total Sent</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalOpened}</div>
          <div className="text-xs text-muted-foreground">Opened</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.openRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Open Rate</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.clickRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Click Rate</div>
        </div>
      </div>
      
      {/* Recent Deliveries */}
      {stats.recentDeliveries && stats.recentDeliveries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Deliveries</h4>
          <div className="space-y-2">
            {stats.recentDeliveries.slice(0, 5).map((delivery) => (
              <div 
                key={delivery.id} 
                className="flex items-center justify-between bg-muted/30 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={delivery.status === "clicked" ? "default" : delivery.status === "opened" ? "secondary" : "outline"}>
                    {delivery.status}
                  </Badge>
                  <span className="capitalize">{delivery.digestType}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{delivery.openCount || 0} opens</span>
                  <span>{delivery.clickCount || 0} clicks</span>
                  <span>
                    {new Date(delivery.sentAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Scheduled Digest Preview Component */
function ScheduledDigestPreview() {
  const [showPreview, setShowPreview] = useState(false);
  const { data: preview, isLoading } = trpc.settings.getScheduledDigestPreview.useQuery();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!preview || !preview.enabled) {
    return null;
  }
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const nextSendDate = preview.nextScheduledAt ? new Date(preview.nextScheduledAt) : null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Next Scheduled Digest</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Frequency:</span>
            <span className="ml-2 font-medium capitalize">{preview.frequency}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Schedule:</span>
            <span className="ml-2 font-medium">
              {preview.frequency === "weekly" 
                ? `Every ${dayNames[preview.dayOfWeek]}` 
                : `Day ${preview.dayOfMonth} of each month`
              }
            </span>
          </div>
          {nextSendDate && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Next send:</span>
              <span className="ml-2 font-medium">
                {nextSendDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Included sections: </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {preview.includedSections.analytics && (
              <Badge variant="secondary" className="text-xs">Analytics</Badge>
            )}
            {preview.includedSections.goalProgress && (
              <Badge variant="secondary" className="text-xs">Goal Progress</Badge>
            )}
            {preview.includedSections.topPosts && (
              <Badge variant="secondary" className="text-xs">Top Posts</Badge>
            )}
            {preview.includedSections.platformComparison && (
              <Badge variant="secondary" className="text-xs">Platform Comparison</Badge>
            )}
            {preview.includedSections.scheduledPosts && (
              <Badge variant="secondary" className="text-xs">Scheduled Posts</Badge>
            )}
          </div>
        </div>
      </div>
      
      {showPreview && preview.previewHtml && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 border-b">
            <span className="text-sm font-medium">Email Preview</span>
          </div>
          <div className="bg-white">
            <iframe
              srcDoc={preview.previewHtml}
              className="w-full h-[500px] border-0"
              title="Digest Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Digest Pause/Resume Control Component */
function DigestPauseControl() {
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntil, setPauseUntil] = useState("");
  const [showPauseForm, setShowPauseForm] = useState(false);
  
  const { data: pauseStatus, isLoading, refetch } = trpc.settings.getDigestPauseStatus.useQuery();
  const utils = trpc.useUtils();
  
  const pauseMutation = trpc.settings.pauseDigest.useMutation({
    onSuccess: () => {
      toast.success("Digest emails paused");
      refetch();
      utils.settings.getScheduledDigestPreview.invalidate();
      setShowPauseForm(false);
      setPauseReason("");
      setPauseUntil("");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const resumeMutation = trpc.settings.resumeDigest.useMutation({
    onSuccess: () => {
      toast.success("Digest emails resumed");
      refetch();
      utils.settings.getScheduledDigestPreview.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const isPaused = pauseStatus?.isPaused ?? false;
  const pausedAt = pauseStatus?.pausedAt ? new Date(pauseStatus.pausedAt) : null;
  const pauseUntilDate = pauseStatus?.pauseUntil ? new Date(pauseStatus.pauseUntil) : null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Pause Digest Emails</h3>
        {isPaused ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
          >
            {resumeMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Resume Digests
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPauseForm(!showPauseForm)}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Digests
          </Button>
        )}
      </div>
      
      {isPaused && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Pause className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Digest emails are paused</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-500">
            <div className="space-y-1 text-sm">
              {pausedAt && (
                <p>Paused on: {pausedAt.toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
              )}
              {pauseStatus?.pauseReason && (
                <p>Reason: {pauseStatus.pauseReason}</p>
              )}
              {pauseUntilDate && (
                <p>Auto-resume: {pauseUntilDate.toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {showPauseForm && !isPaused && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pause-reason">Reason (optional)</Label>
            <Input
              id="pause-reason"
              placeholder="e.g., On vacation, Taking a break"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pause-until">Auto-resume date (optional)</Label>
            <Input
              id="pause-until"
              type="date"
              value={pauseUntil}
              onChange={(e) => setPauseUntil(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to pause indefinitely until you manually resume
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => pauseMutation.mutate({
                reason: pauseReason || undefined,
                pauseUntil: pauseUntil ? new Date(pauseUntil).toISOString() : undefined,
              })}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              Confirm Pause
            </Button>
            <Button variant="ghost" onClick={() => setShowPauseForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {!isPaused && !showPauseForm && (
        <p className="text-sm text-muted-foreground">
          Temporarily pause digest emails without losing your preferences. Perfect for vacations or breaks.
        </p>
      )}
    </div>
  );
}

/** Email Digests Tab Component */
function EmailDigestsTab() {
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hourUtc, setHourUtc] = useState(9); // 9 AM
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [includeGoalProgress, setIncludeGoalProgress] = useState(true);
  const [includeTopPosts, setIncludeTopPosts] = useState(true);
  const [includePlatformComparison, setIncludePlatformComparison] = useState(true);
  const [includeScheduledPosts, setIncludeScheduledPosts] = useState(true);
  const [lastDigestSent, setLastDigestSent] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "analytics", "goalProgress", "topPosts", "platformComparison", "scheduledPosts"
  ]);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  
  // Fetch current preferences
  const { data: preferences, isLoading } = trpc.settings.getDigestPreferences.useQuery();
  
  // Update preferences mutation
  const updatePreferences = trpc.settings.updateDigestPreferences.useMutation({
    onSuccess: () => {
      toast.success("Digest preferences saved!");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save preferences");
      setIsSaving(false);
    }
  });
  
  // Preview digest query (using refetch pattern since it's a query)
  const previewDigestQuery = trpc.settings.previewDigest.useQuery(
    { period: frequency },
    { enabled: false }
  );
  
  // Send test digest mutation
  const sendTestDigest = trpc.settings.sendTestDigest.useMutation({
    onSuccess: () => {
      toast.success("Test digest sent to your email!");
      setIsSendingTest(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send test digest");
      setIsSendingTest(false);
    }
  });
  
  // Load preferences when data is available
  React.useEffect(() => {
    if (preferences) {
      setDigestEnabled(preferences.enabled ?? false);
      setFrequency(preferences.frequency ?? "weekly");
      setDayOfWeek(preferences.dayOfWeek ?? 1);
      setDayOfMonth(preferences.dayOfMonth ?? 1);
      setHourUtc(preferences.hourUtc ?? 9);
      setIncludeAnalytics(preferences.includeAnalytics ?? true);
      setIncludeGoalProgress(preferences.includeGoalProgress ?? true);
      setIncludeTopPosts(preferences.includeTopPosts ?? true);
      setIncludePlatformComparison(preferences.includePlatformComparison ?? true);
      setIncludeScheduledPosts(preferences.includeScheduledPosts ?? true);
      if (preferences.sectionOrder) {
        try {
          const order = typeof preferences.sectionOrder === 'string' 
            ? JSON.parse(preferences.sectionOrder) 
            : preferences.sectionOrder;
          if (Array.isArray(order)) setSectionOrder(order);
        } catch (e) { /* ignore parse errors */ }
      }
    }
  }, [preferences]);
  
  const handleSave = () => {
    setIsSaving(true);
    updatePreferences.mutate({
      enabled: digestEnabled,
      frequency,
      dayOfWeek,
      dayOfMonth,
      hourUtc,
      includeAnalytics,
      includeGoalProgress,
      includeTopPosts,
      includePlatformComparison,
      includeScheduledPosts,
      sectionOrder
    });
  };

  // Section configuration
  const sectionConfig: Record<string, { label: string; enabled: boolean; setEnabled: (v: boolean) => void }> = {
    analytics: { label: "Analytics Summary", enabled: includeAnalytics, setEnabled: setIncludeAnalytics },
    goalProgress: { label: "Goal Progress", enabled: includeGoalProgress, setEnabled: setIncludeGoalProgress },
    topPosts: { label: "Top Performing Posts", enabled: includeTopPosts, setEnabled: setIncludeTopPosts },
    platformComparison: { label: "Platform Comparison", enabled: includePlatformComparison, setEnabled: setIncludePlatformComparison },
    scheduledPosts: { label: "Scheduled Posts", enabled: includeScheduledPosts, setEnabled: setIncludeScheduledPosts },
  };

  const handleDragStart = (sectionKey: string) => {
    setDraggedSection(sectionKey);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetKey) return;
    
    const newOrder = [...sectionOrder];
    const draggedIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetKey);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSection);
      setSectionOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
  };
  
  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const result = await previewDigestQuery.refetch();
      if (result.data?.html) {
        // Use the HTML version for a beautiful browser preview
        const previewWindow = window.open("", "_blank", "width=700,height=800");
        if (previewWindow) {
          previewWindow.document.write(result.data.html);
          previewWindow.document.close();
        }
      } else if (result.data?.preview) {
        // Fallback to text version wrapped in pre tag
        const previewWindow = window.open("", "_blank");
        if (previewWindow) {
          previewWindow.document.write(`<html><head><title>Digest Preview</title></head><body style="font-family:monospace;white-space:pre-wrap;padding:20px;">${result.data.preview}</body></html>`);
          previewWindow.document.close();
        }
      } else {
        toast.error("No preview available - you may need to create some posts first");
      }
    } catch (error) {
      toast.error("Failed to generate preview");
    }
    setIsPreviewing(false);
  };
  
  const handleSendTest = () => {
    setIsSendingTest(true);
    sendTestDigest.mutate({ period: frequency });
  };
  
  const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" }
  ];
  
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, "0")}:00 UTC`
  }));
  
  // Calculate next digest send time
  const calculateNextSendTime = (): Date | null => {
    if (!digestEnabled) return null;
    
    const now = new Date();
    const nextSend = new Date();
    
    // Set the hour in UTC
    nextSend.setUTCHours(hourUtc, 0, 0, 0);
    
    if (frequency === "weekly") {
      // Find next occurrence of the selected day
      const currentDay = now.getUTCDay();
      let daysUntilNext = dayOfWeek - currentDay;
      
      // If the day has passed this week, or it's today but the time has passed
      if (daysUntilNext < 0 || (daysUntilNext === 0 && now > nextSend)) {
        daysUntilNext += 7;
      }
      
      nextSend.setUTCDate(now.getUTCDate() + daysUntilNext);
    } else {
      // Monthly: find next occurrence of the selected day of month
      nextSend.setUTCDate(dayOfMonth);
      
      // If the day has passed this month, move to next month
      if (nextSend <= now) {
        nextSend.setUTCMonth(nextSend.getUTCMonth() + 1);
      }
    }
    
    return nextSend;
  };
  
  const nextSendTime = calculateNextSendTime();
  
  // Format countdown
  const formatCountdown = (targetDate: Date): string => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    
    if (diff <= 0) return "Soon";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Digest Reports
        </CardTitle>
        <CardDescription>
          Receive automated analytics summaries and performance reports via email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="digest-enabled" className="text-base font-medium">Enable Email Digests</Label>
            <p className="text-sm text-muted-foreground">
              Receive regular reports about your social media performance
            </p>
          </div>
          <Switch
            id="digest-enabled"
            checked={digestEnabled}
            onCheckedChange={setDigestEnabled}
          />
        </div>
        
        {digestEnabled && (
          <>
            <Separator />
            
            {/* Frequency Settings */}
            <div className="space-y-4">
              <h3 className="font-medium">Delivery Schedule</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {frequency === "weekly" ? (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-week">Day of Week</Label>
                    <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                      <SelectTrigger id="day-of-week">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-month">Day of Month</Label>
                    <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                      <SelectTrigger id="day-of-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="hour">Delivery Time</Label>
                  <Select value={hourUtc.toString()} onValueChange={(v) => setHourUtc(parseInt(v))}>
                    <SelectTrigger id="hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem key={hour.value} value={hour.value.toString()}>
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Next Send Time Preview */}
              {nextSendTime && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="font-medium text-primary">Next Digest</span>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">
                      {nextSendTime.toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                    {' at '}
                    <span className="font-medium">
                      {nextSendTime.toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In approximately {formatCountdown(nextSendTime)}
                  </p>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Content Sections with Drag-and-Drop Reordering */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Report Sections</h3>
                <p className="text-sm text-muted-foreground">
                  Drag to reorder sections. Toggle to show/hide in your digest.
                </p>
              </div>
              
              <div className="space-y-2">
                {sectionOrder.map((sectionKey) => {
                  const config = sectionConfig[sectionKey];
                  if (!config) return null;
                  
                  return (
                    <div
                      key={sectionKey}
                      draggable
                      onDragStart={() => handleDragStart(sectionKey)}
                      onDragOver={(e) => handleDragOver(e, sectionKey)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${
                        draggedSection === sectionKey ? 'opacity-50 border-primary' : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <Label className="cursor-pointer">{config.label}</Label>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={config.setEnabled}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <Separator />
            
            {/* Last Sent Info */}
            {lastDigestSent && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Last digest sent: {lastDigestSent.toLocaleDateString()} at {lastDigestSent.toLocaleTimeString()}
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Preferences
              </Button>
              
              <Button variant="outline" onClick={handlePreview} disabled={isPreviewing}>
                {isPreviewing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Preview Digest
              </Button>
              
              <Button variant="outline" onClick={handleSendTest} disabled={isSendingTest}>
                {isSendingTest ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test Digest
              </Button>
            </div>
            
            <Separator />
            
            {/* Scheduled Digest Preview */}
            <ScheduledDigestPreview />
            
            <Separator />
            
            {/* Pause/Resume Control */}
            <DigestPauseControl />
            
            <Separator />
            
            {/* Delivery Tracking Stats */}
            <DigestDeliveryStats />
          </>
        )}
        
        {!digestEnabled && (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Enable email digests to receive automated performance reports
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Restart Tour Button Component */
function RestartTourButton() {
  const { restartTour } = useOnboarding();
  
  const handleRestartTour = () => {
    restartTour();
    toast.success("Tour restarted! Navigate to the Dashboard to begin.");
  };
  
  return (
    <Button variant="outline" onClick={handleRestartTour}>
      <HelpCircle className="h-4 w-4 mr-2" />
      Restart Guided Tour
    </Button>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  
  // Accessibility preferences state
  const [accessibilityPrefs, setAccessibilityPrefs] = useState<AccessibilityPreferences>({
    highContrast: false,
    dyslexiaFont: false,
    fontSize: "medium",
    reduceMotion: false,
    screenReaderOptimized: false,
    voiceInputEnabled: true,
    keyboardShortcutsEnabled: true
  });
  
  // Writing style state
  const [writingStyle, setWritingStyle] = useState<WritingStyleProfile>({
    tone: "friendly",
    formality: "professional",
    industry: "",
    targetAudience: ""
  });
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailEnabled: true,
    emailDigestFrequency: "daily" as DigestFrequency,
    notifyOnPostPublished: true,
    notifyOnPostFailed: true,
    notifyOnTeamInvite: true,
    notifyOnApprovalRequest: true,
    notifyOnApprovalDecision: true,
    notifyOnNewFeatures: true,
    notifyOnAccessibilityTips: true,
    inAppEnabled: true,
    soundEnabled: false
  });
  
  // Mutations
  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      utils.auth.me.invalidate();
    },
    onError: (error) => toast.error("Failed to update profile", { description: String(error) })
  });
  
  const updateAccessibilityMutation = trpc.settings.updateAccessibilityPreferences.useMutation({
    onSuccess: () => {
      toast.success("Accessibility preferences saved");
      // Apply preferences to the page
      applyAccessibilityPreferences(accessibilityPrefs);
    },
    onError: (error) => toast.error("Failed to save preferences", { description: String(error) })
  });
  
  const updateNotificationsMutation = trpc.settings.updateNotificationPreferences.useMutation({
    onSuccess: () => toast.success("Notification preferences saved"),
    onError: (error) => toast.error("Failed to save preferences", { description: String(error) })
  });
  
  const updateWritingStyleMutation = trpc.settings.updateWritingStyle.useMutation({
    onSuccess: () => toast.success("Writing style preferences saved"),
    onError: (error) => toast.error("Failed to save preferences", { description: String(error) })
  });
  
  // Social accounts query
  const { data: socialAccounts, isLoading: loadingSocialAccounts } = trpc.social.getConnectedAccounts.useQuery();
  
  const disconnectAccountMutation = trpc.social.disconnectAccount.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      utils.social.getConnectedAccounts.invalidate();
    },
    onError: (error) => toast.error("Failed to disconnect account", { description: String(error) })
  });
  
  // Apply accessibility preferences to the document
  const applyAccessibilityPreferences = (prefs: AccessibilityPreferences) => {
    const root = document.documentElement;
    
    if (prefs.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    
    if (prefs.dyslexiaFont) {
      root.classList.add("dyslexia-font");
    } else {
      root.classList.remove("dyslexia-font");
    }
    
    if (prefs.reduceMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
    
    // Font size
    root.style.setProperty("--user-font-size", getFontSizeValue(prefs.fontSize || "medium"));
  };
  
  const getFontSizeValue = (size: FontSize): string => {
    const sizes: Record<FontSize, string> = {
      small: "14px",
      medium: "16px",
      large: "18px",
      xlarge: "20px"
    };
    return sizes[size];
  };
  
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ name, email });
  };
  
  const handleSaveAccessibility = () => {
    updateAccessibilityMutation.mutate(accessibilityPrefs);
  };
  
  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate(notificationPrefs);
  };
  
  const handleSaveWritingStyle = () => {
    updateWritingStyleMutation.mutate(writingStyle);
  };
  
  const handleConnectSocial = (platform: string) => {
    // Redirect to OAuth flow
    window.location.href = `/api/social/connect/${platform}`;
  };
  
  const handleDisconnectSocial = (accountId: number) => {
    disconnectAccountMutation.mutate({ accountId });
  };
  
  // Export data state
  const [exportType, setExportType] = useState<"posts" | "analytics" | "knowledge_base" | "teams" | "images" | "all">("all");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json");
  const [isExporting, setIsExporting] = useState(false);
  
  const exportMutation = trpc.export.exportData.useMutation({
    onSuccess: (data) => {
      setIsExporting(false);
      if (data.fileUrl) {
        // Open download in new tab
        window.open(data.fileUrl, "_blank");
        toast.success(`Export complete! ${data.recordCount} records exported.`);
      }
    },
    onError: (error) => {
      setIsExporting(false);
      toast.error(`Export failed: ${error.message}`);
    }
  });
  
  const handleExportData = () => {
    setIsExporting(true);
    toast.info("Preparing your data export...");
    exportMutation.mutate({
      type: exportType,
      format: exportFormat,
      includeMetadata: true
    });
  };
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDeleteAccount = () => {
    setShowDeleteDialog(true);
  };

  return (
    <div className="container py-8 max-w-4xl">
      {/* Show banner if account deletion is scheduled */}
      <ScheduledDeletionBanner />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, preferences, and connected services
        </p>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto gap-2" role="tablist">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            <span className="hidden sm:inline">Accessibility</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Social</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="digests" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Digests</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and how others see you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={undefined} alt={name} />
                  <AvatarFallback className="text-2xl">
                    {name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Writing Style Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Help our AI learn your preferred writing style for better content generation
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Preferred Tone</Label>
                    <Input
                      id="tone"
                      value={writingStyle.tone || ""}
                      onChange={(e) => setWritingStyle({ ...writingStyle, tone: e.target.value })}
                      placeholder="e.g., friendly, authoritative, casual"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="formality">Formality Level</Label>
                    <Select 
                      value={writingStyle.formality} 
                      onValueChange={(v) => setWritingStyle({ ...writingStyle, formality: v as Formality })}
                    >
                      <SelectTrigger id="formality">
                        <SelectValue placeholder="Select formality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry/Niche</Label>
                    <Input
                      id="industry"
                      value={writingStyle.industry || ""}
                      onChange={(e) => setWritingStyle({ ...writingStyle, industry: e.target.value })}
                      placeholder="e.g., technology, healthcare, education"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience</Label>
                    <Input
                      id="audience"
                      value={writingStyle.targetAudience || ""}
                      onChange={(e) => setWritingStyle({ ...writingStyle, targetAudience: e.target.value })}
                      placeholder="e.g., entrepreneurs, HR professionals"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Profile
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleSaveWritingStyle}
                  disabled={updateWritingStyleMutation.isPending}
                >
                  Save Writing Style
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Preferences</CardTitle>
              <CardDescription>
                Customize your experience to match your accessibility needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Visual Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="high-contrast">High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={accessibilityPrefs.highContrast}
                    onCheckedChange={(checked) => 
                      setAccessibilityPrefs({ ...accessibilityPrefs, highContrast: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dyslexia-font">Dyslexia-Friendly Font</Label>
                    <p className="text-sm text-muted-foreground">
                      Use OpenDyslexic font for easier reading
                    </p>
                  </div>
                  <Switch
                    id="dyslexia-font"
                    checked={accessibilityPrefs.dyslexiaFont}
                    onCheckedChange={(checked) => 
                      setAccessibilityPrefs({ ...accessibilityPrefs, dyslexiaFont: checked })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select 
                    value={accessibilityPrefs.fontSize} 
                    onValueChange={(v) => setAccessibilityPrefs({ ...accessibilityPrefs, fontSize: v as FontSize })}
                  >
                    <SelectTrigger id="font-size">
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (14px)</SelectItem>
                      <SelectItem value="medium">Medium (16px)</SelectItem>
                      <SelectItem value="large">Large (18px)</SelectItem>
                      <SelectItem value="xlarge">Extra Large (20px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Motion & Animation</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="reduce-motion">Reduce Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch
                    id="reduce-motion"
                    checked={accessibilityPrefs.reduceMotion}
                    onCheckedChange={(checked) => 
                      setAccessibilityPrefs({ ...accessibilityPrefs, reduceMotion: checked })
                    }
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Input & Navigation</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="screen-reader">Screen Reader Optimization</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced ARIA labels and announcements
                    </p>
                  </div>
                  <Switch
                    id="screen-reader"
                    checked={accessibilityPrefs.screenReaderOptimized}
                    onCheckedChange={(checked) => 
                      setAccessibilityPrefs({ ...accessibilityPrefs, screenReaderOptimized: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="voice-input">Voice Input</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable voice-to-text for content creation
                    </p>
                  </div>
                  <Switch
                    id="voice-input"
                    checked={accessibilityPrefs.voiceInputEnabled}
                    onCheckedChange={(checked) => 
                      setAccessibilityPrefs({ ...accessibilityPrefs, voiceInputEnabled: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="keyboard-shortcuts">Keyboard Shortcuts</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable keyboard shortcuts for faster navigation
                    </p>
                  </div>
                  <Switch
                    id="keyboard-shortcuts"
                    checked={accessibilityPrefs.keyboardShortcutsEnabled}
                    onCheckedChange={(checked) => 
                      setAccessibilityPrefs({ ...accessibilityPrefs, keyboardShortcutsEnabled: checked })
                    }
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveAccessibility}
                disabled={updateAccessibilityMutation.isPending}
              >
                {updateAccessibilityMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Accessibility Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={notificationPrefs.emailEnabled}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs({ ...notificationPrefs, emailEnabled: checked })
                    }
                  />
                </div>
                
                {notificationPrefs.emailEnabled && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="digest-frequency">Email Digest Frequency</Label>
                    <Select 
                      value={notificationPrefs.emailDigestFrequency} 
                      onValueChange={(v) => setNotificationPrefs({ ...notificationPrefs, emailDigestFrequency: v as DigestFrequency })}
                    >
                      <SelectTrigger id="digest-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Digest</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Notification Types</h3>
                
                <div className="space-y-3">
                  {[
                    { key: "notifyOnPostPublished", label: "Post Published", desc: "When your scheduled posts go live" },
                    { key: "notifyOnPostFailed", label: "Post Failed", desc: "When a scheduled post fails to publish" },
                    { key: "notifyOnTeamInvite", label: "Team Invitations", desc: "When you're invited to join a team" },
                    { key: "notifyOnApprovalRequest", label: "Approval Requests", desc: "When team members request approval" },
                    { key: "notifyOnApprovalDecision", label: "Approval Decisions", desc: "When your posts are approved or rejected" },
                    { key: "notifyOnNewFeatures", label: "New Features", desc: "Updates about new AccessAI features" },
                    { key: "notifyOnAccessibilityTips", label: "Accessibility Tips", desc: "Weekly tips for creating accessible content" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={item.key}>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        id={item.key}
                        checked={notificationPrefs[item.key as keyof typeof notificationPrefs] as boolean}
                        onCheckedChange={(checked) => 
                          setNotificationPrefs({ ...notificationPrefs, [item.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">In-App Notifications</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="in-app-enabled">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the app
                    </p>
                  </div>
                  <Switch
                    id="in-app-enabled"
                    checked={notificationPrefs.inAppEnabled}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs({ ...notificationPrefs, inAppEnabled: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound-enabled">Notification Sounds</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sounds for notifications
                    </p>
                  </div>
                  <Switch
                    id="sound-enabled"
                    checked={notificationPrefs.soundEnabled}
                    onCheckedChange={(checked) => 
                      setNotificationPrefs({ ...notificationPrefs, soundEnabled: checked })
                    }
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveNotifications}
                disabled={updateNotificationsMutation.isPending}
              >
                {updateNotificationsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Social Accounts Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Social Accounts</CardTitle>
              <CardDescription>
                Connect your social media accounts to enable direct posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>API Access Required</AlertTitle>
                <AlertDescription>
                  Direct posting requires API access from each platform. You'll need to apply for developer access and configure your API credentials.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {[
                  { id: "linkedin", name: "LinkedIn", color: "bg-blue-600", connected: false },
                  { id: "twitter", name: "X (Twitter)", color: "bg-black", connected: false },
                  { id: "facebook", name: "Facebook", color: "bg-blue-500", connected: false },
                  { id: "instagram", name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", connected: false },
                  { id: "threads", name: "Threads", color: "bg-black", connected: false },
                  { id: "bluesky", name: "Bluesky", color: "bg-sky-500", connected: false },
                  { id: "mastodon", name: "Mastodon", color: "bg-purple-600", connected: false }
                ].map((platform) => {
                  const connectedAccount = socialAccounts?.find(
                    (acc: { platform: string }) => acc.platform === platform.id
                  );
                  
                  return (
                    <div 
                      key={platform.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${platform.color} flex items-center justify-center text-white font-bold`}>
                          {platform.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{platform.name}</p>
                          {connectedAccount ? (
                            <p className="text-sm text-muted-foreground">
                              Connected as @{connectedAccount.accountName}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Not connected
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connectedAccount ? (
                          <>
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              Connected
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDisconnectSocial(connectedAccount.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleConnectSocial(platform.id)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">API Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  To enable direct posting, you'll need to configure API credentials for each platform.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">LinkedIn API</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Requires a LinkedIn Developer App with Share on LinkedIn permission.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer">
                        LinkedIn Developers <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">X (Twitter) API</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Requires a Twitter Developer account with OAuth 2.0 access.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer">
                        Twitter Developers <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Facebook/Instagram API</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Requires a Meta Developer App with Instagram Graph API access.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer">
                        Meta Developers <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>
                Manage your subscription and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-2xl font-bold text-primary">Free</p>
                  <p className="text-sm text-muted-foreground">
                    10 AI-generated posts per month
                  </p>
                </div>
                <Button asChild>
                  <Link href="/pricing">Upgrade Plan</Link>
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Usage This Month</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Posts Generated</p>
                    <p className="text-2xl font-bold">3 / 10</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Voice Transcriptions</p>
                    <p className="text-2xl font-bold">5 / 10</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Images Generated</p>
                    <p className="text-2xl font-bold">2 / 5</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Billing History</h3>
                <p className="text-sm text-muted-foreground">
                  No billing history available for free accounts.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
              <CardDescription>
                Manage your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Data Export</h3>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your data in CSV or JSON format.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="export-type">Export Type</Label>
                    <Select 
                      value={exportType} 
                      onValueChange={(v) => setExportType(v as typeof exportType)}
                    >
                      <SelectTrigger id="export-type">
                        <SelectValue placeholder="Select data to export" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Full Export (All Data)</SelectItem>
                        <SelectItem value="posts">Posts Only</SelectItem>
                        <SelectItem value="analytics">Analytics Only</SelectItem>
                        <SelectItem value="knowledge_base">Knowledge Base Only</SelectItem>
                        <SelectItem value="teams">Teams Only</SelectItem>
                        <SelectItem value="images">Generated Images Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="export-format">Format</Label>
                    <Select 
                      value={exportFormat} 
                      onValueChange={(v) => setExportFormat(v as typeof exportFormat)}
                    >
                      <SelectTrigger id="export-format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON (Recommended)</SelectItem>
                        <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </>
                  )}
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Onboarding Tour</h3>
                <p className="text-sm text-muted-foreground">
                  Restart the guided tour to learn about AccessAI's features.
                </p>
                <RestartTourButton />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium text-red-600">Danger Zone</h3>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Delete Account</AlertTitle>
                  <AlertDescription>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete My Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Email Digests Tab */}
        <TabsContent value="digests" className="space-y-6">
          <EmailDigestsTab />
        </TabsContent>
      </Tabs>
      
      {/* Account Deletion Dialog */}
      <AccountDeletionDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog} 
      />
    </div>
  );
}
