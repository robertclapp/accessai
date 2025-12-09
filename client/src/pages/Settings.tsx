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
  Download
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";

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
  
  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.error("Account deletion requires confirmation via email. Check your inbox.");
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, preferences, and connected services
        </p>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-2" role="tablist">
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
                  { id: "instagram", name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", connected: false }
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
      </Tabs>
    </div>
  );
}
