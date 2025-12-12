import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Trash2, AlertTriangle, Mail, Ban, RefreshCw, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

export default function AdminSuppressionList() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState('');

  const utils = trpc.useUtils();
  
  const { data: suppressionData, isLoading: listLoading, refetch } = trpc.abTesting.getSuppressionList.useQuery({
    limit: 20,
    offset: (page - 1) * 20,
  });
  
  const { data: bounceStats } = trpc.abTesting.getBounceStats.useQuery();
  const { data: recentBounces } = trpc.abTesting.getRecentBounces.useQuery({ limit: 10 });
  
  const removeMutation = trpc.abTesting.removeFromSuppression.useMutation({
    onSuccess: () => {
      utils.abTesting.getSuppressionList.invalidate();
      utils.abTesting.getBounceStats.invalidate();
      setRemoveDialogOpen(false);
      setEmailToRemove('');
      toast.success('Email removed from suppression list');
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
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
            <CardDescription>Please sign in to access the suppression list.</CardDescription>
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
        return <Badge variant="destructive">Hard Bounce</Badge>;
      case 'soft':
        return <Badge variant="secondary">Soft Bounce</Badge>;
      case 'complaint':
        return <Badge className="bg-orange-500">Complaint</Badge>;
      case 'unsubscribe':
        return <Badge variant="outline">Unsubscribed</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <h1 className="text-3xl font-bold">Email Suppression List</h1>
            <p className="text-muted-foreground">Manage bounced and suppressed email addresses</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

        {/* Search and Refresh */}
        <div className="flex gap-4 mb-6">
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Suppressed Emails</CardTitle>
            <CardDescription>
              Emails that have been suppressed due to bounces, complaints, or unsubscribes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : suppressionData?.length === 0 ? (
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
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppressionData?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.email}</TableCell>
                        <TableCell>{getBounceTypeBadge(item.reason)}</TableCell>
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
                {suppressionData && suppressionData.length > 20 && (
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
                      disabled={suppressionData.length < 20}
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

        {/* Recent Bounces */}
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
                    <TableHead>Provider</TableHead>
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
      </div>
    </div>
  );
}
