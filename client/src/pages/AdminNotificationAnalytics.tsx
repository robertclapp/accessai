import { useState, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, TrendingUp, Mail, Bell, MousePointer, Eye, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function AdminNotificationAnalytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [notificationType, setNotificationType] = useState<'all' | 'email' | 'push'>('all');

  // Calculate date range
  const dateFilters = useMemo(() => {
    const now = new Date();
    let startDate: string | undefined;
    
    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startDate = undefined;
    }
    
    return {
      startDate,
      endDate: now.toISOString(),
      notificationType: notificationType === 'all' ? undefined : notificationType,
    };
  }, [dateRange, notificationType]);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.abTesting.getNotificationAnalytics.useQuery(dateFilters);
  const { data: recentNotifications, isLoading: recentLoading } = trpc.abTesting.getRecentNotifications.useQuery({ limit: 20 });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>Please sign in to access the notification analytics dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = () => {
    if (!stats) return;
    
    const data = {
      exportDate: new Date().toISOString(),
      dateRange,
      notificationType,
      stats,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-analytics-${dateRange}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/scheduler">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Notification Analytics</h1>
              <p className="text-muted-foreground">Track engagement metrics for emails and push notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchStats()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!stats}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={notificationType} onValueChange={(v) => setNotificationType(v as 'all' | 'email' | 'push')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="email">Email only</SelectItem>
              <SelectItem value="push">Push only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Total Sent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalSent.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Total Opened
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalOpened.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4" />
                    Total Clicked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalClicked.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Open Rate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.openRate.toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Click Rate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.clickRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <Tabs defaultValue="overview" className="mb-8">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="byType">By Type</TabsTrigger>
                <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Open Rate Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Open Rate Trend</CardTitle>
                      <CardDescription>Percentage of notifications opened over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Current Open Rate</p>
                          <p className="text-4xl font-bold text-green-600">{stats.openRate.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {stats.totalOpened} of {stats.totalSent} notifications
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Click Rate Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Click Rate Trend</CardTitle>
                      <CardDescription>Percentage of notifications clicked over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <MousePointer className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Current Click Rate</p>
                          <p className="text-4xl font-bold text-blue-600">{stats.clickRate.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {stats.totalClicked} of {stats.totalSent} notifications
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="byType" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance by Notification Type</CardTitle>
                    <CardDescription>Compare engagement across different notification channels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(stats.byType).length > 0 ? (
                        Object.entries(stats.byType).map(([type, data]) => (
                          <div key={type} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {type === 'email' ? (
                                  <Mail className="h-5 w-5 text-blue-500" />
                                ) : (
                                  <Bell className="h-5 w-5 text-purple-500" />
                                )}
                                <span className="font-medium capitalize">{type}</span>
                              </div>
                              <Badge variant="outline">{data.sent} sent</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Opened</p>
                                <p className="font-medium">{data.opened} ({data.sent > 0 ? ((data.opened / data.sent) * 100).toFixed(1) : 0}%)</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Clicked</p>
                                <p className="font-medium">{data.clicked} ({data.sent > 0 ? ((data.clicked / data.sent) * 100).toFixed(1) : 0}%)</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">CTR</p>
                                <p className="font-medium">{data.opened > 0 ? ((data.clicked / data.opened) * 100).toFixed(1) : 0}%</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No notification data available for the selected period</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Notifications</CardTitle>
                    <CardDescription>Latest notification activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : recentNotifications && recentNotifications.length > 0 ? (
                      <div className="space-y-2">
                        {recentNotifications.map((notification) => (
                          <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {notification.notificationType === 'email' ? (
                                <Mail className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Bell className="h-4 w-4 text-purple-500" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{notification.templateType || 'Notification'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={notification.status === 'clicked' ? 'default' : notification.status === 'opened' ? 'secondary' : 'outline'}>
                                {notification.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent notifications</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
