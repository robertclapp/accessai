/**
 * Admin Suppression List Management Page
 * 
 * Manages bounced and suppressed email addresses with:
 * - Searchable list with pagination
 * - Bounce stats summary
 * - Manual removal capability
 * - CSV import/export functionality
 * - Bulk operations
 */

import { useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Trash2, 
  AlertTriangle, 
  Mail, 
  Ban, 
  RefreshCw, 
  XCircle,
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSuppressionList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importReason, setImportReason] = useState('hard_bounce');
  const [importPreview, setImportPreview] = useState<{ email: string; valid: boolean; error?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  
  const { data: suppressionData, isLoading: listLoading, refetch } = trpc.abTesting.getSuppressionList.useQuery({
    limit: 20,
    offset: (page - 1) * 20,
  });
  
  const { data: searchResults, isLoading: searchLoading } = trpc.abTesting.searchSuppressionList.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );
  
  const { data: bounceStats } = trpc.abTesting.getBounceStats.useQuery();
  const { data: recentBounces } = trpc.abTesting.getRecentBounces.useQuery({ limit: 10 });
  
  const removeMutation = trpc.abTesting.removeFromSuppression.useMutation({
    onSuccess: () => {
      utils.abTesting.getSuppressionList.invalidate();
      utils.abTesting.getBounceStats.invalidate();
      utils.abTesting.searchSuppressionList.invalidate();
      setRemoveDialogOpen(false);
      setEmailToRemove('');
      toast.success('Email removed from suppression list');
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const bulkAddMutation = trpc.abTesting.bulkAddToSuppression.useMutation({
    onSuccess: (result) => {
      utils.abTesting.getSuppressionList.invalidate();
      utils.abTesting.getBounceStats.invalidate();
      setImportDialogOpen(false);
      setImportText('');
      setImportPreview([]);
      toast.success(`Import complete: ${result.added} added, ${result.skipped} skipped`);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const { data: exportData, refetch: fetchExportData } = trpc.abTesting.exportSuppressionList.useQuery(
    undefined,
    { enabled: false }
  );

  const handleRemove = (email: string) => {
    setEmailToRemove(email);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    removeMutation.mutate({ email: emailToRemove });
  };

  const getBounceTypeBadge = (type: string) => {
    switch (type) {
      case 'hard':
      case 'hard_bounce':
        return <Badge variant="destructive">Hard Bounce</Badge>;
      case 'soft':
      case 'soft_bounce':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Soft Bounce</Badge>;
      case 'complaint':
        return <Badge className="bg-orange-500">Complaint</Badge>;
      case 'unsubscribe':
        return <Badge variant="outline">Unsubscribed</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Parse import text and validate emails
  const parseImportText = (text: string) => {
    const lines = text.split(/[\n,;]/).map(line => line.trim()).filter(line => line.length > 0);
    const results = lines.map(email => {
      if (!isValidEmail(email)) {
        return { email, valid: false, error: 'Invalid email format' };
      }
      return { email: email.toLowerCase(), valid: true };
    });
    setImportPreview(results);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
      parseImportText(text);
    };
    reader.readAsText(file);
  };

  // Handle import
  const handleImport = async () => {
    const validEmails = importPreview.filter(e => e.valid).map(e => ({
      email: e.email,
      reason: importReason,
    }));

    if (validEmails.length === 0) {
      toast.error('No valid emails to import');
      return;
    }

    setIsImporting(true);
    try {
      await bulkAddMutation.mutateAsync({ emails: validEmails });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const result = await fetchExportData();
      const data = result.data;
      
      if (!data || data.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Create CSV content
      const headers = ['Email', 'Reason', 'Bounce Count', 'Last Bounce', 'Created At'];
      const rows = data.map(item => [
        item.email,
        item.reason,
        item.bounceCount?.toString() || '1',
        item.lastBounceAt ? new Date(item.lastBounceAt).toISOString() : '',
        item.createdAt ? new Date(item.createdAt).toISOString() : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `suppression-list-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${data.length} emails`);
    } catch (error) {
      toast.error('Failed to export suppression list');
    }
  };

  const displayData = searchQuery.length > 0 ? searchResults : suppressionData;
  const isLoading = searchQuery.length > 0 ? searchLoading : listLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Suppression List</h1>
            <p className="text-muted-foreground">
              Manage bounced and suppressed email addresses
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{bounceStats?.suppressedEmails || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Suppressed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{bounceStats?.hard || 0}</p>
                  <p className="text-sm text-muted-foreground">Hard Bounces</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{bounceStats?.soft || 0}</p>
                  <p className="text-sm text-muted-foreground">Soft Bounces</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{bounceStats?.complaint || 0}</p>
                  <p className="text-sm text-muted-foreground">Complaints</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Suppression List</TabsTrigger>
            <TabsTrigger value="recent">Recent Bounces</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Search and Refresh */}
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Suppression List Table */}
            <Card>
              <CardHeader>
                <CardTitle>Suppressed Emails</CardTitle>
                <CardDescription>
                  Emails that have been suppressed due to bounces, complaints, or unsubscribes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !displayData || displayData.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No emails found matching your search' : 'No suppressed emails'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Bounce Count</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.email}</TableCell>
                            <TableCell>{getBounceTypeBadge(item.reason)}</TableCell>
                            <TableCell>{item.bounceCount || 1}</TableCell>
                            <TableCell>{formatDate(item.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(item.email)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {!searchQuery && displayData && displayData.length >= 20 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          Previous
                        </Button>
                        <span className="flex items-center px-4 text-sm text-muted-foreground">
                          Page {page}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={displayData.length < 20}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bounces</CardTitle>
                <CardDescription>Latest bounce events received</CardDescription>
              </CardHeader>
              <CardContent>
                {recentBounces?.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No recent bounces</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Sub-Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentBounces?.map((bounce) => (
                        <TableRow key={bounce.id}>
                          <TableCell className="font-medium">{bounce.email}</TableCell>
                          <TableCell>{getBounceTypeBadge(bounce.bounceType)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{bounce.bounceSubType || 'Unknown'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{bounce.diagnosticCode || '-'}</TableCell>
                          <TableCell>{formatDate(bounce.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Remove Confirmation Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove from Suppression List</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <strong>{emailToRemove}</strong> from the suppression list?
                This will allow emails to be sent to this address again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmRemove} disabled={removeMutation.isPending}>
                {removeMutation.isPending ? 'Removing...' : 'Remove'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Suppression List</DialogTitle>
              <DialogDescription>
                Upload a CSV file or paste email addresses to add to the suppression list.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload CSV File</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>

              {/* Or paste emails */}
              <div className="space-y-2">
                <Label>Or Paste Emails</Label>
                <Textarea
                  placeholder="Enter email addresses (one per line, or comma/semicolon separated)"
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    parseImportText(e.target.value);
                  }}
                  rows={5}
                />
              </div>

              {/* Reason selector */}
              <div className="space-y-2">
                <Label>Suppression Reason</Label>
                <Select value={importReason} onValueChange={setImportReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                    <SelectItem value="soft_bounce">Soft Bounce</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                    <SelectItem value="manual">Manual Addition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview ({importPreview.filter(e => e.valid).length} valid, {importPreview.filter(e => !e.valid).length} invalid)</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                    {importPreview.slice(0, 50).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {item.valid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={item.valid ? '' : 'text-red-500'}>{item.email}</span>
                        {item.error && <span className="text-xs text-muted-foreground">({item.error})</span>}
                      </div>
                    ))}
                    {importPreview.length > 50 && (
                      <p className="text-sm text-muted-foreground">...and {importPreview.length - 50} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setImportDialogOpen(false);
                setImportText('');
                setImportPreview([]);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || importPreview.filter(e => e.valid).length === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {importPreview.filter(e => e.valid).length} Emails
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
