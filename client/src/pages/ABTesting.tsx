/**
 * A/B Testing Page
 * 
 * Create and manage content experiments to identify which variants
 * perform best on each platform.
 */

import { useState } from "react";
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
  Eye
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PLATFORM_DISPLAY_NAMES } from "@shared/constants";
import DashboardLayout from "@/components/DashboardLayout";

type Platform = "linkedin" | "twitter" | "facebook" | "instagram" | "threads" | "bluesky";

const platformConfig: Record<Platform, { icon: string; color: string }> = {
  linkedin: { icon: "in", color: "bg-blue-600" },
  twitter: { icon: "𝕏", color: "bg-black" },
  facebook: { icon: "f", color: "bg-blue-500" },
  instagram: { icon: "📷", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  threads: { icon: "@", color: "bg-black" },
  bluesky: { icon: "🦋", color: "bg-sky-500" },
};

interface Variant {
  label: string;
  content: string;
  hashtags?: string[];
}

export default function ABTesting() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    platform: "linkedin" as Platform,
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

  const handleCreate = () => {
    if (!newTest.name.trim()) {
      toast.error("Please enter a test name");
      return;
    }
    if (newTest.variants.some((v) => !v.content.trim())) {
      toast.error("All variants must have content");
      return;
    }
    createTest.mutate(newTest);
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-name">Test Name</Label>
                    <Input
                      id="test-name"
                      placeholder="e.g., Holiday promotion test"
                      value={newTest.name}
                      onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                    />
                  </div>
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
                </div>

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
                  Create Test
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
      </div>
    </DashboardLayout>
  );
}
