import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Activity,
  BarChart3,
  Timer,
  Loader2
} from "lucide-react";

export default function AdminScheduler() {
  const { user, loading: authLoading } = useAuth();
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Queries
  const { data: schedulerStatus, refetch: refetchStatus } = trpc.abTesting.getSchedulerStatus.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );
  
  const { data: jobHistory, refetch: refetchHistory } = trpc.abTesting.getJobHistory.useQuery(
    { 
      jobId: selectedJob === "all" ? undefined : selectedJob,
      status: statusFilter === "all" ? undefined : statusFilter as any,
      limit: 50 
    },
    { enabled: !!user && user.role === "admin" }
  );
  
  const { data: jobStats } = trpc.abTesting.getJobStats.useQuery(
    { jobId: selectedJob === "all" ? undefined : selectedJob },
    { enabled: !!user && user.role === "admin" }
  );
  
  // Mutations
  const runJobMutation = trpc.abTesting.runJobManually.useMutation({
    onSuccess: () => {
      refetchStatus();
      refetchHistory();
    },
  });
  
  const setJobEnabledMutation = trpc.abTesting.setJobEnabled.useMutation({
    onSuccess: () => {
      refetchStatus();
    },
  });
  
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-xl font-semibold">Sign in required</h2>
          <p className="text-muted-foreground">Please sign in to access the admin dashboard.</p>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  if (user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }
  
  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case "failure":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case "skipped":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const jobs = schedulerStatus?.jobs || [];
  const uniqueJobIds = Array.from(new Set(jobs.map((j: any) => j.id)));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scheduler Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage scheduled jobs</p>
          </div>
          <Button variant="outline" onClick={() => { refetchStatus(); refetchHistory(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobStats?.totalRuns || 0}</div>
              <p className="text-xs text-muted-foreground">All time executions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {jobStats?.successRate?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {jobStats?.successfulRuns || 0} successful / {jobStats?.failedRuns || 0} failed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(jobStats?.avgDurationMs || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Average execution time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Run</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobStats?.lastRun ? new Date(jobStats.lastRun).toLocaleDateString() : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {jobStats?.lastRun ? new Date(jobStats.lastRun).toLocaleTimeString() : "No runs yet"}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Scheduled Jobs</TabsTrigger>
            <TabsTrigger value="history">Execution History</TabsTrigger>
          </TabsList>
          
          {/* Scheduled Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="grid gap-4">
              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No scheduled jobs configured</p>
                  </CardContent>
                </Card>
              ) : (
                jobs.map((job: any) => (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{job.name}</CardTitle>
                          <CardDescription>ID: {job.id}</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`job-${job.id}-enabled`} className="text-sm">
                              {job.enabled ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id={`job-${job.id}-enabled`}
                              checked={job.enabled}
                              onCheckedChange={(enabled) => {
                                setJobEnabledMutation.mutate({ jobId: job.id, enabled });
                              }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runJobMutation.mutate({ jobId: job.id })}
                            disabled={runJobMutation.isPending}
                          >
                            {runJobMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Run Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Schedule</p>
                          <p className="font-mono text-sm">{job.cron || "Not scheduled"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Run</p>
                          <p className="text-sm">{formatDate(job.lastRun)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Next Run</p>
                          <p className="text-sm">{formatDate(job.nextRun)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          {/* Execution History Tab */}
          <TabsContent value="history" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="w-48">
                <Label className="text-sm mb-1 block">Job</Label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger>
                    <SelectValue placeholder="All jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All jobs</SelectItem>
                    {uniqueJobIds.map((id: string) => (
                      <SelectItem key={id} value={id}>{id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-sm mb-1 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* History Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Job</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Started</th>
                        <th className="text-left p-4 font-medium">Duration</th>
                        <th className="text-left p-4 font-medium">Items</th>
                        <th className="text-left p-4 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!jobHistory?.history?.length ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No execution history found
                          </td>
                        </tr>
                      ) : (
                        jobHistory.history.map((entry: any) => (
                          <tr key={entry.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{entry.jobName}</p>
                                <p className="text-xs text-muted-foreground">{entry.jobId}</p>
                              </div>
                            </td>
                            <td className="p-4">{getStatusBadge(entry.status)}</td>
                            <td className="p-4 text-sm">{formatDate(entry.startedAt)}</td>
                            <td className="p-4 text-sm font-mono">{formatDuration(entry.durationMs)}</td>
                            <td className="p-4">
                              <div className="text-sm">
                                <span className="text-green-500">{entry.itemsSuccessful}</span>
                                {" / "}
                                <span className="text-red-500">{entry.itemsFailed}</span>
                                {" / "}
                                <span>{entry.itemsProcessed}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {entry.errorMessage ? (
                                <span className="text-sm text-red-500 truncate max-w-[200px] block" title={entry.errorMessage}>
                                  {entry.errorMessage}
                                </span>
                              ) : entry.resultSummary ? (
                                <span className="text-sm text-muted-foreground truncate max-w-[200px] block" title={entry.resultSummary}>
                                  {entry.resultSummary}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {jobHistory && jobHistory.total > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing 50 of {jobHistory.total} entries
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
