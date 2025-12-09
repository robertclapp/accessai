import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  MousePointer,
  Trophy,
  Lightbulb,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { PLATFORM_DISPLAY_NAMES } from "@shared/constants";

// Platform colors for visual consistency
const platformColors: Record<string, { bg: string; text: string; border: string }> = {
  linkedin: { bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-600" },
  twitter: { bg: "bg-black", text: "text-black", border: "border-black" },
  facebook: { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500" },
  instagram: { bg: "bg-gradient-to-r from-purple-500 to-pink-500", text: "text-purple-600", border: "border-purple-500" },
  threads: { bg: "bg-black", text: "text-black", border: "border-black" }
};

// Platform icons
const platformIcons: Record<string, string> = {
  linkedin: "in",
  twitter: "𝕏",
  facebook: "f",
  instagram: "📷",
  threads: "@"
};

type DateRangeOption = "week" | "month" | "quarter" | "year" | "all";

export default function PlatformAnalytics() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("month");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  
  // Calculate date range
  const getDateRange = () => {
    if (dateRange === "all") return undefined;
    
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case "week":
        start.setDate(end.getDate() - 7);
        break;
      case "month":
        start.setMonth(end.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(end.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(end.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  };
  
  // Fetch platform comparison data
  const { data: platformComparison, isLoading: loadingComparison } = trpc.analytics.getPlatformComparison.useQuery({
    dateRange: getDateRange()
  });
  
  // Fetch best platform recommendation
  const { data: bestPlatform, isLoading: loadingBest } = trpc.analytics.getBestPlatform.useQuery();
  
  // Fetch trends for selected platform
  const { data: platformTrends, isLoading: loadingTrends } = trpc.analytics.getPlatformTrends.useQuery(
    { 
      platform: (selectedPlatform || "linkedin") as "linkedin" | "twitter" | "facebook" | "instagram" | "threads",
      period: dateRange === "all" ? "year" : dateRange
    },
    { enabled: !!selectedPlatform }
  );
  
  // Calculate totals across all platforms
  const totals = platformComparison?.reduce((acc, p) => ({
    posts: acc.posts + p.postCount,
    impressions: acc.impressions + p.totalImpressions,
    engagements: acc.engagements + p.totalEngagements,
    clicks: acc.clicks + p.totalClicks
  }), { posts: 0, impressions: 0, engagements: 0, clicks: 0 }) || { posts: 0, impressions: 0, engagements: 0, clicks: 0 };
  
  // Find max values for relative bar widths
  const maxEngagementRate = Math.max(...(platformComparison?.map(p => p.engagementRate) || [1]));
  const maxImpressions = Math.max(...(platformComparison?.map(p => p.totalImpressions) || [1]));
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Platform Analytics</h1>
            <p className="text-muted-foreground">
              Compare performance across all your connected social platforms
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
              <SelectTrigger className="w-40" aria-label="Select date range">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 90 days</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingComparison ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{totals.posts.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">Across all platforms</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingComparison ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{totals.impressions.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">Total reach</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingComparison ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{totals.engagements.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">Likes, comments, shares</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingComparison ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">Link clicks</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Best Platform Recommendation */}
        {!loadingBest && bestPlatform && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle>Best Performing Platform</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${platformColors[bestPlatform.platform]?.bg || "bg-gray-500"} flex items-center justify-center text-white text-xl font-bold`}>
                    {platformIcons[bestPlatform.platform] || "?"}
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {PLATFORM_DISPLAY_NAMES[bestPlatform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || bestPlatform.platform}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {bestPlatform.engagementRate.toFixed(2)}% engagement rate
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-4 bg-background rounded-lg max-w-md">
                  <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{bestPlatform.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Platform Comparison */}
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">Platform Comparison</TabsTrigger>
            <TabsTrigger value="details">Detailed Metrics</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          </TabsList>
          
          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Rate by Platform</CardTitle>
                <CardDescription>
                  Higher engagement rates indicate content that resonates with your audience
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingComparison ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : platformComparison && platformComparison.length > 0 ? (
                  <div className="space-y-4">
                    {platformComparison.map((platform, index) => (
                      <div key={platform.platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${platformColors[platform.platform]?.bg || "bg-gray-500"} flex items-center justify-center text-white text-sm font-bold`}>
                              {platformIcons[platform.platform] || "?"}
                            </div>
                            <div>
                              <p className="font-medium">
                                {PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform.platform}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {platform.publishedCount} published posts
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{platform.engagementRate.toFixed(2)}%</span>
                            {index === 0 && platformComparison.length > 1 && (
                              <Badge variant="secondary" className="gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Best
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress 
                          value={(platform.engagementRate / maxEngagementRate) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No platform data available yet.</p>
                    <p className="text-sm">Start posting to see your analytics here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Impressions by Platform</CardTitle>
                <CardDescription>
                  Total reach of your content across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingComparison ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : platformComparison && platformComparison.length > 0 ? (
                  <div className="space-y-4">
                    {[...platformComparison].sort((a, b) => b.totalImpressions - a.totalImpressions).map((platform) => (
                      <div key={platform.platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${platformColors[platform.platform]?.bg || "bg-gray-500"} flex items-center justify-center text-white text-sm font-bold`}>
                              {platformIcons[platform.platform] || "?"}
                            </div>
                            <span className="font-medium">
                              {PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform.platform}
                            </span>
                          </div>
                          <span className="text-lg font-bold">{platform.totalImpressions.toLocaleString()}</span>
                        </div>
                        <Progress 
                          value={(platform.totalImpressions / maxImpressions) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No impression data available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Detailed Metrics Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loadingComparison ? (
                [1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : platformComparison && platformComparison.length > 0 ? (
                platformComparison.map((platform) => (
                  <Card key={platform.platform} className={`border-l-4 ${platformColors[platform.platform]?.border || "border-gray-500"}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${platformColors[platform.platform]?.bg || "bg-gray-500"} flex items-center justify-center text-white font-bold`}>
                          {platformIcons[platform.platform] || "?"}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform.platform}
                          </CardTitle>
                          <CardDescription>
                            {platform.postCount} total posts
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            <span className="text-xs">Impressions</span>
                          </div>
                          <p className="text-lg font-semibold">{platform.totalImpressions.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            <span className="text-xs">Likes</span>
                          </div>
                          <p className="text-lg font-semibold">{platform.totalLikes.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageCircle className="h-3 w-3" />
                            <span className="text-xs">Comments</span>
                          </div>
                          <p className="text-lg font-semibold">{platform.totalComments.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Share2 className="h-3 w-3" />
                            <span className="text-xs">Shares</span>
                          </div>
                          <p className="text-lg font-semibold">{platform.totalShares.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Engagement Rate</span>
                          <span className="font-bold">{platform.engagementRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-muted-foreground">Avg. Accessibility</span>
                          <span className="font-bold">{platform.avgAccessibilityScore}/100</span>
                        </div>
                      </div>
                      
                      {platform.bestPerformingPost && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Best Performing Post</p>
                          <p className="text-sm font-medium truncate">
                            {platform.bestPerformingPost.title || `Post #${platform.bestPerformingPost.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {platform.bestPerformingPost.engagements.toLocaleString()} engagements
                          </p>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedPlatform(platform.platform)}
                      >
                        View Trends
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No platform data available yet.</p>
                    <p className="text-sm text-muted-foreground">Start posting to see detailed metrics.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Performance Trends</CardTitle>
                    <CardDescription>
                      Track how your content performs over time
                    </CardDescription>
                  </div>
                  <Select 
                    value={selectedPlatform || ""} 
                    onValueChange={setSelectedPlatform}
                  >
                    <SelectTrigger className="w-48" aria-label="Select platform for trends">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformComparison?.map(p => (
                        <SelectItem key={p.platform} value={p.platform}>
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded ${platformColors[p.platform]?.bg || "bg-gray-500"}`} />
                            {PLATFORM_DISPLAY_NAMES[p.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || p.platform}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedPlatform ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a platform to view performance trends</p>
                  </div>
                ) : loadingTrends ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : platformTrends && platformTrends.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4 font-medium">Date</th>
                            <th className="text-right py-2 px-4 font-medium">Posts</th>
                            <th className="text-right py-2 px-4 font-medium">Impressions</th>
                            <th className="text-right py-2 px-4 font-medium">Engagements</th>
                            <th className="text-right py-2 px-4 font-medium">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {platformTrends.map((day, index) => {
                            const prevDay = platformTrends[index - 1];
                            const rateChange = prevDay 
                              ? day.engagementRate - prevDay.engagementRate 
                              : 0;
                            
                            return (
                              <tr key={day.date} className="border-b hover:bg-muted/50">
                                <td className="py-2 px-4">
                                  {new Date(day.date).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric"
                                  })}
                                </td>
                                <td className="text-right py-2 px-4">{day.posts}</td>
                                <td className="text-right py-2 px-4">{day.impressions.toLocaleString()}</td>
                                <td className="text-right py-2 px-4">{day.engagements.toLocaleString()}</td>
                                <td className="text-right py-2 px-4">
                                  <span className="flex items-center justify-end gap-1">
                                    {day.engagementRate.toFixed(2)}%
                                    {rateChange !== 0 && (
                                      rateChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                                      )
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trend data available for this platform.</p>
                    <p className="text-sm">Post more content to see trends over time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
