/**
 * Admin Email Deliverability Dashboard
 * 
 * Provides a comprehensive view of email deliverability metrics including:
 * - Delivery rate, bounce rate, and complaint rate
 * - Bounce trends over time
 * - Top bouncing domains
 * - Bounce type distribution
 * - Deliverability score
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { 
  Mail, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
} from 'lucide-react';

export default function AdminDeliverability() {
  const [trendDays, setTrendDays] = useState<number>(30);
  
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = 
    trpc.abTesting.getDeliverabilityMetrics.useQuery();
  
  const { data: score, isLoading: scoreLoading } = 
    trpc.abTesting.getDeliverabilityScore.useQuery();
  
  const { data: trends, isLoading: trendsLoading } = 
    trpc.abTesting.getBounceTrends.useQuery({ days: trendDays });
  
  const { data: topDomains, isLoading: domainsLoading } = 
    trpc.abTesting.getTopBouncingDomains.useQuery({ limit: 10 });
  
  const { data: distribution, isLoading: distributionLoading } = 
    trpc.abTesting.getBounceTypeDistribution.useQuery();

  const { data: bounceStats } = trpc.abTesting.getBounceStats.useQuery();

  const getScoreColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-500';
    if (grade.startsWith('B')) return 'text-blue-500';
    if (grade.startsWith('C')) return 'text-yellow-500';
    if (grade.startsWith('D')) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 dark:bg-green-900/30';
    if (grade.startsWith('B')) return 'bg-blue-100 dark:bg-blue-900/30';
    if (grade.startsWith('C')) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (grade.startsWith('D')) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Deliverability</h1>
            <p className="text-muted-foreground">
              Monitor email health, bounce rates, and deliverability metrics
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetchMetrics()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Deliverability Score Card */}
        {score && (
          <Card className={`${getScoreBgColor(score.grade)} border-none`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(score.grade)}`}>
                      {score.grade}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Score: {score.score}/100
                    </div>
                  </div>
                  <div className="h-16 w-px bg-border" />
                  <div>
                    <h3 className="font-semibold text-lg">Deliverability Score</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Your email deliverability score is calculated based on bounce rates, 
                      complaint rates, and overall email health metrics.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {formatPercentage(score.metrics.deliveryRate)}
                    </div>
                    <div className="text-xs text-muted-foreground">Delivery Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {formatPercentage(score.metrics.bounceRate)}
                    </div>
                    <div className="text-xs text-muted-foreground">Bounce Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {formatPercentage(score.metrics.complaintRate)}
                    </div>
                    <div className="text-xs text-muted-foreground">Complaint Rate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.totalSent.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Emails sent via digest system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metricsLoading ? '...' : metrics?.totalDelivered.toLocaleString() || 0}
              </div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {metrics ? formatPercentage(metrics.deliveryRate) : '0%'} delivery rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bounced</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metricsLoading ? '...' : metrics?.totalBounced.toLocaleString() || 0}
              </div>
              <div className="flex items-center text-xs text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                {metrics ? formatPercentage(metrics.bounceRate) : '0%'} bounce rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complaints</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metricsLoading ? '...' : metrics?.totalComplaints.toLocaleString() || 0}
              </div>
              <div className="flex items-center text-xs text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {metrics ? formatPercentage(metrics.complaintRate) : '0%'} complaint rate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Bounce Trends
            </TabsTrigger>
            <TabsTrigger value="domains" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Top Domains
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2">
              <PieChart className="h-4 w-4" />
              Bounce Types
            </TabsTrigger>
          </TabsList>

          {/* Bounce Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bounce Trends</CardTitle>
                    <CardDescription>
                      Daily bounce counts over the selected time period
                    </CardDescription>
                  </div>
                  <Select 
                    value={trendDays.toString()} 
                    onValueChange={(v) => setTrendDays(parseInt(v))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="60">Last 60 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : trends && trends.length > 0 ? (
                  <div className="space-y-4">
                    {/* Simple bar chart representation */}
                    <div className="h-64 flex items-end gap-1 overflow-x-auto pb-6">
                      {trends.map((day, i) => {
                        const maxTotal = Math.max(...trends.map(t => t.total), 1);
                        const height = (day.total / maxTotal) * 100;
                        return (
                          <div 
                            key={i} 
                            className="flex-1 min-w-[8px] flex flex-col items-center group relative"
                          >
                            <div 
                              className="w-full bg-red-500 rounded-t transition-all hover:bg-red-600"
                              style={{ height: `${height}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                            />
                            <div className="absolute -bottom-6 text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                              {day.date}: {day.total} bounces
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded" />
                        <span>Hard: {trends.reduce((sum, d) => sum + d.hard, 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded" />
                        <span>Soft: {trends.reduce((sum, d) => sum + d.soft, 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded" />
                        <span>Complaints: {trends.reduce((sum, d) => sum + d.complaint, 0)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bounce data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Domains Tab */}
          <TabsContent value="domains" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Bouncing Domains</CardTitle>
                <CardDescription>
                  Email domains with the highest bounce rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {domainsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : topDomains && topDomains.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead className="text-right">Hard</TableHead>
                        <TableHead className="text-right">Soft</TableHead>
                        <TableHead className="text-right">Complaints</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topDomains.map((domain, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{domain.domain}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive" className="font-mono">
                              {domain.hard}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="font-mono bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {domain.soft}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="font-mono bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              {domain.complaint}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">{domain.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bouncing domains data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bounce Type Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bounce Type Distribution</CardTitle>
                <CardDescription>
                  Breakdown of bounces by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {distributionLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : distribution && distribution.length > 0 ? (
                  <div className="space-y-6">
                    {/* Visual distribution */}
                    <div className="flex h-8 rounded-lg overflow-hidden">
                      {distribution.map((item, i) => {
                        const total = distribution.reduce((sum, d) => sum + d.count, 0);
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="transition-all hover:opacity-80"
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: item.color,
                              minWidth: percentage > 0 ? '20px' : '0'
                            }}
                            title={`${item.type}: ${item.count} (${percentage.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Legend with counts */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {distribution.map((item, i) => {
                        const total = distribution.reduce((sum, d) => sum + d.count, 0);
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <div>
                              <div className="font-medium">{item.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.count} ({percentage.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bounce type data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Stats */}
            {bounceStats && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Bounces</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{bounceStats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Auto-Unsubscribed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{bounceStats.autoUnsubscribed}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Suppressed Emails</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{bounceStats.suppressedEmails}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
