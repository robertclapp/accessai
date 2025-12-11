/**
 * My Followed Collections Page
 * 
 * Dedicated page for managing followed collections, notification preferences,
 * and viewing recent templates added to followed collections.
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Heart,
  Bell,
  BellOff,
  FolderOpen,
  ArrowLeft,
  Loader2,
  Sparkles,
  Clock,
  User,
  ExternalLink,
  Trash2,
  Settings,
  Mail,
  Users,
  UserPlus,
  Check,
  X,
  Shield,
  Edit3,
  Eye,
  Activity,
  FileText,
  UserMinus,
  Share2,
  Lock,
  Filter,
  Calendar,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useWebSocket } from "@/hooks/useWebSocket";

const COLLECTION_COLORS: Record<string, string> = {
  '#6366f1': 'bg-indigo-500',
  '#ec4899': 'bg-pink-500',
  '#10b981': 'bg-emerald-500',
  '#f59e0b': 'bg-amber-500',
  '#8b5cf6': 'bg-violet-500',
  '#06b6d4': 'bg-cyan-500',
};

export default function FollowedCollections() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("collections");
  const [lastSeenActivity, setLastSeenActivity] = useState<Date>(() => {
    const stored = localStorage.getItem('lastSeenActivity');
    return stored ? new Date(stored) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });
  
  // Activity filtering state
  const [filterActionTypes, setFilterActionTypes] = useState<string[]>([]);
  const [filterCollectionIds, setFilterCollectionIds] = useState<number[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const utils = trpc.useUtils();
  
  // WebSocket for real-time activity notifications
  const handleActivityNotification = useCallback(() => {
    // Refetch activity feed when new activity comes in
    utils.abTesting.getUserActivityFeed.invalidate();
    utils.abTesting.getUnreadActivityCount.invalidate();
  }, [utils]);
  
  const { isConnected: wsConnected } = useWebSocket({
    onActivity: handleActivityNotification,
    showToasts: true,
  });
  
  // Collaborative collections queries
  const collaborativeCollectionsQuery = trpc.abTesting.getCollaborativeCollections.useQuery(
    undefined,
    { enabled: !!user }
  );
  const pendingInvitationsQuery = trpc.abTesting.getPendingInvitations.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Activity feed query
  const activityFeedQuery = trpc.abTesting.getUserActivityFeed.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );
  
  // Unread activity count
  const unreadCountQuery = trpc.abTesting.getUnreadActivityCount.useQuery(
    { since: lastSeenActivity },
    { enabled: !!user }
  );
  
  // Respond to invitation mutation
  const respondToInvitationMutation = trpc.abTesting.respondToInvitation.useMutation({
    onSuccess: () => {
      pendingInvitationsQuery.refetch();
      collaborativeCollectionsQuery.refetch();
      toast.success("Invitation response sent");
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Get followed collections
  const { data: followedCollections, isLoading } = trpc.abTesting.getFollowedCollections.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Unfollow mutation
  const unfollowMutation = trpc.abTesting.unfollowCollection.useMutation({
    onSuccess: () => {
      toast.success("Unfollowed collection");
      utils.abTesting.getFollowedCollections.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Toggle notifications mutation
  const toggleNotificationsMutation = trpc.abTesting.toggleCollectionNotifications.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
      utils.abTesting.getFollowedCollections.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Marketplace
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <h1 className="text-xl font-semibold">My Followed Collections</h1>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Digest Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="container py-8">
        {isLoading || authLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !followedCollections || followedCollections.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No followed collections yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Follow collections in the marketplace to get notified when new templates are added.
            </p>
            <Link href="/marketplace">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                Browse Marketplace
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-red-500/10">
                      <Heart className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{followedCollections.length}</p>
                      <p className="text-sm text-muted-foreground">Collections Followed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10">
                      <Bell className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {followedCollections.filter((c: any) => c.notificationsEnabled).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Notifications Enabled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <FolderOpen className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {followedCollections.reduce((acc: number, c: any) => acc + (c.templateCount || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Templates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="collections">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Collections ({followedCollections.length})
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
<TabsTrigger value="collaborative">
                  <Users className="w-4 h-4 mr-2" />
                  Collaborative
                  {pendingInvitationsQuery.data && pendingInvitationsQuery.data.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingInvitationsQuery.data.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" onClick={() => {
                  // Mark activities as seen when tab is clicked
                  localStorage.setItem('lastSeenActivity', new Date().toISOString());
                  setLastSeenActivity(new Date());
                }}>
                  <Activity className="w-4 h-4 mr-2" />
                  Activity
                  {unreadCountQuery.data && unreadCountQuery.data > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {unreadCountQuery.data}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              {/* Collections Tab */}
              <TabsContent value="collections" className="space-y-4 mt-4">
                {followedCollections.map((collection: any) => (
                  <Card key={collection.id} className="overflow-hidden">
                    <div className="flex">
                      {/* Color stripe */}
                      <div
                        className="w-2 shrink-0"
                        style={{ backgroundColor: collection.color || '#6366f1' }}
                      />
                      
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{collection.name}</h3>
                              {collection.isFeatured && (
                                <Badge variant="secondary" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            {collection.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {collection.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" />
                                {collection.templateCount || 0} templates
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {collection.creatorName || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Followed {formatDate(collection.followedAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 mr-4">
                              {collection.notificationsEnabled ? (
                                <Bell className="w-4 h-4 text-blue-500" />
                              ) : (
                                <BellOff className="w-4 h-4 text-muted-foreground" />
                              )}
                              <Switch
                                checked={collection.notificationsEnabled}
                                onCheckedChange={(checked) => {
                                  toggleNotificationsMutation.mutate({
                                    collectionId: collection.id,
                                    enabled: checked,
                                  });
                                }}
                              />
                            </div>
                            
                            <Link href="/marketplace">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => unfollowMutation.mutate({ collectionId: collection.id })}
                              disabled={unfollowMutation.isPending}
                            >
                              {unfollowMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
              
              {/* Notification Settings Tab */}
              <TabsContent value="notifications" className="space-y-4 mt-4">
                <Alert>
                  <Mail className="w-4 h-4" />
                  <AlertDescription>
                    Manage which collections send you notifications when new templates are added.
                    You can also configure weekly digest emails in your account settings.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                    <CardDescription>
                      Bulk manage notifications for all followed collections
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          followedCollections.forEach((c: any) => {
                            if (!c.notificationsEnabled) {
                              toggleNotificationsMutation.mutate({
                                collectionId: c.id,
                                enabled: true,
                              });
                            }
                          });
                          toast.success("Enabled notifications for all collections");
                        }}
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Enable All
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          followedCollections.forEach((c: any) => {
                            if (c.notificationsEnabled) {
                              toggleNotificationsMutation.mutate({
                                collectionId: c.id,
                                enabled: false,
                              });
                            }
                          });
                          toast.success("Disabled notifications for all collections");
                        }}
                      >
                        <BellOff className="w-4 h-4 mr-2" />
                        Disable All
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Per-Collection Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {followedCollections.map((collection: any) => (
                        <div
                          key={collection.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: collection.color || '#6366f1' }}
                            />
                            <span className="font-medium">{collection.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({collection.templateCount || 0} templates)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {collection.notificationsEnabled ? 'On' : 'Off'}
                            </span>
                            <Switch
                              checked={collection.notificationsEnabled}
                              onCheckedChange={(checked) => {
                                toggleNotificationsMutation.mutate({
                                  collectionId: collection.id,
                                  enabled: checked,
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Collaborative Collections Tab */}
              <TabsContent value="collaborative" className="space-y-4 mt-4">
                {/* Pending Invitations */}
                {pendingInvitationsQuery.data && pendingInvitationsQuery.data.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-500" />
                        Pending Invitations
                      </CardTitle>
                      <CardDescription>
                        You have {pendingInvitationsQuery.data.length} pending collaboration invitation(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pendingInvitationsQuery.data.map((invitation: any) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: invitation.collectionColor || '#6366f1' }}
                            >
                              <FolderOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{invitation.collectionName}</p>
                              <p className="text-sm text-muted-foreground">
                                Invited by {invitation.inviterName || 'Unknown'} as{' '}
                                <Badge variant="outline" className="text-xs">
                                  {invitation.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                  {invitation.role === 'editor' && <Edit3 className="w-3 h-3 mr-1" />}
                                  {invitation.role === 'viewer' && <Eye className="w-3 h-3 mr-1" />}
                                  {invitation.role}
                                </Badge>
                              </p>
                              {invitation.invitationMessage && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  "{invitation.invitationMessage}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => respondToInvitationMutation.mutate({
                                invitationId: invitation.id,
                                accept: true,
                              })}
                              disabled={respondToInvitationMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respondToInvitationMutation.mutate({
                                invitationId: invitation.id,
                                accept: false,
                              })}
                              disabled={respondToInvitationMutation.isPending}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                
                {/* Collaborative Collections */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-500" />
                      Collections I Collaborate On
                    </CardTitle>
                    <CardDescription>
                      Collections where you have been invited to contribute
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {collaborativeCollectionsQuery.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : !collaborativeCollectionsQuery.data || collaborativeCollectionsQuery.data.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>You're not collaborating on any collections yet.</p>
                        <p className="text-sm">When someone invites you to collaborate, it will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {collaborativeCollectionsQuery.data.map((collection: any) => (
                          <div
                            key={collection.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: collection.color || '#6366f1' }}
                              >
                                <FolderOpen className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{collection.name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {collection.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                    {collection.role === 'editor' && <Edit3 className="w-3 h-3 mr-1" />}
                                    {collection.role === 'viewer' && <Eye className="w-3 h-3 mr-1" />}
                                    {collection.role}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Owned by {collection.ownerName || 'Unknown'} · {collection.templateCount || 0} templates
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {collection.isPublic && (
                                <Badge variant="secondary" className="text-xs">
                                  Public
                                </Badge>
                              )}
                              <Link href="/marketplace">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Info about collaborative collections */}
                <Alert>
                  <Users className="w-4 h-4" />
                  <AlertDescription>
                    <strong>About Collaborative Collections:</strong> When you're invited to a collection, you can contribute templates based on your role:
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <Eye className="w-3 h-3" /> <strong>Viewer:</strong> Can view and download templates
                      </li>
                      <li className="flex items-center gap-2">
                        <Edit3 className="w-3 h-3" /> <strong>Editor:</strong> Can add and remove templates
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="w-3 h-3" /> <strong>Admin:</strong> Can manage collaborators and settings
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              {/* Activity Feed Tab */}
              <TabsContent value="activity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Recent Activity
                          {wsConnected && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                              Live
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Actions by collaborators on your shared collections
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFilters(!showFilters)}
                          className={showFilters ? 'bg-accent' : ''}
                        >
                          <Filter className="w-4 h-4 mr-1" />
                          Filters
                          {(filterActionTypes.length > 0 || filterCollectionIds.length > 0 || filterDateRange !== 'all') && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {filterActionTypes.length + filterCollectionIds.length + (filterDateRange !== 'all' ? 1 : 0)}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            activityFeedQuery.refetch();
                            toast.success('Activity refreshed');
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Filters Panel */}
                    {showFilters && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Action Type Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Action Type</label>
                            <Select
                              value={filterActionTypes.length === 0 ? 'all' : filterActionTypes[0]}
                              onValueChange={(value) => {
                                if (value === 'all') {
                                  setFilterActionTypes([]);
                                } else {
                                  setFilterActionTypes([value]);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All actions" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All actions</SelectItem>
                                <SelectItem value="template_added">Template added</SelectItem>
                                <SelectItem value="template_removed">Template removed</SelectItem>
                                <SelectItem value="collaborator_invited">Collaborator invited</SelectItem>
                                <SelectItem value="collaborator_joined">Collaborator joined</SelectItem>
                                <SelectItem value="collaborator_left">Collaborator left</SelectItem>
                                <SelectItem value="collaborator_removed">Collaborator removed</SelectItem>
                                <SelectItem value="collection_updated">Collection updated</SelectItem>
                                <SelectItem value="collection_shared">Collection shared</SelectItem>
                                <SelectItem value="collection_unshared">Collection unshared</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Date Range Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Date Range</label>
                            <Select
                              value={filterDateRange}
                              onValueChange={(value: 'all' | '7d' | '30d' | '90d') => setFilterDateRange(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All time</SelectItem>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                                <SelectItem value="90d">Last 90 days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Collection Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Collection</label>
                            <Select
                              value={filterCollectionIds.length === 0 ? 'all' : String(filterCollectionIds[0])}
                              onValueChange={(value) => {
                                if (value === 'all') {
                                  setFilterCollectionIds([]);
                                } else {
                                  setFilterCollectionIds([parseInt(value)]);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All collections" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All collections</SelectItem>
                                {followedCollections?.map((fc: any) => (
                                  <SelectItem key={fc.collection.id} value={String(fc.collection.id)}>
                                    {fc.collection.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Clear Filters */}
                        {(filterActionTypes.length > 0 || filterCollectionIds.length > 0 || filterDateRange !== 'all') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilterActionTypes([]);
                              setFilterCollectionIds([]);
                              setFilterDateRange('all');
                            }}
                          >
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {activityFeedQuery.isLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : !activityFeedQuery.data || activityFeedQuery.data.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No recent activity.</p>
                        <p className="text-sm">Activity from your collections will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activityFeedQuery.data.map((activity: any) => {
                          const isNew = new Date(activity.createdAt) > lastSeenActivity;
                          
                          // Get icon and description based on action type
                          const getActivityIcon = () => {
                            switch (activity.actionType) {
                              case 'template_added':
                                return <FileText className="w-4 h-4 text-green-500" />;
                              case 'template_removed':
                                return <Trash2 className="w-4 h-4 text-red-500" />;
                              case 'collaborator_invited':
                                return <UserPlus className="w-4 h-4 text-blue-500" />;
                              case 'collaborator_joined':
                                return <Check className="w-4 h-4 text-green-500" />;
                              case 'collaborator_left':
                              case 'collaborator_removed':
                                return <UserMinus className="w-4 h-4 text-orange-500" />;
                              case 'collection_updated':
                                return <Settings className="w-4 h-4 text-purple-500" />;
                              case 'collection_shared':
                                return <Share2 className="w-4 h-4 text-blue-500" />;
                              case 'collection_unshared':
                                return <Lock className="w-4 h-4 text-gray-500" />;
                              default:
                                return <Activity className="w-4 h-4" />;
                            }
                          };
                          
                          const getActivityDescription = () => {
                            const details = activity.actionDetails || {};
                            switch (activity.actionType) {
                              case 'template_added':
                                return `added template "${details.templateName || 'Unknown'}"${activity.message ? `: ${activity.message}` : ''}`;
                              case 'template_removed':
                                return `removed template "${details.templateName || 'Unknown'}"`;
                              case 'collaborator_invited':
                                return `invited ${details.collaboratorName || details.collaboratorEmail || 'someone'}`;
                              case 'collaborator_joined':
                                return 'joined the collection';
                              case 'collaborator_left':
                                return 'left the collection';
                              case 'collaborator_removed':
                                return `removed ${details.collaboratorName || 'a collaborator'}`;
                              case 'collection_updated':
                                return `updated ${details.fieldChanged || 'the collection'}`;
                              case 'collection_shared':
                                return 'made the collection public';
                              case 'collection_unshared':
                                return 'made the collection private';
                              default:
                                return 'performed an action';
                            }
                          };
                          
                          return (
                            <div
                              key={activity.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${isNew ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
                            >
                              <div className="mt-0.5">
                                {getActivityIcon()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{activity.userName || 'Someone'}</span>
                                  <span className="text-sm text-muted-foreground">{getActivityDescription()}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div
                                    className="w-4 h-4 rounded flex items-center justify-center"
                                    style={{ backgroundColor: activity.collectionColor || '#6366f1' }}
                                  >
                                    <FolderOpen className="w-2.5 h-2.5 text-white" />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{activity.collectionName}</span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {formatDate(activity.createdAt)}
                                  </span>
                                  {isNew && (
                                    <Badge variant="secondary" className="text-xs py-0">New</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
