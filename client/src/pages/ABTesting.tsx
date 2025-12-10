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
  Tag
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
        </div>
        
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
              <Card key={template.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {template.name}
                        {template.isSystem && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </CardTitle>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => useMutation.mutate({ templateId: template.id })}
                        disabled={useMutation.isPending}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {!template.isSystem && (
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
    </Dialog>
  );
}
