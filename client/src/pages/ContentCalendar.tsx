/**
 * ContentCalendar Page
 * 
 * Visual calendar for scheduling and managing social media posts.
 * Supports drag-and-drop scheduling and multi-platform views.
 * 
 * Accessibility features:
 * - Full keyboard navigation
 * - ARIA labels and live regions
 * - Screen reader friendly date navigation
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Loader2,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import type { Platform, PostStatus } from "@shared/types";

// Platform colors
const platformColors: Record<string, string> = {
  linkedin: "bg-blue-600",
  twitter: "bg-black",
  facebook: "bg-blue-500",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  all: "bg-gray-500"
};

// Status colors
const statusColors: Record<PostStatus, string> = {
  draft: "bg-gray-400",
  scheduled: "bg-yellow-500",
  published: "bg-green-500",
  failed: "bg-red-500"
};

interface ScheduledPost {
  id: number;
  title: string | null;
  content: string;
  platform: Platform;
  status: PostStatus;
  scheduledAt: Date | null;
  accessibilityScore: number | null;
}

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  
  // Calculate date range for the current month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Query scheduled posts
  const { data: posts, isLoading, refetch } = trpc.posts.getScheduled.useQuery({
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString()
  });
  
  // Delete mutation
  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      setSelectedPost(null);
      refetch();
    }
  });

  // Get all days in the current month view (including padding days)
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add padding days from previous month
    const startDay = monthStart.getDay();
    const paddingStart = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - i - 1);
      paddingStart.push(date);
    }
    
    // Add padding days for next month
    const endDay = monthEnd.getDay();
    const paddingEnd = [];
    for (let i = 1; i < 7 - endDay; i++) {
      const date = new Date(monthEnd);
      date.setDate(date.getDate() + i);
      paddingEnd.push(date);
    }
    
    return [...paddingStart, ...days, ...paddingEnd];
  }, [monthStart, monthEnd]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledPost[]> = {};
    
    posts?.forEach(post => {
      if (post.scheduledAt) {
        const dateKey = format(new Date(post.scheduledAt), "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        
        // Apply platform filter
        if (platformFilter === "all" || post.platform === platformFilter) {
          grouped[dateKey].push(post as ScheduledPost);
        }
      }
    });
    
    return grouped;
  }, [posts, platformFilter]);

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get posts for a specific date
  const getPostsForDate = (date: Date): ScheduledPost[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    return postsByDate[dateKey] || [];
  };

  const handleDeletePost = (id: number) => {
    if (confirm("Are you sure you want to delete this post?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage your social media posts
            </p>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Post
          </Button>
        </div>
        
        {/* Calendar Controls */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <h2 className="text-xl font-semibold min-w-[200px] text-center">
                  {format(currentDate, "MMMM yyyy")}
                </h2>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                >
                  Today
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Select 
                  value={platformFilter} 
                  onValueChange={(v) => setPlatformFilter(v as Platform | "all")}
                >
                  <SelectTrigger className="w-40" aria-label="Filter by platform">
                    <SelectValue placeholder="All platforms" />
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
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const dayPosts = getPostsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-[100px] p-2 border rounded-lg text-left transition-colors
                        ${isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"}
                        ${isSelected ? "ring-2 ring-primary" : ""}
                        ${isTodayDate ? "border-primary" : "border-border"}
                        hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary
                      `}
                      aria-label={`${format(day, "EEEE, MMMM d, yyyy")}${dayPosts.length > 0 ? `, ${dayPosts.length} posts scheduled` : ""}`}
                      aria-pressed={isSelected || undefined}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`
                          text-sm font-medium
                          ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}
                        `}>
                          {format(day, "d")}
                        </span>
                        {dayPosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {dayPosts.length}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map((post) => (
                          <div
                            key={post.id}
                            className={`
                              text-xs p-1 rounded truncate text-white
                              ${platformColors[post.platform]}
                            `}
                            title={post.title || post.content.slice(0, 50)}
                          >
                            {post.title || post.content.slice(0, 20)}...
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayPosts.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Selected Date Posts */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getPostsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No posts scheduled for this date</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule a Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getPostsForDate(selectedDate).map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className={`w-1 h-full min-h-[60px] rounded ${platformColors[post.platform]}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">
                            {post.platform}
                          </Badge>
                          <Badge className={`${statusColors[post.status]} text-white`}>
                            {post.status}
                          </Badge>
                          {post.scheduledAt && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(post.scheduledAt), "h:mm a")}
                            </span>
                          )}
                        </div>
                        
                        {post.title && (
                          <h4 className="font-medium">{post.title}</h4>
                        )}
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                        
                        {post.accessibilityScore !== null && (
                          <div className="mt-2">
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
                              Accessibility: {post.accessibilityScore}/100
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPost(post)}
                          aria-label="View post details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit post"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePost(post.id)}
                          aria-label="Delete post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Post Detail Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPost?.title || "Post Details"}
              </DialogTitle>
              <DialogDescription>
                Scheduled for {selectedPost?.scheduledAt && format(new Date(selectedPost.scheduledAt), "PPpp")}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPost && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className="capitalize">
                    {selectedPost.platform}
                  </Badge>
                  <Badge className={`${statusColors[selectedPost.status]} text-white`}>
                    {selectedPost.status}
                  </Badge>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                </div>
                
                {selectedPost.accessibilityScore !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Accessibility Score:</span>
                    <Badge 
                      variant="outline"
                      className={
                        selectedPost.accessibilityScore >= 80 
                          ? "text-green-600 border-green-600" 
                          : selectedPost.accessibilityScore >= 60 
                            ? "text-yellow-600 border-yellow-600"
                            : "text-red-600 border-red-600"
                      }
                    >
                      {selectedPost.accessibilityScore}/100
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Legend */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Platforms:</span>
                {Object.entries(platformColors).filter(([k]) => k !== "all").map(([platform, color]) => (
                  <div key={platform} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${color}`} />
                    <span className="capitalize">{platform}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Status:</span>
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${color}`} />
                    <span className="capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
