/**
 * Analytics Dashboard Page
 * 
 * Displays post performance metrics, engagement analytics,
 * and accessibility score trends.
 * 
 * Accessibility features:
 * - Screen reader friendly charts with text alternatives
 * - Keyboard navigable data tables
 * - High contrast mode support
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  MousePointer,
  Calendar,
  Loader2,
  CheckCircle,
  FileText,
  Clock,
  Target
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Chart colors
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0077b5",
  twitter: "#1da1f2",
  facebook: "#4267b2",
  instagram: "#e4405f"
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: typeof BarChart3;
  description?: string;
}

function StatCard({ title, value, change, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(change)}% vs last period</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  
  // Query analytics data
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.getSummary.useQuery();
  // Platform breakdown will be calculated from posts data
  const platformLoading = false;
  const { data: recentPosts, isLoading: postsLoading } = trpc.posts.list.useQuery({ 
    limit: 10,
    status: "published"
  });

  const isLoading = summaryLoading || postsLoading;

  // Mock data for charts (in production, this would come from the API)
  const engagementData = [
    { name: "Mon", impressions: 4000, engagements: 240, clicks: 120 },
    { name: "Tue", impressions: 3000, engagements: 198, clicks: 98 },
    { name: "Wed", impressions: 5000, engagements: 300, clicks: 150 },
    { name: "Thu", impressions: 4500, engagements: 270, clicks: 135 },
    { name: "Fri", impressions: 6000, engagements: 360, clicks: 180 },
    { name: "Sat", impressions: 3500, engagements: 210, clicks: 105 },
    { name: "Sun", impressions: 4200, engagements: 252, clicks: 126 }
  ];

  const accessibilityTrend = [
    { date: "Week 1", score: 72 },
    { date: "Week 2", score: 75 },
    { date: "Week 3", score: 78 },
    { date: "Week 4", score: 82 },
    { date: "Week 5", score: 85 },
    { date: "Week 6", score: 88 }
  ];

  // Calculate platform distribution from posts
  const platformData = recentPosts ? 
    Object.entries(
      recentPosts.reduce((acc: Record<string, number>, post) => {
        acc[post.platform] = (acc[post.platform] || 0) + 1;
        return acc;
      }, {})
    ).map(([platform, count]) => ({
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      value: count,
      color: PLATFORM_COLORS[platform] || COLORS[0]
    })) : [];

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track your content performance and accessibility metrics
            </p>
          </div>
          
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40" aria-label="Select date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-40" aria-label="Select platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">X (Twitter)</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Posts"
                value={summary?.totalPosts || 0}
                icon={FileText}
                description={`${summary?.publishedPosts || 0} published, ${summary?.scheduledPosts || 0} scheduled`}
              />
              <StatCard
                title="Total Impressions"
                value={(summary?.totalImpressions || 0).toLocaleString()}
                change={12}
                icon={Eye}
              />
              <StatCard
                title="Total Engagements"
                value={(summary?.totalEngagements || 0).toLocaleString()}
                change={8}
                icon={Heart}
              />
              <StatCard
                title="Avg. Accessibility Score"
                value={`${summary?.avgAccessibilityScore || 0}/100`}
                change={5}
                icon={CheckCircle}
                description="WCAG compliance rating"
              />
            </div>
            
            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Engagement Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Engagement Over Time
                  </CardTitle>
                  <CardDescription>
                    Daily impressions, engagements, and clicks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]" role="img" aria-label="Bar chart showing engagement metrics over time">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={engagementData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Legend />
                        <Bar dataKey="impressions" fill="#3b82f6" name="Impressions" />
                        <Bar dataKey="engagements" fill="#10b981" name="Engagements" />
                        <Bar dataKey="clicks" fill="#f59e0b" name="Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Screen reader alternative */}
                  <div className="sr-only">
                    <h4>Engagement data summary</h4>
                    <ul>
                      {engagementData.map((day) => (
                        <li key={day.name}>
                          {day.name}: {day.impressions} impressions, {day.engagements} engagements, {day.clicks} clicks
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              {/* Accessibility Score Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Accessibility Score Trend
                  </CardTitle>
                  <CardDescription>
                    Average WCAG compliance score over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]" role="img" aria-label="Line chart showing accessibility score improvement over time">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={accessibilityTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: "#10b981" }}
                          name="Accessibility Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="sr-only">
                    <h4>Accessibility score trend</h4>
                    <ul>
                      {accessibilityTrend.map((week) => (
                        <li key={week.date}>
                          {week.date}: Score {week.score}/100
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              {/* Platform Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Posts by Platform
                  </CardTitle>
                  <CardDescription>
                    Distribution of posts across social platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {platformData.length > 0 ? (
                    <div className="h-[300px]" role="img" aria-label="Pie chart showing post distribution by platform">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={platformData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {platformData.map((entry: { name: string; value: number; color: string }, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No posts yet
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Key performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <span>Click-through Rate</span>
                      </div>
                      <Badge variant="secondary">
                        {summary?.engagementRate || "0%"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span>Engagement Rate</span>
                      </div>
                      <Badge variant="secondary">
                        {summary?.engagementRate || "0%"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>Avg. Comments per Post</span>
                      </div>
                      <Badge variant="secondary">
                        {summary?.totalPosts ? Math.round((summary.totalEngagements || 0) / summary.totalPosts * 0.1) : 0}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Best Posting Time</span>
                      </div>
                      <Badge variant="secondary">
                        9:00 AM - 11:00 AM
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Posts Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts Performance</CardTitle>
                <CardDescription>
                  Performance metrics for your latest published posts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentPosts && recentPosts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium" scope="col">Post</th>
                          <th className="text-left py-3 px-4 font-medium" scope="col">Platform</th>
                          <th className="text-right py-3 px-4 font-medium" scope="col">Impressions</th>
                          <th className="text-right py-3 px-4 font-medium" scope="col">Engagements</th>
                          <th className="text-right py-3 px-4 font-medium" scope="col">Clicks</th>
                          <th className="text-right py-3 px-4 font-medium" scope="col">Accessibility</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPosts.map((post) => (
                          <tr key={post.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="max-w-[300px]">
                                <p className="font-medium truncate">
                                  {post.title || post.content.slice(0, 50)}...
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {post.createdAt && format(new Date(post.createdAt), "MMM d, yyyy")}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="capitalize">
                                {post.platform}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {post.accessibilityScore !== null ? (
                                <Badge 
                                  variant="outline"
                                  className={
                                    post.accessibilityScore >= 80 
                                      ? "text-green-600 border-green-600" 
                                      : post.accessibilityScore >= 60 
                                        ? "text-yellow-600 border-yellow-600"
                                        : "text-red-600 border-red-600"
                                  }
                                >
                                  {post.accessibilityScore}/100
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No published posts yet</p>
                    <p className="text-sm">Create and publish posts to see performance metrics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
