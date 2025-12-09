/**
 * Dashboard Page
 * 
 * Main dashboard for authenticated users with quick access to all features.
 * Fully accessible with keyboard navigation and screen reader support.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PenSquare, 
  Mic, 
  Calendar, 
  BarChart3, 
  BookOpen,
  Users,
  Sparkles,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  ArrowRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { format } from "date-fns";

interface QuickActionProps {
  title: string;
  description: string;
  icon: typeof PenSquare;
  href: string;
  color: string;
}

function QuickAction({ title, description, icon: Icon, href, color }: QuickActionProps) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  
  // Fetch dashboard data
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.getSummary.useQuery();
  const { data: recentPosts, isLoading: postsLoading } = trpc.posts.list.useQuery({ limit: 5 });
  const { data: subscription } = trpc.stripe.getSubscriptionStatus.useQuery();
  
  const isLoading = summaryLoading || postsLoading;
  
  // Calculate usage percentages (based on free tier limits)
  const tierLimits = {
    free: { posts: 10, voice: 5, images: 5 },
    creator: { posts: Infinity, voice: 60, images: 50 },
    pro: { posts: Infinity, voice: 120, images: 200 }
  };
  
  const currentTier = (subscription?.tier || "free") as keyof typeof tierLimits;
  const limits = tierLimits[currentTier];
  
  const postsUsed = summary?.totalPosts || 0;
  const postsPercent = limits.posts === Infinity ? 0 : Math.min(100, (postsUsed / limits.posts) * 100);

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex flex-col gap-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your content today.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/create">
                <PenSquare className="h-4 w-4 mr-2" />
                Create Post
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div data-tour="post-builder">
              <QuickAction
                title="Create Post"
                description="Write accessible content with AI assistance"
                icon={PenSquare}
                href="/create"
                color="bg-blue-500"
              />
            </div>
            <div data-tour="voice-input">
              <QuickAction
                title="Voice Input"
                description="Speak your content hands-free"
                icon={Mic}
                href="/create?voice=true"
                color="bg-purple-500"
              />
            </div>
            <div data-tour="content-calendar">
              <QuickAction
                title="Content Calendar"
                description="Schedule and plan your posts"
                icon={Calendar}
                href="/calendar"
                color="bg-green-500"
              />
            </div>
            <div data-tour="knowledge-base">
              <QuickAction
                title="Knowledge Base"
                description="Manage brand guidelines and swipe files"
                icon={BookOpen}
                href="/knowledge"
                color="bg-orange-500"
              />
            </div>
          </div>
        </section>
        
        {/* Stats Overview */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="text-xl font-semibold mb-4">Overview</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalPosts || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.publishedPosts || 0} published, {summary?.scheduledPosts || 0} scheduled
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Accessibility Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{summary?.avgAccessibilityScore || 0}</span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                  <Progress 
                    value={summary?.avgAccessibilityScore || 0} 
                    className="mt-2"
                    aria-label={`Accessibility score: ${summary?.avgAccessibilityScore || 0} out of 100`}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Impressions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(summary?.totalImpressions || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12% from last month</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Engagement Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.engagementRate || "0%"}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {summary?.totalEngagements || 0} total engagements
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
        
        {/* Usage & Subscription */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Plan Usage */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Plan Usage</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {subscription?.tier || "Free"} Plan
                </Badge>
              </div>
              <CardDescription>
                Your current usage this billing period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Posts</span>
                  <span className="text-sm text-muted-foreground">
                    {postsUsed} / {limits.posts === Infinity ? "∞" : limits.posts}
                  </span>
                </div>
                <Progress 
                  value={postsPercent} 
                  aria-label={`Posts used: ${postsUsed} of ${limits.posts === Infinity ? "unlimited" : limits.posts}`}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Voice Minutes</span>
                  <span className="text-sm text-muted-foreground">
                    0 / {limits.voice} min
                  </span>
                </div>
                <Progress value={0} aria-label="Voice minutes used: 0" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">AI Images</span>
                  <span className="text-sm text-muted-foreground">
                    0 / {limits.images}
                  </span>
                </div>
                <Progress value={0} aria-label="AI images generated: 0" />
              </div>
              
              {currentTier === "free" && (
                <Button asChild className="w-full mt-4">
                  <Link href="/pricing">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade for More
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Posts</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/posts">View All</Link>
                </Button>
              </div>
              <CardDescription>
                Your latest content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentPosts && recentPosts.length > 0 ? (
                <ul className="space-y-3" role="list">
                  {recentPosts.slice(0, 5).map((post) => (
                    <li key={post.id}>
                      <Link href={`/posts/${post.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                          <div className={`p-2 rounded ${
                            post.status === "published" 
                              ? "bg-green-100 text-green-600" 
                              : post.status === "scheduled"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                          }`}>
                            {post.status === "published" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {post.title || post.content.slice(0, 50)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {post.platform} • {format(new Date(post.createdAt), "MMM d")}
                            </p>
                          </div>
                          {post.accessibilityScore !== null && (
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
                              {post.accessibilityScore}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PenSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No posts yet</p>
                  <Button asChild className="mt-4">
                    <Link href="/create">Create Your First Post</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Accessibility Tips */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Accessibility Tip of the Day</h3>
                <p className="text-muted-foreground mt-1">
                  Use CamelCase for multi-word hashtags (like #AccessibleContent instead of #accessiblecontent) 
                  so screen readers can pronounce each word correctly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
