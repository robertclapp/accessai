import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Mail, 
  Eye, 
  Send, 
  RefreshCw, 
  Code, 
  Smartphone, 
  Monitor,
  ArrowLeft,
  Settings,
  Palette
} from 'lucide-react';
import { Link } from 'wouter';
// Email templates are rendered server-side, we'll use API endpoints for preview

type TemplateType = 'digest' | 'activity' | 'welcome';
type ViewMode = 'desktop' | 'mobile' | 'code';

export default function AdminEmailPreview() {
  const { user } = useAuth();
  const isLoading = false; // Auth loading is handled by the hook internally
  const [templateType, setTemplateType] = useState<TemplateType>('digest');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  
  // Sample data for previews
  const [sampleData, setSampleData] = useState({
    userName: 'John Doe',
    userEmail: 'john@example.com',
    period: 'weekly' as 'daily' | 'weekly' | 'monthly',
    unsubscribeToken: 'sample-token-123',
    actorName: 'Jane Smith',
    actionType: 'template_added' as const,
    collectionName: 'Marketing Templates',
    templateName: 'Product Launch Email',
  });

  // Sample templates for digest
  const sampleTemplates = [
    { id: 1, name: 'Product Launch Email', category: 'Marketing', rating: 4.5 },
    { id: 2, name: 'Newsletter Header', category: 'Content', rating: 4.2 },
    { id: 3, name: 'Welcome Series', category: 'Onboarding', rating: 4.8 },
  ];

  const sampleTrending = [
    { id: 4, name: 'Holiday Sale Banner', category: 'Promotions', downloads: 156 },
    { id: 5, name: 'Customer Feedback Request', category: 'Engagement', downloads: 98 },
  ];

  const previewMutation = trpc.abTesting.previewEmailTemplate.useMutation({
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      toast.success('Preview generated');
    },
    onError: (error) => {
      toast.error('Failed to generate preview: ' + error.message);
    },
  });

  const generatePreview = () => {
    previewMutation.mutate({
      templateType,
      data: {
        userName: sampleData.userName,
        period: sampleData.period,
        actorName: sampleData.actorName,
        actionType: sampleData.actionType,
        collectionName: sampleData.collectionName,
        templateName: sampleData.templateName,
        unsubscribeToken: sampleData.unsubscribeToken,
        followedCollectionTemplates: sampleTemplates,
        trendingTemplates: sampleTrending,
        recommendations: sampleTemplates.slice(0, 2),
      },
    });
  };

  const sendTestEmail = async () => {
    if (!sampleData.userEmail) {
      toast.error('Please enter an email address');
      return;
    }
    
    // In a real implementation, this would call an API endpoint
    toast.success(`Test email would be sent to ${sampleData.userEmail}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Mail className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Admin Access Required</h1>
        <p className="text-muted-foreground">Please sign in to access the email preview.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Mail className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can access this page.</p>
        <Button asChild variant="outline">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin/scheduler">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Mail className="w-6 h-6" />
                  Email Template Preview
                </h1>
                <p className="text-sm text-muted-foreground">
                  Preview and test email templates before sending
                </p>
              </div>
            </div>
            <Badge variant="outline">Admin</Badge>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Template Settings
                </CardTitle>
                <CardDescription>
                  Configure the template and sample data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select value={templateType} onValueChange={(v) => setTemplateType(v as TemplateType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digest">Weekly Digest</SelectItem>
                      <SelectItem value="activity">Activity Notification</SelectItem>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input 
                    value={sampleData.userName}
                    onChange={(e) => setSampleData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Test Email Address</Label>
                  <Input 
                    type="email"
                    value={sampleData.userEmail}
                    onChange={(e) => setSampleData(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>

                {templateType === 'digest' && (
                  <div className="space-y-2">
                    <Label>Digest Period</Label>
                    <Select 
                      value={sampleData.period} 
                      onValueChange={(v) => setSampleData(prev => ({ ...prev, period: v as 'daily' | 'weekly' | 'monthly' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {templateType === 'activity' && (
                  <>
                    <div className="space-y-2">
                      <Label>Actor Name</Label>
                      <Input 
                        value={sampleData.actorName}
                        onChange={(e) => setSampleData(prev => ({ ...prev, actorName: e.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Action Type</Label>
                      <Select 
                        value={sampleData.actionType} 
                        onValueChange={(v) => setSampleData(prev => ({ ...prev, actionType: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="template_added">Template Added</SelectItem>
                          <SelectItem value="template_removed">Template Removed</SelectItem>
                          <SelectItem value="collaborator_joined">Collaborator Joined</SelectItem>
                          <SelectItem value="collaborator_left">Collaborator Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Collection Name</Label>
                      <Input 
                        value={sampleData.collectionName}
                        onChange={(e) => setSampleData(prev => ({ ...prev, collectionName: e.target.value }))}
                        placeholder="Marketing Templates"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={generatePreview} className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Generate Preview
                  </Button>
                </div>
                <Button onClick={sendTestEmail} variant="outline" className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Brand Colors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#6366f1' }} />
                    <span className="text-sm">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                    <span className="text-sm">Secondary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#1f2937' }} />
                    <span className="text-sm">Dark</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f9fafb' }} />
                    <span className="text-sm">Light</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <TabsList>
                      <TabsTrigger value="desktop">
                        <Monitor className="w-4 h-4 mr-1" />
                        Desktop
                      </TabsTrigger>
                      <TabsTrigger value="mobile">
                        <Smartphone className="w-4 h-4 mr-1" />
                        Mobile
                      </TabsTrigger>
                      <TabsTrigger value="code">
                        <Code className="w-4 h-4 mr-1" />
                        HTML
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {!previewHtml ? (
                  <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                    <Mail className="w-16 h-16 mb-4 opacity-50" />
                    <p>Click "Generate Preview" to see the email template</p>
                  </div>
                ) : viewMode === 'code' ? (
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                      <code>{previewHtml}</code>
                    </pre>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(previewHtml);
                        toast.success('HTML copied to clipboard');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                ) : (
                  <div 
                    className={`bg-white rounded-lg shadow-inner overflow-auto ${
                      viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''
                    }`}
                    style={{ maxHeight: '600px' }}
                  >
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[600px] border-0"
                      title="Email Preview"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
