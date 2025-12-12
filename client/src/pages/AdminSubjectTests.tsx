import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Plus, Play, Square, Trash2, Trophy, Mail, BarChart3, Target, Percent } from 'lucide-react';
import { Link } from 'wouter';

export default function AdminSubjectTests() {
  const { user, loading: authLoading } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addVariantDialogOpen, setAddVariantDialogOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  
  // Form state
  const [newTestName, setNewTestName] = useState('');
  const [newTestTemplateType, setNewTestTemplateType] = useState('digest');
  const [newTestConfidence, setNewTestConfidence] = useState(95);
  const [newTestMinSample, setNewTestMinSample] = useState(100);
  
  const [newVariantSubject, setNewVariantSubject] = useState('');
  const [newVariantPreview, setNewVariantPreview] = useState('');
  const [newVariantWeight, setNewVariantWeight] = useState(50);

  const utils = trpc.useUtils();
  
  const { data: tests, isLoading: testsLoading } = trpc.abTesting.getAllSubjectTests.useQuery();
  
  const createTestMutation = trpc.abTesting.createSubjectTest.useMutation({
    onSuccess: () => {
      utils.abTesting.getAllSubjectTests.invalidate();
      setCreateDialogOpen(false);
      setNewTestName('');
      setNewTestTemplateType('digest');
      setNewTestConfidence(95);
      setNewTestMinSample(100);
    },
  });
  
  const addVariantMutation = trpc.abTesting.addSubjectVariant.useMutation({
    onSuccess: () => {
      utils.abTesting.getAllSubjectTests.invalidate();
      setAddVariantDialogOpen(false);
      setNewVariantSubject('');
      setNewVariantPreview('');
      setNewVariantWeight(50);
    },
  });
  
  const startTestMutation = trpc.abTesting.startSubjectTest.useMutation({
    onSuccess: () => utils.abTesting.getAllSubjectTests.invalidate(),
  });
  
  const cancelTestMutation = trpc.abTesting.cancelSubjectTest.useMutation({
    onSuccess: () => utils.abTesting.getAllSubjectTests.invalidate(),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>Please sign in to access the subject test management.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateTest = () => {
    createTestMutation.mutate({
      name: newTestName,
      templateType: newTestTemplateType,
      confidenceLevel: newTestConfidence,
      minSampleSize: newTestMinSample,
    });
  };

  const handleAddVariant = () => {
    if (!selectedTestId) return;
    addVariantMutation.mutate({
      testId: selectedTestId,
      subjectLine: newVariantSubject,
      previewText: newVariantPreview || undefined,
      weight: newVariantWeight,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/scheduler">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Email Subject A/B Tests</h1>
            <p className="text-muted-foreground">Create and manage subject line tests to optimize open rates</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{tests?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{tests?.filter(t => t.status === 'running').length || 0}</p>
                  <p className="text-sm text-muted-foreground">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{tests?.filter(t => t.status === 'completed').length || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{tests?.reduce((sum, t) => sum + (t.totalSent || 0), 0) || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Emails Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Test Button */}
        <div className="flex justify-end mb-6">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Subject Line A/B Test</DialogTitle>
                <DialogDescription>
                  Set up a new test to compare different email subject lines.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name</Label>
                  <Input
                    id="testName"
                    placeholder="e.g., Weekly Digest Subject Test"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateType">Template Type</Label>
                  <Select value={newTestTemplateType} onValueChange={setNewTestTemplateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digest">Digest Email</SelectItem>
                      <SelectItem value="activity">Activity Notification</SelectItem>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                      <SelectItem value="marketing">Marketing Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Confidence Level: {newTestConfidence}%</Label>
                  <Slider
                    value={[newTestConfidence]}
                    onValueChange={([v]) => setNewTestConfidence(v)}
                    min={80}
                    max={99}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Higher confidence requires more samples but gives more reliable results.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minSample">Minimum Sample Size per Variant</Label>
                  <Input
                    id="minSample"
                    type="number"
                    value={newTestMinSample}
                    onChange={(e) => setNewTestMinSample(parseInt(e.target.value) || 100)}
                    min={50}
                    max={10000}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTest} disabled={!newTestName || createTestMutation.isPending}>
                  {createTestMutation.isPending ? 'Creating...' : 'Create Test'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tests List */}
        {testsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tests Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first subject line A/B test to start optimizing open rates.</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tests?.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {test.name}
                        {getStatusBadge(test.status)}
                      </CardTitle>
                      <CardDescription>
                        Template: {test.templateType} • Confidence: {test.confidenceLevel}% • Min Sample: {test.minSampleSize}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {test.status === 'draft' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTestId(test.id);
                              setAddVariantDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Variant
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => startTestMutation.mutate({ testId: test.id })}
                            disabled={startTestMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start Test
                          </Button>
                        </>
                      )}
                      {test.status === 'running' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelTestMutation.mutate({ testId: test.id })}
                          disabled={cancelTestMutation.isPending}
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Stop Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Total Sent: {test.totalSent || 0}</span>
                      {test.winningVariantId && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Trophy className="h-4 w-4" />
                          Winner Declared
                        </span>
                      )}
                    </div>
                    
                    {/* Variants would be shown here - for now show placeholder */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Subject Line Variants</h4>
                      <p className="text-sm text-muted-foreground">
                        Add variants to this test to compare different subject lines.
                        Each variant will be randomly assigned to recipients based on weight.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Variant Dialog */}
        <Dialog open={addVariantDialogOpen} onOpenChange={setAddVariantDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subject Line Variant</DialogTitle>
              <DialogDescription>
                Add a new subject line variant to test against others.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subjectLine">Subject Line</Label>
                <Input
                  id="subjectLine"
                  placeholder="e.g., Your Weekly Digest is Ready!"
                  value={newVariantSubject}
                  onChange={(e) => setNewVariantSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previewText">Preview Text (Optional)</Label>
                <Input
                  id="previewText"
                  placeholder="e.g., See what's new this week..."
                  value={newVariantPreview}
                  onChange={(e) => setNewVariantPreview(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">The preview text shown after the subject in email clients.</p>
              </div>
              <div className="space-y-2">
                <Label>Weight: {newVariantWeight}%</Label>
                <Slider
                  value={[newVariantWeight]}
                  onValueChange={([v]) => setNewVariantWeight(v)}
                  min={10}
                  max={90}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">Higher weight means this variant will be sent more often.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddVariantDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddVariant} disabled={!newVariantSubject || addVariantMutation.isPending}>
                {addVariantMutation.isPending ? 'Adding...' : 'Add Variant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
