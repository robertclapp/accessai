/**
 * Template Marketplace Page
 * 
 * Browse and download community-shared A/B test templates.
 * Features filtering, sorting, ratings, and download functionality.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Download,
  Star,
  TrendingUp,
  Filter,
  Loader2,
  Eye,
  Copy,
  Users,
  BarChart3,
  Sparkles,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const CATEGORY_COLORS: Record<string, string> = {
  headline: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cta: "bg-green-500/10 text-green-500 border-green-500/20",
  tone: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  format: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  audience: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  length: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  hook: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  social_proof: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
};

export default function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "newest" | "downloads">("popular");
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  
  const utils = trpc.useUtils();
  
  const { data: marketplaceData, isLoading } = trpc.abTesting.getMarketplaceTemplates.useQuery({
    category: category === "all" ? undefined : category,
    search: search || undefined,
    sortBy,
    limit: 50,
  });
  
  const { data: categories } = trpc.abTesting.getMarketplaceCategories.useQuery();
  const { data: trending } = trpc.abTesting.getTrendingTemplates.useQuery({ limit: 5 });
  
  const downloadMutation = trpc.abTesting.downloadMarketplaceTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template added to your library!");
      utils.abTesting.getMarketplaceTemplates.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const trackView = trpc.abTesting.trackTemplateEvent.useMutation();
  
  const handlePreview = (template: any) => {
    setPreviewTemplate(template);
    trackView.mutate({ templateId: template.id, eventType: "view", metadata: { source: "marketplace" } });
  };
  
  const handleDownload = (templateId: number) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    downloadMutation.mutate({ templateId });
  };
  
  const getCategoryColor = (cat: string) => {
    return CATEGORY_COLORS[cat] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };
  
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">Template Marketplace</h1>
              </div>
            </div>
            {user && (
              <Link href="/ab-testing">
                <Button variant="outline" size="sm">
                  My Templates
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <div className="container py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Button
                  variant={category === "all" ? "secondary" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setCategory("all")}
                >
                  All Templates
                  <Badge variant="outline" className="ml-2">
                    {marketplaceData?.total || 0}
                  </Badge>
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.category}
                    variant={category === cat.category ? "secondary" : "ghost"}
                    className="w-full justify-between"
                    onClick={() => setCategory(cat.category)}
                  >
                    <span className="capitalize">{cat.category.replace("_", " ")}</span>
                    <Badge variant="outline" className="ml-2">
                      {cat.count}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>
            
            {/* Trending */}
            {trending && trending.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    Trending This Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {trending.map((item, idx) => (
                    <button
                      key={item.template.id}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => handlePreview(item.template)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.recentDownloads} downloads this week
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sort Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {marketplaceData?.total || 0} templates available
              </p>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="downloads">Most Downloads</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Templates Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : marketplaceData?.templates.length === 0 ? (
              <Card className="p-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No templates found</h3>
                <p className="text-sm text-muted-foreground">
                  {search ? "Try adjusting your search terms" : "Be the first to share a template!"}
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {marketplaceData?.templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getCategoryColor(template.category)}>
                              {template.category}
                            </Badge>
                            {template.averageRating > 0 && (
                              <div className="flex items-center gap-1">
                                {renderStars(template.averageRating)}
                                <span className="text-xs text-muted-foreground">
                                  ({template.totalRatings})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {template.downloadCount} downloads
                        </span>
                        <span className="flex items-center gap-1">
                          <Copy className="w-3 h-3" />
                          {template.usageCount || 0} uses
                        </span>
                      </div>
                      
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(template.id)}
                          disabled={downloadMutation.isPending}
                        >
                          {downloadMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {previewTemplate?.description || "Preview this template before downloading"}
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getCategoryColor(previewTemplate.category)}>
                  {previewTemplate.category}
                </Badge>
                {previewTemplate.averageRating > 0 && (
                  <div className="flex items-center gap-1">
                    {renderStars(previewTemplate.averageRating)}
                    <span className="text-sm text-muted-foreground">
                      {previewTemplate.averageRating.toFixed(1)} ({previewTemplate.totalRatings} reviews)
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-sm mb-2 text-blue-600">
                    {previewTemplate.variantALabel || "Variant A"}
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{previewTemplate.variantATemplate}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <h4 className="font-medium text-sm mb-2 text-green-600">
                    {previewTemplate.variantBLabel || "Variant B"}
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{previewTemplate.variantBTemplate}</p>
                </div>
              </div>
              
              {previewTemplate.exampleUseCase && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Example Use Case</h4>
                  <p className="text-sm text-muted-foreground">{previewTemplate.exampleUseCase}</p>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {previewTemplate.downloadCount} downloads
                </span>
                <span className="flex items-center gap-1">
                  <Copy className="w-4 h-4" />
                  {previewTemplate.usageCount || 0} uses
                </span>
                {previewTemplate.creatorName && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    by {previewTemplate.creatorName}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                handleDownload(previewTemplate?.id);
                setPreviewTemplate(null);
              }}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download to My Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
