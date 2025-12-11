/**
 * A/B Testing Page
 * 
 * Create and manage content experiments to identify which variants
 * perform best on each platform.
 */

import { useState } from "react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Square, 
  Trash2, 
  BarChart3, 
  Trophy,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Calendar,
  Send,
  Lightbulb,
  Sparkles,
  TrendingUp,
  History,
  Target,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  CalendarRange,
  ArrowRight,
  Minus,
  FileStack,
  Copy,
  Star,
  Clock3,
  RotateCcw,
  Share2,
  Users,
  Globe,
  Lock,
  Tag,
  MessageSquare,
  Upload,
  FileJson,
  FolderOpen,
  FolderPlus,
  Layers,
  Palette,
  UserPlus,
  Shield,
  Edit3,
  X,
  User
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PLATFORM_DISPLAY_NAMES } from "@shared/constants";
import DashboardLayout from "@/components/DashboardLayout";

type Platform = "linkedin" | "twitter" | "facebook" | "instagram" | "threads" | "bluesky" | "mastodon";

const platformConfig: Record<Platform, { icon: string; color: string }> = {
  linkedin: { icon: "in", color: "bg-blue-600" },
  twitter: { icon: "𝕏", color: "bg-black" },
  facebook: { icon: "f", color: "bg-blue-500" },
  instagram: { icon: "📷", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  threads: { icon: "@", color: "bg-black" },
  bluesky: { icon: "🦋", color: "bg-sky-500" },
  mastodon: { icon: "🐘", color: "bg-purple-600" },
};

interface Variant {
  label: string;
  content: string;
  hashtags?: string[];
}

export default function ABTesting() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isHistoryInsightsOpen, setIsHistoryInsightsOpen] = useState(false);
  const [isComparePeriodsOpen, setIsComparePeriodsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [schedulePlatform, setSchedulePlatform] = useState<Platform>("linkedin");
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    platform: "linkedin" as Platform,
    platforms: ["linkedin"] as Platform[], // For bulk testing
    isBulkTest: false,
    durationHours: 48,
    variants: [
      { label: "A", content: "", hashtags: [] as string[] },
      { label: "B", content: "", hashtags: [] as string[] },
    ] as Variant[],
  });

  const utils = trpc.useUtils();
  const { data: tests, isLoading } = trpc.abTesting.list.useQuery();
  const { data: selectedTest } = trpc.abTesting.get.useQuery(
    { testId: selectedTestId! },
    { enabled: !!selectedTestId }
  );
  const { data: testResults } = trpc.abTesting.getResults.useQuery(
    { testId: selectedTestId! },
    { enabled: !!selectedTestId }
  );

  const createTest = trpc.abTesting.create.useMutation({
    onSuccess: () => {
      toast.success("A/B test created successfully");
      setIsCreateOpen(false);
      setNewTest({
        name: "",
        description: "",
        platform: "linkedin",
        platforms: ["linkedin"],
        isBulkTest: false,
        durationHours: 48,
        variants: [
          { label: "A", content: "", hashtags: [] },
          { label: "B", content: "", hashtags: [] },
        ],
      });
      utils.abTesting.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startTest = trpc.abTesting.start.useMutation({
    onSuccess: () => {
      toast.success("A/B test started");
      utils.abTesting.list.invalidate();
      utils.abTesting.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const completeTest = trpc.abTesting.complete.useMutation({
    onSuccess: (result) => {
      if (result.winnerId) {
        toast.success(result.recommendation);
      } else {
        toast.info(result.recommendation);
      }
      utils.abTesting.list.invalidate();
      utils.abTesting.get.invalidate();
      utils.abTesting.getResults.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelTest = trpc.abTesting.cancel.useMutation({
    onSuccess: () => {
      toast.success("A/B test cancelled");
      utils.abTesting.list.invalidate();
      utils.abTesting.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createBulkTest = trpc.abTesting.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`Created ${data.testIds.length} A/B tests across platforms`);
      setIsCreateOpen(false);
      setNewTest({
        name: "",
        description: "",
        platform: "linkedin",
        platforms: ["linkedin"],
        isBulkTest: false,
        durationHours: 48,
        variants: [
          { label: "A", content: "", hashtags: [] },
          { label: "B", content: "", hashtags: [] },
        ],
      });
      utils.abTesting.list.invalidate();
      utils.abTesting.listBulkGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: bulkGroups } = trpc.abTesting.listBulkGroups.useQuery();
  const [selectedBulkGroupId, setSelectedBulkGroupId] = useState<string | null>(null);
  const { data: bulkGroupComparison } = trpc.abTesting.getBulkGroupComparison.useQuery(
    { bulkTestGroupId: selectedBulkGroupId! },
    { enabled: !!selectedBulkGroupId }
  );

  const scheduleWinner = trpc.abTesting.scheduleWinner.useMutation({
    onSuccess: () => {
      toast.success("Winning variant scheduled for reposting!");
      setIsScheduleOpen(false);
      setScheduleDate("");
      setScheduleTime("09:00");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTest = trpc.abTesting.delete.useMutation({
    onSuccess: () => {
      toast.success("A/B test deleted");
      setSelectedTestId(null);
      utils.abTesting.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addVariant = () => {
    if (newTest.variants.length >= 5) {
      toast.error("Maximum 5 variants allowed");
      return;
    }
    const nextLabel = String.fromCharCode(65 + newTest.variants.length); // A, B, C, D, E
    setNewTest({
      ...newTest,
      variants: [...newTest.variants, { label: nextLabel, content: "", hashtags: [] }],
    });
  };

  const removeVariant = (index: number) => {
    if (newTest.variants.length <= 2) {
      toast.error("Minimum 2 variants required");
      return;
    }
    const updated = newTest.variants.filter((_, i) => i !== index);
    // Re-label variants
    const relabeled = updated.map((v, i) => ({
      ...v,
      label: String.fromCharCode(65 + i),
    }));
    setNewTest({ ...newTest, variants: relabeled });
  };

  const updateVariant = (index: number, content: string) => {
    const updated = [...newTest.variants];
    updated[index] = { ...updated[index], content };
    setNewTest({ ...newTest, variants: updated });
  };

  const handleCreate = async () => {
    if (!newTest.name.trim()) {
      toast.error("Please enter a test name");
      return;
    }
    if (newTest.variants.some((v) => !v.content.trim())) {
      toast.error("All variants must have content");
      return;
    }
    
    if (newTest.isBulkTest && newTest.platforms.length > 1) {
      // Use the bulk create API
      createBulkTest.mutate({
        name: newTest.name,
        description: newTest.description,
        platforms: newTest.platforms,
        durationHours: newTest.durationHours,
        variants: newTest.variants,
      });
    } else {
      // Single platform test
      createTest.mutate({
        name: newTest.name,
        description: newTest.description,
        platform: newTest.platform,
        durationHours: newTest.durationHours,
        variants: newTest.variants,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case "active":
        return <Badge className="bg-green-500"><Play className="w-3 h-3 mr-1" />Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FlaskConical className="w-8 h-8" />
              A/B Testing
            </h1>
            <p className="text-muted-foreground mt-1">
              Create content experiments to find what works best on each platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsComparePeriodsOpen(true)}
            >
              <CalendarRange className="w-4 h-4 mr-2" />
              Compare Periods
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsTemplatesOpen(true)}
            >
              <FileStack className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsHistoryInsightsOpen(true)}
            >
              <History className="w-4 h-4 mr-2" />
              History Insights
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Test
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create A/B Test</DialogTitle>
                <DialogDescription>
                  Create content variants to test which performs better
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="test-name">Test Name</Label>
                  <Input
                    id="test-name"
                    placeholder="e.g., Holiday promotion test"
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  />
                </div>
                
                {/* Bulk Test Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="bulk-test" className="text-base font-medium">Bulk Test Across Platforms</Label>
                    <p className="text-sm text-muted-foreground">
                      Test the same content variants on multiple platforms simultaneously
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="bulk-test"
                    checked={newTest.isBulkTest}
                    onChange={(e) => setNewTest({ 
                      ...newTest, 
                      isBulkTest: e.target.checked,
                      platforms: e.target.checked ? [newTest.platform] : ["linkedin"]
                    })}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                </div>
                
                {/* Platform Selection */}
                {newTest.isBulkTest ? (
                  <div className="space-y-2">
                    <Label>Select Platforms ({newTest.platforms.length} selected)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(platformConfig) as Platform[]).map((p) => (
                        <label
                          key={p}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            newTest.platforms.includes(p)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newTest.platforms.includes(p)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTest({ ...newTest, platforms: [...newTest.platforms, p] });
                              } else {
                                const updated = newTest.platforms.filter((x) => x !== p);
                                if (updated.length > 0) {
                                  setNewTest({ ...newTest, platforms: updated });
                                }
                              }
                            }}
                            className="sr-only"
                          />
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs ${platformConfig[p].color}`}>
                            {platformConfig[p].icon}
                          </span>
                          <span className="font-medium">{PLATFORM_DISPLAY_NAMES[p]}</span>
                          {newTest.platforms.includes(p) && (
                            <CheckCircle className="w-4 h-4 ml-auto text-primary" />
                          )}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A separate test will be created for each platform with the same variants
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select
                      value={newTest.platform}
                      onValueChange={(v) => setNewTest({ ...newTest, platform: v as Platform })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(platformConfig) as Platform[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            <span className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${platformConfig[p].color}`}>
                                {platformConfig[p].icon}
                              </span>
                              {PLATFORM_DISPLAY_NAMES[p]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="What are you testing?"
                    value={newTest.description}
                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={String(newTest.durationHours)}
                    onValueChange={(v) => setNewTest({ ...newTest, durationHours: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours (3 days)</SelectItem>
                      <SelectItem value="168">168 hours (1 week)</SelectItem>
                      <SelectItem value="336">336 hours (2 weeks)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Content Variants</Label>
                    <Button variant="outline" size="sm" onClick={addVariant}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Variant
                    </Button>
                  </div>

                  {newTest.variants.map((variant, index) => (
                    <Card key={index}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Variant {variant.label}</CardTitle>
                          {newTest.variants.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder={`Write content for variant ${variant.label}...`}
                          value={variant.content}
                          onChange={(e) => updateVariant(index, e.target.value)}
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {variant.content.length} characters
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createTest.isPending}>
                  {createTest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {newTest.isBulkTest && newTest.platforms.length > 1
                    ? `Create ${newTest.platforms.length} Tests`
                    : "Create Test"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tests List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Tests</CardTitle>
              <CardDescription>
                {tests?.length || 0} total tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : tests?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tests yet</p>
                  <p className="text-sm">Create your first A/B test to get started</p>
                </div>
              ) : (
                tests?.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => setSelectedTestId(test.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTestId === test.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{test.name}</span>
                      {getStatusBadge(test.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${platformConfig[test.platform as Platform]?.color}`}>
                        {platformConfig[test.platform as Platform]?.icon}
                      </span>
                      <span>{PLATFORM_DISPLAY_NAMES[test.platform as keyof typeof PLATFORM_DISPLAY_NAMES]}</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Test Details */}
          <Card className="lg:col-span-2">
            {selectedTestId && selectedTest ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTest.test.name}</CardTitle>
                      <CardDescription>{selectedTest.test.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedTest.test.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {selectedTest.test.status === "draft" && (
                      <>
                        <Button
                          onClick={() => startTest.mutate({ testId: selectedTestId })}
                          disabled={startTest.isPending}
                        >
                          {startTest.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Start Test
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteTest.mutate({ testId: selectedTestId })}
                          disabled={deleteTest.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    {selectedTest.test.status === "active" && (
                      <>
                        <Button
                          onClick={() => completeTest.mutate({ testId: selectedTestId })}
                          disabled={completeTest.isPending}
                        >
                          {completeTest.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trophy className="w-4 h-4 mr-2" />
                          )}
                          End & Pick Winner
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => cancelTest.mutate({ testId: selectedTestId })}
                          disabled={cancelTest.isPending}
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Variants */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Variants Performance
                    </h3>
                    
                    {selectedTest.variants.map((variant) => {
                      const isWinner = selectedTest.test.winningVariantId === variant.id;
                      const engagementRate = (variant.engagementRate || 0) / 100;
                      
                      return (
                        <Card key={variant.id} className={isWinner ? "border-green-500 bg-green-500/5" : ""}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                Variant {variant.label}
                                {isWinner && (
                                  <Badge className="bg-green-500">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Winner
                                  </Badge>
                                )}
                              </CardTitle>
                              <span className="text-2xl font-bold">
                                {engagementRate.toFixed(2)}%
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {variant.content}
                            </p>
                            
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-semibold">{variant.impressions || 0}</p>
                                <p className="text-xs text-muted-foreground">Impressions</p>
                              </div>
                              <div>
                                <p className="text-2xl font-semibold">{variant.engagements || 0}</p>
                                <p className="text-xs text-muted-foreground">Engagements</p>
                              </div>
                              <div>
                                <p className="text-2xl font-semibold">{variant.clicks || 0}</p>
                                <p className="text-xs text-muted-foreground">Clicks</p>
                              </div>
                            </div>

                            {selectedTest.test.status === "active" && (
                              <Progress value={engagementRate * 10} className="h-2" />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Analysis */}
                  {testResults?.analysis && (
                    <Card className="bg-muted/50">
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{testResults.analysis.recommendation}</p>
                        {testResults.analysis.confidence > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <Progress value={testResults.analysis.confidence} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{testResults.analysis.confidence}%</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Schedule Winner Button */}
                  {selectedTest.test.status === "completed" && selectedTest.test.winningVariantId && (
                    <Card className="bg-green-500/10 border-green-500">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-green-500" />
                              Winner Determined
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Schedule the winning content for reposting
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedTestId(selectedTest.test.id);
                              setScheduleDate("");
                              setScheduleTime("09:00");
                              setSchedulePlatform(selectedTest.test.platform as Platform);
                              setIsScheduleOpen(true);
                            }}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Winner
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* AI Insights Section */}
                  {selectedTest.test.status === "completed" && selectedTest.test.winningVariantId && (
                    <ABTestInsightsSection testId={selectedTest.test.id} />)}
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a test to view details</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Bulk Test Comparison Section */}
        {bulkGroups && bulkGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Cross-Platform Test Comparison
              </CardTitle>
              <CardDescription>
                Compare A/B test results across different platforms to find which performs best
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Bulk Group Selector */}
                <div className="flex items-center gap-4">
                  <Label>Select Bulk Test Group:</Label>
                  <Select
                    value={selectedBulkGroupId || ""}
                    onValueChange={(v) => setSelectedBulkGroupId(v)}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Choose a bulk test group" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkGroups.map((group) => (
                        <SelectItem key={group.groupId} value={group.groupId}>
                          <span className="flex items-center gap-2">
                            <span>{group.name}</span>
                            <Badge variant="secondary">{group.testCount} platforms</Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Comparison Results */}
                {bulkGroupComparison && (
                  <div className="space-y-4">
                    {/* Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Total Platforms</p>
                          <p className="text-2xl font-bold">{bulkGroupComparison.summary.totalTests}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-2xl font-bold">{bulkGroupComparison.summary.completedTests}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Best Platform</p>
                          <p className="text-2xl font-bold flex items-center gap-2">
                            {bulkGroupComparison.summary.bestPlatform ? (
                              <>
                                <span className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs ${platformConfig[bulkGroupComparison.summary.bestPlatform as Platform]?.color}`}>
                                  {platformConfig[bulkGroupComparison.summary.bestPlatform as Platform]?.icon}
                                </span>
                                {PLATFORM_DISPLAY_NAMES[bulkGroupComparison.summary.bestPlatform as keyof typeof PLATFORM_DISPLAY_NAMES]}
                              </>
                            ) : (
                              "TBD"
                            )}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">Best Engagement Rate</p>
                          <p className="text-2xl font-bold text-green-500">
                            {(bulkGroupComparison.summary.bestEngagementRate / 100).toFixed(2)}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Platform Comparison Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Platform</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Winner</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Engagement Rate</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Impressions</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {bulkGroupComparison.tests.map((test) => {
                            const winningVariant = test.variants.find(v => v.id === test.winningVariantId);
                            const bestVariant = test.variants.reduce((a, b) => 
                              (a.engagementRate || 0) > (b.engagementRate || 0) ? a : b
                            , test.variants[0]);
                            const isBestPlatform = test.platform === bulkGroupComparison.summary.bestPlatform;
                            
                            return (
                              <tr 
                                key={test.id} 
                                className={isBestPlatform ? "bg-green-500/10" : ""}
                              >
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs ${platformConfig[test.platform as Platform]?.color}`}>
                                      {platformConfig[test.platform as Platform]?.icon}
                                    </span>
                                    <span className="font-medium">
                                      {PLATFORM_DISPLAY_NAMES[test.platform as keyof typeof PLATFORM_DISPLAY_NAMES]}
                                    </span>
                                    {isBestPlatform && (
                                      <Trophy className="w-4 h-4 text-yellow-500" />
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {getStatusBadge(test.status)}
                                </td>
                                <td className="px-4 py-3">
                                  {winningVariant ? (
                                    <Badge className="bg-green-500">Variant {winningVariant.label}</Badge>
                                  ) : bestVariant ? (
                                    <Badge variant="secondary">Leading: {bestVariant.label}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                  {bestVariant ? (
                                    <span className={isBestPlatform ? "text-green-500 font-bold" : ""}>
                                      {((bestVariant.engagementRate || 0) / 100).toFixed(2)}%
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                  {test.variants.reduce((sum, v) => sum + (v.impressions || 0), 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {test.confidenceLevel ? (
                                    <Badge variant={test.confidenceLevel >= 95 ? "default" : "secondary"}>
                                      {test.confidenceLevel}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Recommendation */}
                    {bulkGroupComparison.summary.bestPlatform && bulkGroupComparison.summary.completedTests > 0 && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                          <Trophy className="w-5 h-5" />
                          Recommendation
                        </h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                          Based on your cross-platform A/B tests, <strong>{PLATFORM_DISPLAY_NAMES[bulkGroupComparison.summary.bestPlatform as keyof typeof PLATFORM_DISPLAY_NAMES]}</strong> shows 
                          the highest engagement rate at <strong>{(bulkGroupComparison.summary.bestEngagementRate / 100).toFixed(2)}%</strong>. 
                          Consider prioritizing this platform for similar content in the future.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!selectedBulkGroupId && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a bulk test group to compare results across platforms</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Schedule Winner Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Winning Variant
            </DialogTitle>
            <DialogDescription>
              Schedule the winning content for reposting on your selected platform.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Date</Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schedule-time">Time</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schedule-platform">Platform</Label>
              <Select
                value={schedulePlatform}
                onValueChange={(v) => setSchedulePlatform(v as Platform)}
              >
                <SelectTrigger id="schedule-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(platformConfig) as Platform[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${platformConfig[p].color}`}>
                          {platformConfig[p].icon}
                        </span>
                        {PLATFORM_DISPLAY_NAMES[p]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTest?.test.winningVariantId && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Content Preview:</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedTest.variants.find(v => v.id === selectedTest.test.winningVariantId)?.content}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!scheduleDate || !selectedTestId) return;
                const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
                scheduleWinner.mutate({
                  testId: selectedTestId,
                  scheduledAt: scheduledAt.toISOString(),
                  platform: schedulePlatform,
                });
              }}
              disabled={!scheduleDate || scheduleWinner.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              {scheduleWinner.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Schedule Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* History Insights Dialog */}
      <HistoryInsightsDialog 
        open={isHistoryInsightsOpen} 
        onOpenChange={setIsHistoryInsightsOpen} 
      />
      
      {/* Time Period Comparison Dialog */}
      <TimePeriodComparisonDialog
        open={isComparePeriodsOpen}
        onOpenChange={setIsComparePeriodsOpen}
      />
      
      {/* A/B Test Templates Dialog */}
      <ABTestTemplatesDialog
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
      />
      </div>
    </DashboardLayout>
  );
}

// ============================================
// AI INSIGHTS COMPONENT
// ============================================

function ABTestInsightsSection({ testId }: { testId: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: insights, isLoading, refetch } = trpc.abTesting.getInsights.useQuery(
    { testId },
    { enabled: isExpanded }
  );
  
  const generateInsights = trpc.abTesting.generateInsights.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Insights regenerated!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate insights");
    },
  });
  
  if (!isExpanded) {
    return (
      <Card className="bg-purple-500/10 border-purple-500">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-500" />
                AI-Powered Insights
              </h3>
              <p className="text-sm text-muted-foreground">
                Get recommendations to improve future content
              </p>
            </div>
            <Button
              onClick={() => setIsExpanded(true)}
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              View Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-500" />
            AI-Powered Insights
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInsights.mutate({ testId })}
              disabled={generateInsights.isPending}
            >
              {generateInsights.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-muted-foreground">Analyzing test results...</span>
          </div>
        ) : insights ? (
          <>
            {/* Insights List */}
            {insights.insights.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Key Findings
                </h4>
                <div className="space-y-2">
                  {insights.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        insight.impact === "high"
                          ? "bg-green-500/10 border-green-500/30"
                          : insight.impact === "medium"
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{insight.title}</p>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            insight.impact === "high"
                              ? "border-green-500 text-green-500"
                              : insight.impact === "medium"
                              ? "border-yellow-500 text-yellow-500"
                              : ""
                          }`}
                        >
                          {insight.impact} impact
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Content Patterns */}
            {insights.contentPatterns.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Content Patterns</h4>
                <div className="flex flex-wrap gap-2">
                  {insights.contentPatterns.map((pattern, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`${
                        pattern.effect === "positive"
                          ? "border-green-500 text-green-500"
                          : pattern.effect === "negative"
                          ? "border-red-500 text-red-500"
                          : ""
                      }`}
                    >
                      {pattern.frequency === "winner" && "✓ "}
                      {pattern.frequency === "loser" && "✗ "}
                      {pattern.pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Generated at {new Date(insights.generatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>No insights available. Click the sparkle button to generate.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ============================================
// HISTORY INSIGHTS DIALOG COMPONENT
// ============================================

function HistoryInsightsDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  
  const { data: insights, isLoading, refetch } = trpc.abTesting.getHistoryInsights.useQuery(
    undefined,
    { enabled: open }
  );
  
  const { data: pdfData, refetch: fetchPdf } = trpc.abTesting.exportHistoryInsightsPdf.useQuery(
    undefined,
    { enabled: false }
  );
  
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const result = await fetchPdf();
      if (result.data?.html) {
        // Create a new window with the HTML content for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(result.data.html);
          printWindow.document.close();
          
          // Wait for content to load then trigger print
          printWindow.onload = () => {
            printWindow.print();
          };
          
          toast.success("PDF export ready", { 
            description: "Use your browser's print dialog to save as PDF" 
          });
        } else {
          toast.error("Popup blocked", { 
            description: "Please allow popups to export the PDF" 
          });
        }
      }
    } catch (error) {
      toast.error("Export failed", { 
        description: "Could not generate the PDF report" 
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            A/B Test History Insights
          </DialogTitle>
          <DialogDescription>
            Aggregated learnings from all your completed A/B tests
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !insights ? (
          <div className="text-center py-12 text-muted-foreground">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No insights available yet.</p>
            <p className="text-sm">Complete some A/B tests to see aggregated learnings.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{insights.summary.completedTests}</div>
                <div className="text-xs text-muted-foreground">Completed Tests</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{insights.summary.avgConfidenceLevel.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{insights.summary.avgEngagementLift.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Engagement Lift</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">
                  {insights.summary.bestPerformingPlatform 
                    ? PLATFORM_DISPLAY_NAMES[insights.summary.bestPerformingPlatform as keyof typeof PLATFORM_DISPLAY_NAMES] 
                    : "N/A"}
                </div>
                <div className="text-xs text-muted-foreground">Best Platform</div>
              </div>
            </div>
            
            {/* Content Learnings */}
            {(insights.contentLearnings.winningElements.length > 0 || 
              insights.contentLearnings.losingElements.length > 0) && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Content Learnings
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Winning Elements */}
                  {insights.contentLearnings.winningElements.length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                        <ArrowUp className="w-4 h-4" />
                        Winning Elements
                      </h4>
                      <div className="space-y-2">
                        {insights.contentLearnings.winningElements.slice(0, 5).map((element, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{element.element}</span>
                            <Badge variant="outline" className="text-green-600 border-green-500">
                              {element.frequency}x • {element.impact}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Losing Elements */}
                  {insights.contentLearnings.losingElements.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                        <ArrowDown className="w-4 h-4" />
                        Elements to Avoid
                      </h4>
                      <div className="space-y-2">
                        {insights.contentLearnings.losingElements.slice(0, 5).map((element, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{element.element}</span>
                            <Badge variant="outline" className="text-red-600 border-red-500">
                              {element.frequency}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Platform Breakdown */}
            {insights.platformBreakdown.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Platform Performance
                </h3>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.platformBreakdown.map((platform) => (
                    <div 
                      key={platform.platform}
                      className={`rounded-lg p-4 border ${
                        platform.platform === insights.summary.bestPerformingPlatform
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES]}
                        </span>
                        {platform.platform === insights.summary.bestPerformingPlatform && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>{platform.testsCompleted} tests completed</div>
                        <div className="text-green-600">+{platform.avgEngagementLift.toFixed(1)}% avg lift</div>
                        <div>{platform.avgConfidence.toFixed(0)}% avg confidence</div>
                      </div>
                      {platform.winningPatterns.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {platform.winningPatterns.slice(0, 3).map((pattern, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Historical Insights */}
            {insights.historicalInsights.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Key Insights
                </h3>
                
                <div className="space-y-3">
                  {insights.historicalInsights.map((insight, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        insight.confidence === "high" ? "bg-green-500" :
                        insight.confidence === "medium" ? "bg-yellow-500" : "bg-gray-400"
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">{insight.title}</div>
                        <div className="text-sm text-muted-foreground">{insight.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Based on {insight.dataPoints} data points • {insight.confidence} confidence
                          {insight.trend && (
                            <span className={`ml-2 ${
                              insight.trend === "improving" ? "text-green-500" :
                              insight.trend === "declining" ? "text-red-500" : ""
                            }`}>
                              {insight.trend === "improving" ? "↑ Improving" :
                               insight.trend === "declining" ? "↓ Declining" : "→ Stable"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Recommendations
                </h3>
                
                <div className="space-y-3">
                  {insights.recommendations.map((rec, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.priority === "high" ? "bg-red-500/10 border-red-500" :
                        rec.priority === "medium" ? "bg-yellow-500/10 border-yellow-500" :
                        "bg-blue-500/10 border-blue-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${
                          rec.priority === "high" ? "border-red-500 text-red-500" :
                          rec.priority === "medium" ? "border-yellow-500 text-yellow-500" :
                          "border-blue-500 text-blue-500"
                        }`}>
                          {rec.priority} priority
                        </Badge>
                      </div>
                      <div className="font-medium">{rec.title}</div>
                      <div className="text-sm text-muted-foreground">{rec.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Based on: {rec.basedOn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground text-center">
              Generated at {new Date(insights.generatedAt).toLocaleString()}
            </div>
          </div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportPdf}
            disabled={isExporting || !insights || insights.summary.completedTests === 0}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export as PDF
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <Sparkles className="w-4 h-4 mr-2" />
            Refresh Insights
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ============================================
// TIME PERIOD COMPARISON DIALOG COMPONENT
// ============================================

function TimePeriodComparisonDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  // Default to comparing last 30 days vs previous 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const [period1Start, setPeriod1Start] = useState(sixtyDaysAgo.toISOString().split("T")[0]);
  const [period1End, setPeriod1End] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [period2Start, setPeriod2Start] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [period2End, setPeriod2End] = useState(today.toISOString().split("T")[0]);
  
  const { data: comparison, isLoading, refetch } = trpc.abTesting.compareTimePeriods.useQuery(
    { period1Start, period1End, period2Start, period2End },
    { enabled: open }
  );
  
  const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
    switch (trend) {
      case "improving": return <ArrowUp className="w-4 h-4 text-green-500" />;
      case "declining": return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };
  
  const getTrendColor = (trend: "improving" | "stable" | "declining") => {
    switch (trend) {
      case "improving": return "text-green-500";
      case "declining": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5" />
            Compare Time Periods
          </DialogTitle>
          <DialogDescription>
            Analyze how your A/B testing performance has changed over time
          </DialogDescription>
        </DialogHeader>
        
        {/* Date Range Selectors */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Period 1 (Earlier)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={period1Start}
                onChange={(e) => setPeriod1Start(e.target.value)}
                className="flex-1"
              />
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={period1End}
                onChange={(e) => setPeriod1End(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Period 2 (Recent)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={period2Start}
                onChange={(e) => setPeriod2Start(e.target.value)}
                className="flex-1"
              />
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={period2End}
                onChange={(e) => setPeriod2End(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CalendarRange className="w-4 h-4 mr-2" />
          )}
          Compare Periods
        </Button>
        
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        {comparison && !isLoading && (
          <div className="space-y-6">
            {/* Summary Comparison */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tests Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground text-sm">{comparison.comparison.testsCompleted.period1}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <span className="text-lg font-bold">{comparison.comparison.testsCompleted.period2}</span>
                    </div>
                    {getTrendIcon(comparison.comparison.testsCompleted.trend)}
                  </div>
                  <div className={`text-xs ${getTrendColor(comparison.comparison.testsCompleted.trend)}`}>
                    {comparison.comparison.testsCompleted.change > 0 ? "+" : ""}
                    {comparison.comparison.testsCompleted.change} tests
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground text-sm">{comparison.comparison.avgConfidenceLevel.period1.toFixed(0)}%</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <span className="text-lg font-bold">{comparison.comparison.avgConfidenceLevel.period2.toFixed(0)}%</span>
                    </div>
                    {getTrendIcon(comparison.comparison.avgConfidenceLevel.trend)}
                  </div>
                  <div className={`text-xs ${getTrendColor(comparison.comparison.avgConfidenceLevel.trend)}`}>
                    {comparison.comparison.avgConfidenceLevel.change > 0 ? "+" : ""}
                    {comparison.comparison.avgConfidenceLevel.change.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Engagement Lift
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground text-sm">{comparison.comparison.avgEngagementLift.period1.toFixed(0)}%</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <span className="text-lg font-bold">{comparison.comparison.avgEngagementLift.period2.toFixed(0)}%</span>
                    </div>
                    {getTrendIcon(comparison.comparison.avgEngagementLift.trend)}
                  </div>
                  <div className={`text-xs ${getTrendColor(comparison.comparison.avgEngagementLift.trend)}`}>
                    {comparison.comparison.avgEngagementLift.change > 0 ? "+" : ""}
                    {comparison.comparison.avgEngagementLift.change.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Win Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground text-sm">{comparison.comparison.winRate.period1.toFixed(0)}%</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <span className="text-lg font-bold">{comparison.comparison.winRate.period2.toFixed(0)}%</span>
                    </div>
                    {getTrendIcon(comparison.comparison.winRate.trend)}
                  </div>
                  <div className={`text-xs ${getTrendColor(comparison.comparison.winRate.trend)}`}>
                    {comparison.comparison.winRate.change > 0 ? "+" : ""}
                    {comparison.comparison.winRate.change.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Platform Comparison */}
            {comparison.platformComparison.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Platform Performance
                </h3>
                <div className="grid gap-2">
                  {comparison.platformComparison.map((platform) => (
                    <div 
                      key={platform.platform}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform.platform}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {platform.period1Tests} → {platform.period2Tests} tests
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {platform.period1AvgLift.toFixed(1)}% → {platform.period2AvgLift.toFixed(1)}% lift
                        </span>
                        {getTrendIcon(platform.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Insights */}
            {comparison.insights.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Key Insights
                </h3>
                <div className="space-y-2">
                  {comparison.insights.map((insight, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border-l-4 ${
                        insight.impact === "positive" ? "bg-green-500/10 border-green-500" :
                        insight.impact === "negative" ? "bg-red-500/10 border-red-500" :
                        "bg-muted border-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm text-muted-foreground">{insight.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recommendations */}
            {comparison.recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {comparison.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {comparison.comparison.testsCompleted.period1 === 0 && comparison.comparison.testsCompleted.period2 === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarRange className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No completed tests found in the selected time periods.</p>
                <p className="text-sm">Try selecting different date ranges.</p>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch(`/api/trpc/abTesting.exportComparisonPdf?input=${encodeURIComponent(JSON.stringify({ period1Start, period1End, period2Start, period2End }))}`);
                const data = await response.json();
                if (data.result?.data?.html) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(data.result.data.html);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }
              } catch (error) {
                console.error('Failed to export PDF:', error);
              }
            }}
            disabled={isLoading || !comparison}
          >
            <Download className="w-4 h-4 mr-2" />
            Export as PDF
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ============================================
// A/B TEST TEMPLATES DIALOG COMPONENT
// ============================================

function ABTestTemplatesDialog({ 
  open, 
  onOpenChange,
  onUseTemplate
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onUseTemplate?: (template: {
    variantATemplate: string;
    variantALabel: string | null;
    variantBTemplate: string;
    variantBLabel: string | null;
  }) => void;
}) {
  const utils = trpc.useUtils();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [sampleContent, setSampleContent] = useState("Check out our new AI-powered content creation tool that helps you write better posts faster!");
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "headline",
    variantATemplate: "",
    variantALabel: "Variant A",
    variantBTemplate: "",
    variantBLabel: "Variant B",
    exampleUseCase: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "community" | "top-rated" | "analytics" | "collections">("my");
  const [isCollectionCreateOpen, setIsCollectionCreateOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [addToCollectionTemplate, setAddToCollectionTemplate] = useState<any>(null);
  const [newCollection, setNewCollection] = useState({ name: "", description: "", isPublic: false, color: "#6366f1" });
  const [ratingReminderTemplate, setRatingReminderTemplate] = useState<any>(null);
  const [versionHistoryTemplate, setVersionHistoryTemplate] = useState<any>(null);
  const [ratingTemplate, setRatingTemplate] = useState<any>(null);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [selectedForExport, setSelectedForExport] = useState<number[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor" | "admin">("editor");
  const [inviteMessage, setInviteMessage] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const { data: templates, isLoading, refetch } = trpc.abTesting.getTemplates.useQuery(
    undefined,
    { enabled: open }
  );
  
  const createMutation = trpc.abTesting.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      setIsCreateOpen(false);
      setNewTemplate({
        name: "",
        description: "",
        category: "headline",
        variantATemplate: "",
        variantALabel: "Variant A",
        variantBTemplate: "",
        variantBLabel: "Variant B",
        exampleUseCase: "",
        tags: [],
      });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
  
  const deleteMutation = trpc.abTesting.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
  
  const useMutation = trpc.abTesting.useTemplate.useMutation({
    onSuccess: (data) => {
      toast.success("Template applied! Create your test with the pre-filled content.");
      if (onUseTemplate && data.template) {
        onUseTemplate({
          variantATemplate: data.template.variantATemplate,
          variantALabel: data.template.variantALabel,
          variantBTemplate: data.template.variantBTemplate,
          variantBLabel: data.template.variantBLabel,
        });
      }
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to use template: ${error.message}`);
    },
  });
  
  // Community templates
  const { data: communityTemplates, isLoading: isCommunityLoading, refetch: refetchCommunity } = trpc.abTesting.getSharedTemplates.useQuery(
    { category: selectedCategory === "all" ? undefined : selectedCategory, search: searchQuery || undefined },
    { enabled: open && activeTab === "community" }
  );
  
  const { data: topRatedTemplates, isLoading: isTopRatedLoading } = trpc.abTesting.getTopRatedTemplates.useQuery(
    { limit: 20 },
    { enabled: open && activeTab === "top-rated" }
  );
  
  const { data: versionHistory } = trpc.abTesting.getTemplateVersionHistory.useQuery(
    { templateId: versionHistoryTemplate?.id || 0 },
    { enabled: !!versionHistoryTemplate }
  );
  
  const { data: templateRatings, refetch: refetchRatings } = trpc.abTesting.getTemplateRatings.useQuery(
    { templateId: ratingTemplate?.id || 0 },
    { enabled: !!ratingTemplate }
  );
  
  const rateMutation = trpc.abTesting.rateTemplate.useMutation({
    onSuccess: () => {
      refetchRatings();
      setRatingTemplate(null);
      setUserRating(0);
      setUserReview("");
    }
  });
  
  const revertMutation = trpc.abTesting.revertTemplateToVersion.useMutation({
    onSuccess: () => {
      refetch();
      setVersionHistoryTemplate(null);
    }
  });
  
  const { data: sharingStats } = trpc.abTesting.getSharingStats.useQuery(
    undefined,
    { enabled: open }
  );
  
  // Analytics summary for user's templates
  const { data: analyticsSummary } = trpc.abTesting.getTemplateAnalyticsSummary.useQuery(
    undefined,
    { enabled: open }
  );
  
  // Collections
  const { data: collections, refetch: refetchCollections } = trpc.abTesting.getCollections.useQuery(
    undefined,
    { enabled: open }
  );
  
  const { data: collectionData } = trpc.abTesting.getCollection.useQuery(
    { collectionId: selectedCollection?.id || 0 },
    { enabled: !!selectedCollection }
  );
  
  const { data: templatesNeedingRating } = trpc.abTesting.getTemplatesNeedingRating.useQuery(
    undefined,
    { enabled: open }
  );
  
  const createCollectionMutation = trpc.abTesting.createCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection created!");
      setIsCollectionCreateOpen(false);
      setNewCollection({ name: "", description: "", isPublic: false, color: "#6366f1" });
      refetchCollections();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteCollectionMutation = trpc.abTesting.deleteCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection deleted");
      setSelectedCollection(null);
      refetchCollections();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const addToCollectionMutation = trpc.abTesting.addToCollection.useMutation({
    onSuccess: () => {
      toast.success("Template added to collection!");
      setAddToCollectionTemplate(null);
      refetchCollections();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const removeFromCollectionMutation = trpc.abTesting.removeFromCollection.useMutation({
    onSuccess: () => {
      toast.success("Template removed from collection");
      refetchCollections();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const trackUsageMutation = trpc.abTesting.trackUsage.useMutation({
    onSuccess: (data) => {
      if (data.shouldShowReminder) {
        // Find the template to show reminder
        const template = templates?.find(t => t.id === data.usageCount);
        if (template) {
          setRatingReminderTemplate(template);
        }
      }
    },
  });
  
  const dismissReminderMutation = trpc.abTesting.dismissReminder.useMutation({
    onSuccess: () => {
      setRatingReminderTemplate(null);
    },
  });
  
  // Collaborator queries and mutations
  const { data: collaborators, refetch: refetchCollaborators } = trpc.abTesting.getCollectionCollaborators.useQuery(
    { collectionId: selectedCollection?.id || 0 },
    { enabled: !!selectedCollection }
  );
  
  const inviteCollaboratorMutation = trpc.abTesting.inviteCollaborator.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent!");
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteMessage("");
      setSearchResults([]);
      refetchCollaborators();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const removeCollaboratorMutation = trpc.abTesting.removeCollaborator.useMutation({
    onSuccess: () => {
      toast.success("Collaborator removed");
      refetchCollaborators();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const handleSearchUsers = async (query: string) => {
    setInviteEmail(query);
    if (query.length >= 3) {
      setIsSearching(true);
      try {
        const results = await utils.abTesting.searchUsersForInvite.fetch({ email: query });
        setSearchResults(results || []);
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };
  
  const shareMutation = trpc.abTesting.shareTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template shared with the community!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const unshareMutation = trpc.abTesting.unshareTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template is now private");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const copyMutation = trpc.abTesting.copySharedTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template copied to your library!");
      refetch();
      setActiveTab("my");
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Import/Export mutations
  const importMutation = trpc.abTesting.importTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template imported successfully!");
      setIsImportOpen(false);
      setImportData("");
      refetch();
    },
    onError: (error) => toast.error(`Failed to import: ${error.message}`),
  });
  
  const importMultipleMutation = trpc.abTesting.importMultipleTemplates.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} templates${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
      setIsImportOpen(false);
      setImportData("");
      refetch();
    },
    onError: (error) => toast.error(`Failed to import: ${error.message}`),
  });
  
  const categories = [
    { value: "all", label: "All Categories" },
    { value: "headline", label: "Headlines" },
    { value: "length", label: "Length" },
    { value: "formatting", label: "Formatting" },
    { value: "tone", label: "Tone" },
    { value: "cta", label: "Call-to-Action" },
    { value: "hashtags", label: "Hashtags" },
  ];
  
  const filteredTemplates = templates?.filter(t => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) || [];
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      headline: "bg-blue-500/10 text-blue-500",
      length: "bg-green-500/10 text-green-500",
      formatting: "bg-purple-500/10 text-purple-500",
      tone: "bg-orange-500/10 text-orange-500",
      cta: "bg-red-500/10 text-red-500",
      hashtags: "bg-cyan-500/10 text-cyan-500",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !newTemplate.tags.includes(tagInput.trim())) {
      setNewTemplate(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setNewTemplate(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };
  
  // Export a single template - find it from the loaded templates
  const handleExportTemplate = (templateId: number) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template) {
      toast.error('Template not found');
      return;
    }
    
    const exportData = {
      name: template.name,
      description: template.description,
      category: template.category,
      variantATemplate: template.variantATemplate,
      variantBTemplate: template.variantBTemplate,
      variantALabel: template.variantALabel,
      variantBLabel: template.variantBLabel,
      tags: template.tags,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template exported successfully!');
  };
  
  // Export multiple templates
  const handleExportSelected = () => {
    if (selectedForExport.length === 0) {
      toast.error('Select templates to export');
      return;
    }
    
    const exportTemplates = templates?.filter(t => selectedForExport.includes(t.id)).map(template => ({
      name: template.name,
      description: template.description,
      category: template.category,
      variantATemplate: template.variantATemplate,
      variantBTemplate: template.variantBTemplate,
      variantALabel: template.variantALabel,
      variantBLabel: template.variantBLabel,
      tags: template.tags,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    })) || [];
    
    if (exportTemplates.length === 0) {
      toast.error('No templates found to export');
      return;
    }
    
    const blob = new Blob([JSON.stringify(exportTemplates, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `templates-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportTemplates.length} templates!`);
    setSelectedForExport([]);
  };
  
  // Handle import from JSON
  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      if (Array.isArray(parsed)) {
        // Multiple templates
        importMultipleMutation.mutate({ templates: parsed });
      } else {
        // Single template
        importMutation.mutate({ data: parsed });
      }
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };
  
  // Handle file upload for import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };
  
  // Toggle template selection for export
  const toggleExportSelection = (templateId: number) => {
    setSelectedForExport(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="w-5 h-5" />
            A/B Test Templates
          </DialogTitle>
          <DialogDescription>
            Use pre-built templates to quickly create effective A/B tests
          </DialogDescription>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === "my" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("my")}
          >
            <FileStack className="w-4 h-4 mr-2" />
            My Templates
          </Button>
          <Button
            variant={activeTab === "community" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("community")}
          >
            <Globe className="w-4 h-4 mr-2" />
            Community
            {communityTemplates && communityTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2">{communityTemplates.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "top-rated" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("top-rated")}
          >
            <Star className="w-4 h-4 mr-2" />
            Top Rated
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant={activeTab === "collections" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("collections")}
          >
            <Layers className="w-4 h-4 mr-2" />
            Collections
            {collections && collections.length > 0 && (
              <Badge variant="secondary" className="ml-2">{collections.length}</Badge>
            )}
          </Button>
          {sharingStats && sharingStats.totalShared > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Share2 className="w-4 h-4" />
              {sharingStats.totalShared} shared · {sharingStats.totalCopies} copies
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          {selectedForExport.length > 0 && (
            <Button variant="outline" onClick={handleExportSelected}>
              <Download className="w-4 h-4 mr-2" />
              Export ({selectedForExport.length})
            </Button>
          )}
        </div>
        
        {/* My Templates Tab */}
        {activeTab === "my" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileStack className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className={`relative ${selectedForExport.includes(template.id) ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedForExport.includes(template.id)}
                            onChange={() => toggleExportSelection(template.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                            title="Select for export"
                          />
                          <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {template.name}
                            {template.isSystem && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                            {template.isPublic && (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                Shared
                              </Badge>
                            )}
                          </CardTitle>
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => useMutation.mutate({ templateId: template.id })}
                            disabled={useMutation.isPending}
                            title="Use this template"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {!template.isSystem && (
                            <>
                              {template.isPublic ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => unshareMutation.mutate({ templateId: template.id })}
                                  disabled={unshareMutation.isPending}
                                  title="Make private"
                                >
                                  <Lock className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => shareMutation.mutate({ templateId: template.id })}
                                  disabled={shareMutation.isPending}
                                  title="Share with community"
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setVersionHistoryTemplate(template)}
                                title="Version history"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExportTemplate(template.id)}
                                title="Export template"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setAddToCollectionTemplate(template)}
                                title="Add to collection"
                              >
                                <Layers className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this template?")) {
                                    deleteMutation.mutate({ templateId: template.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                <CardContent className="space-y-3">
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <div className="font-medium text-xs text-muted-foreground mb-1">
                        {template.variantALabel || "Variant A"}
                      </div>
                      <div className="text-xs line-clamp-2">{template.variantATemplate}</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-medium text-xs text-muted-foreground mb-1">
                        {template.variantBLabel || "Variant B"}
                      </div>
                      <div className="text-xs line-clamp-2">{template.variantBTemplate}</div>
                    </div>
                  </div>
                  
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Used {template.usageCount || 0} times</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => useMutation.mutate({ templateId: template.id })}
                      disabled={useMutation.isPending}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </>
        )}
        
        {/* Community Templates Tab */}
        {activeTab === "community" && (
          <>
            {isCommunityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !communityTemplates || communityTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No community templates yet.</p>
                <p className="text-sm mt-2">Be the first to share a template!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {communityTemplates.map((template) => (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(template.category)}>
                              {template.category}
                            </Badge>
                            {template.creatorName && (
                              <span className="text-xs text-muted-foreground">
                                by {template.creatorName}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => copyMutation.mutate({ templateId: template.id })}
                          disabled={copyMutation.isPending}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <div className="font-medium text-xs text-muted-foreground mb-1">
                            {template.variantALabel || "Variant A"}
                          </div>
                          <div className="text-xs line-clamp-2">{template.variantATemplate}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="font-medium text-xs text-muted-foreground mb-1">
                            {template.variantBLabel || "Variant B"}
                          </div>
                          <div className="text-xs line-clamp-2">{template.variantBTemplate}</div>
                        </div>
                      </div>
                      
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {template.shareCount || 0} copies
                          </span>
                          {(template as any).reviewCount > 0 && (
                            <span className="flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {(template as any).reviewCount} reviews
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => setRatingTemplate(template)}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Rate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Top Rated Tab */}
        {activeTab === "top-rated" && (
          <>
            {isTopRatedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !topRatedTemplates || topRatedTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No rated templates yet.</p>
                <p className="text-sm mt-2">Rate community templates to see them here!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {topRatedTemplates.map(({ template, averageRating, totalRatings }) => (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(template.category)}>
                              {template.category}
                            </Badge>
                            <div className="flex items-center text-yellow-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= Math.round(averageRating) ? 'fill-current' : ''}`}
                                />
                              ))}
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({totalRatings})
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => copyMutation.mutate({ templateId: template.id })}
                          disabled={copyMutation.isPending}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <div className="font-medium text-xs text-muted-foreground mb-1">
                            {template.variantALabel || "Variant A"}
                          </div>
                          <div className="text-xs line-clamp-2">{template.variantATemplate}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="font-medium text-xs text-muted-foreground mb-1">
                            {template.variantBLabel || "Variant B"}
                          </div>
                          <div className="text-xs line-clamp-2">{template.variantBTemplate}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{analyticsSummary?.totalTemplates || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Templates</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{analyticsSummary?.publicTemplates || 0}</div>
                  <div className="text-sm text-muted-foreground">Public Templates</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{analyticsSummary?.totalDownloads || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Downloads</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{analyticsSummary?.totalExports || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Exports</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Top Performing Templates */}
            {analyticsSummary?.topTemplates && analyticsSummary.topTemplates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Performing Templates
                  </CardTitle>
                  <CardDescription>Your most downloaded public templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsSummary.topTemplates.map((template, idx) => (
                      <div key={template.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Download className="w-3 h-3" />
                              {template.downloads} downloads
                              {template.rating > 0 && (
                                <>
                                  <span>·</span>
                                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                  {template.rating.toFixed(1)}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Empty State */}
            {(!analyticsSummary?.topTemplates || analyticsSummary.topTemplates.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No analytics data yet.</p>
                <p className="text-sm mt-2">Share your templates with the community to see analytics!</p>
              </div>
            )}
            
            {/* Marketplace Link */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Explore the Template Marketplace</h3>
                  <p className="text-sm text-muted-foreground">Discover and download templates shared by the community</p>
                </div>
                <Button asChild>
                  <a href="/marketplace">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Browse Marketplace
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div className="space-y-4">
            {/* Header with create button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Your Collections</h3>
                <p className="text-sm text-muted-foreground">Group related templates together for easier organization</p>
              </div>
              <Button onClick={() => setIsCollectionCreateOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                New Collection
              </Button>
            </div>
            
            {/* Rating Reminder Alert */}
            {templatesNeedingRating && templatesNeedingRating.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium">Rate your frequently used templates!</p>
                      <p className="text-sm text-muted-foreground">
                        You've used {templatesNeedingRating.length} template(s) 3+ times without rating them.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      if (templatesNeedingRating[0]) {
                        const template = templates?.find(t => t.id === templatesNeedingRating[0].templateId);
                        if (template) setRatingTemplate(template);
                      }
                    }}>
                      Rate Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Collections Grid */}
            {!collections || collections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No collections yet.</p>
                <p className="text-sm mt-2">Create a collection to organize your templates!</p>
              </div>
            ) : selectedCollection ? (
              /* Collection Detail View */
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCollection(null)}>
                  ← Back to Collections
                </Button>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: (selectedCollection.color || '#6366f1') + '20', color: selectedCollection.color || '#6366f1' }}
                        >
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {selectedCollection.name}
                            {selectedCollection.isPublic && <Globe className="w-4 h-4 text-muted-foreground" />}
                          </CardTitle>
                          {selectedCollection.description && (
                            <CardDescription>{selectedCollection.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsInviteOpen(true)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Invite
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Delete this collection?')) {
                              deleteCollectionMutation.mutate({ collectionId: selectedCollection.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {collectionData?.templates && collectionData.templates.length > 0 ? (
                      <div className="grid gap-3">
                        {collectionData.templates.map((template) => (
                          <div key={template.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.category}</div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeFromCollectionMutation.mutate({ 
                                collectionId: selectedCollection.id, 
                                templateId: template.id 
                              })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileStack className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No templates in this collection yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Collaborators Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Collaborators
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Invite
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!collaborators || collaborators.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No collaborators yet.</p>
                        <p className="text-xs">Invite others to contribute to this collection.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {collaborators.map((collab: any) => (
                          <div key={collab.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{collab.userName || collab.userEmail || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs py-0">
                                    {collab.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                    {collab.role === 'editor' && <Edit3 className="w-3 h-3 mr-1" />}
                                    {collab.role === 'viewer' && <Eye className="w-3 h-3 mr-1" />}
                                    {collab.role}
                                  </Badge>
                                  {collab.status === 'pending' && (
                                    <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {collab.status === 'accepted' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-8 w-8 p-0"
                                onClick={() => removeCollaboratorMutation.mutate({ 
                                  collectionId: selectedCollection.id, 
                                  userId: collab.userId 
                                })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Collections List */
              <div className="grid gap-4 md:grid-cols-2">
                {collections.map((collection) => (
                  <Card 
                    key={collection.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedCollection(collection)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: (collection.color || '#6366f1') + '20', color: collection.color || '#6366f1' }}
                        >
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {collection.name}
                            {collection.isPublic && <Globe className="w-3 h-3 text-muted-foreground" />}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {collection.templateCount || 0} templates
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    {collection.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
            
            {/* Create Collection Dialog */}
            {isCollectionCreateOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderPlus className="w-5 h-5" />
                      Create Collection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newCollection.name}
                        onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                        placeholder="My Template Collection"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={newCollection.description}
                        onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                        placeholder="A collection of templates for..."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                          {['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map((color) => (
                            <button
                              key={color}
                              className={`w-8 h-8 rounded-full border-2 ${newCollection.color === color ? 'border-foreground' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewCollection({ ...newCollection, color })}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isPublic"
                          checked={newCollection.isPublic}
                          onChange={(e) => setNewCollection({ ...newCollection, isPublic: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="isPublic" className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          Public
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                  <div className="flex justify-end gap-2 p-4 border-t">
                    <Button variant="outline" onClick={() => setIsCollectionCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createCollectionMutation.mutate(newCollection)}
                      disabled={!newCollection.name || createCollectionMutation.isPending}
                    >
                      {createCollectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {/* Add to Collection Dialog */}
        {addToCollectionTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Add to Collection
                </CardTitle>
                <CardDescription>
                  Add "{addToCollectionTemplate.name}" to a collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!collections || collections.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No collections yet.</p>
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setAddToCollectionTemplate(null);
                        setIsCollectionCreateOpen(true);
                      }}
                    >
                      Create one first
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <button
                        key={collection.id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => addToCollectionMutation.mutate({
                          collectionId: collection.id,
                          templateId: addToCollectionTemplate.id,
                        })}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: (collection.color || '#6366f1') + '20', color: collection.color || '#6366f1' }}
                        >
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{collection.name}</div>
                          <div className="text-xs text-muted-foreground">{collection.templateCount || 0} templates</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="flex justify-end p-4 border-t">
                <Button variant="outline" onClick={() => setAddToCollectionTemplate(null)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        {/* Rating Reminder Dialog */}
        {ratingReminderTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Rate This Template?
                </CardTitle>
                <CardDescription>
                  You've used "{ratingReminderTemplate.name}" multiple times. Would you like to rate it?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your rating helps other users discover great templates and helps template creators improve.
                </p>
              </CardContent>
              <div className="flex justify-end gap-2 p-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    dismissReminderMutation.mutate({ templateId: ratingReminderTemplate.id });
                  }}
                >
                  Don't ask again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setRatingReminderTemplate(null)}
                >
                  Later
                </Button>
                <Button 
                  onClick={() => {
                    setRatingTemplate(ratingReminderTemplate);
                    setRatingReminderTemplate(null);
                  }}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Rate Now
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        {/* Invite Collaborator Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Collaborator
              </DialogTitle>
              <DialogDescription>
                Invite someone to collaborate on "{selectedCollection?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search by email</Label>
                <Input
                  placeholder="Enter email address..."
                  value={inviteEmail}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                />
                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {searchResults.map((user: any) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setInviteEmail(user.email || '');
                          setSelectedUser(user);
                          setSearchResults([]);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{user.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v: "viewer" | "editor" | "admin") => setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Viewer - Can view and download templates
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Editor - Can add and remove templates
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin - Can manage collaborators
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="Add a personal message..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedUser || !selectedCollection) return;
                  inviteCollaboratorMutation.mutate({
                    collectionId: selectedCollection.id,
                    userId: selectedUser.id,
                    role: inviteRole,
                    message: inviteMessage || undefined,
                  });
                }}
                disabled={!selectedUser || inviteCollaboratorMutation.isPending}
              >
                {inviteCollaboratorMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Version History Dialog */}
        {versionHistoryTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Version History
                </CardTitle>
                <CardDescription>
                  "{versionHistoryTemplate.name}" - View and restore previous versions
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1">
                {!versionHistory || versionHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No version history yet.</p>
                    <p className="text-sm mt-2">Versions are created when you edit the template.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versionHistory.map((version: any) => (
                      <div key={version.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">Version {version.versionNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(version.createdAt).toLocaleString()}
                            </div>
                            {version.changeNote && (
                              <div className="text-sm mt-1">{version.changeNote}</div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Revert to version ${version.versionNumber}?`)) {
                                revertMutation.mutate({
                                  templateId: versionHistoryTemplate.id,
                                  versionId: version.id
                                });
                              }
                            }}
                            disabled={revertMutation.isPending}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Revert
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-muted rounded">
                            <div className="font-medium text-muted-foreground mb-1">
                              {version.variantALabel || "Variant A"}
                            </div>
                            <div className="line-clamp-2">{version.variantATemplate}</div>
                          </div>
                          <div className="p-2 bg-muted rounded">
                            <div className="font-medium text-muted-foreground mb-1">
                              {version.variantBLabel || "Variant B"}
                            </div>
                            <div className="line-clamp-2">{version.variantBTemplate}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="flex justify-end p-4 border-t">
                <Button variant="outline" onClick={() => setVersionHistoryTemplate(null)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        {/* Rating Dialog */}
        {ratingTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Rate Template
                </CardTitle>
                <CardDescription>
                  Rate "{ratingTemplate.name}" to help others find great templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rating stars */}
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 ${star <= userRating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                      />
                    </button>
                  ))}
                </div>
                
                {/* Review text input */}
                <div className="space-y-2">
                  <Label>Your Review</Label>
                  <Textarea
                    value={userReview}
                    onChange={(e) => setUserReview(e.target.value)}
                    placeholder="Share your experience with this template... What worked well? Any tips for others?"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {userReview.length}/500 characters
                  </p>
                </div>
                
                {/* Existing reviews */}
                {templateRatings && templateRatings.ratings.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Community Reviews ({templateRatings.totalRatings})
                      </h4>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{templateRatings.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {templateRatings.ratings.filter(r => r.review).map((rating) => (
                        <div key={rating.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= rating.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{rating.review}</p>
                        </div>
                      ))}
                      {templateRatings.ratings.filter(r => r.review).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No written reviews yet. Be the first to share your thoughts!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="flex justify-end gap-2 p-4 border-t">
                <Button variant="outline" onClick={() => {
                  setRatingTemplate(null);
                  setUserRating(0);
                  setUserReview("");
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => rateMutation.mutate({
                    templateId: ratingTemplate.id,
                    rating: userRating,
                    review: userReview || undefined
                  })}
                  disabled={userRating === 0 || rateMutation.isPending}
                >
                  {rateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Rating
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for your A/B tests
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Urgency vs Curiosity"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newTemplate.category} 
                onValueChange={(v) => setNewTemplate(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.value !== "all").map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template tests..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variant A Label</Label>
                <Input
                  value={newTemplate.variantALabel}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, variantALabel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Variant B Label</Label>
                <Input
                  value={newTemplate.variantBLabel}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, variantBLabel: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Variant A Template</Label>
              <Textarea
                value={newTemplate.variantATemplate}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, variantATemplate: e.target.value }))}
                placeholder="Template for variant A..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Variant B Template</Label>
              <Textarea
                value={newTemplate.variantBTemplate}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, variantBTemplate: e.target.value }))}
                placeholder="Template for variant B..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {newTemplate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newTemplate.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(newTemplate)}
              disabled={!newTemplate.name || !newTemplate.variantATemplate || !newTemplate.variantBTemplate || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Template Preview: {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              See how this template transforms your content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sample Content</Label>
              <Textarea
                value={sampleContent}
                onChange={(e) => setSampleContent(e.target.value)}
                placeholder="Enter sample content to preview..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Use placeholders like [topic], [benefit], [number] in templates. They will be highlighted in the preview.
              </p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                    {previewTemplate?.variantALabel || "Variant A"}
                  </Badge>
                </div>
                <Card className="p-4 bg-muted/50">
                  <div className="text-sm whitespace-pre-wrap">
                    {previewTemplate?.variantATemplate?.replace(/\[([^\]]+)\]/g, (_: string, placeholder: string) => {
                      // Try to extract relevant content from sample
                      if (placeholder.toLowerCase() === 'topic') return 'AI-powered content creation';
                      if (placeholder.toLowerCase() === 'benefit') return 'write better posts faster';
                      if (placeholder.toLowerCase() === 'number') return '5';
                      if (placeholder.toLowerCase() === 'question') return 'struggling to create engaging content';
                      return `[${placeholder}]`;
                    })}
                  </div>
                </Card>
                <div className="text-xs text-muted-foreground">
                  Template: <code className="bg-muted px-1 rounded">{previewTemplate?.variantATemplate}</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    {previewTemplate?.variantBLabel || "Variant B"}
                  </Badge>
                </div>
                <Card className="p-4 bg-muted/50">
                  <div className="text-sm whitespace-pre-wrap">
                    {previewTemplate?.variantBTemplate?.replace(/\[([^\]]+)\]/g, (_: string, placeholder: string) => {
                      if (placeholder.toLowerCase() === 'topic') return 'AI-powered content creation';
                      if (placeholder.toLowerCase() === 'benefit') return 'write better posts faster';
                      if (placeholder.toLowerCase() === 'number') return '5';
                      if (placeholder.toLowerCase() === 'statement') return 'This tool will transform your content strategy';
                      return `[${placeholder}]`;
                    })}
                  </div>
                </Card>
                <div className="text-xs text-muted-foreground">
                  Template: <code className="bg-muted px-1 rounded">{previewTemplate?.variantBTemplate}</code>
                </div>
              </div>
            </div>
            
            {previewTemplate?.description && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">About this template</div>
                <div className="text-sm text-muted-foreground">{previewTemplate.description}</div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button onClick={() => {
              useMutation.mutate({ templateId: previewTemplate?.id });
              setPreviewTemplate(null);
            }}>
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Template Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Templates
            </DialogTitle>
            <DialogDescription>
              Import templates from a JSON file or paste JSON data directly
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload JSON File</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>JSON Data</Label>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder='{\n  "name": "My Template",\n  "category": "headline",\n  "variantATemplate": "...",\n  "variantBTemplate": "..."\n}'
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supports single template or array of templates. Required fields: name, category, variantATemplate, variantBTemplate
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportOpen(false);
              setImportData("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importData.trim() || importMutation.isPending || importMultipleMutation.isPending}
            >
              {(importMutation.isPending || importMultipleMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
