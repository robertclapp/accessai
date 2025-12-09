/**
 * KnowledgeBase Page
 * 
 * Allows users to manage their brand guidelines, swipe files,
 * AI instructions, and other reference materials that inform
 * AI content generation.
 * 
 * Accessibility features:
 * - Full keyboard navigation
 * - ARIA labels and live regions
 * - Screen reader optimized tables and lists
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen, 
  FileText, 
  Lightbulb, 
  MessageSquare,
  HelpCircle,
  MoreHorizontal,
  Loader2,
  Brain,
  Star
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { KnowledgeBaseType } from "@shared/types";

// Type configuration
const typeConfig: Record<KnowledgeBaseType, { icon: typeof BookOpen; label: string; description: string }> = {
  brand_guideline: { 
    icon: BookOpen, 
    label: "Brand Guideline", 
    description: "Brand voice, tone, and style guidelines" 
  },
  swipe_file: { 
    icon: FileText, 
    label: "Swipe File", 
    description: "Examples of great content to reference" 
  },
  ai_instruction: { 
    icon: Lightbulb, 
    label: "AI Instruction", 
    description: "Custom instructions for AI content generation" 
  },
  testimonial: { 
    icon: MessageSquare, 
    label: "Testimonial", 
    description: "Customer testimonials and success stories" 
  },
  faq: { 
    icon: HelpCircle, 
    label: "FAQ", 
    description: "Frequently asked questions and answers" 
  },
  other: { 
    icon: MoreHorizontal, 
    label: "Other", 
    description: "Other reference materials" 
  }
};

interface KnowledgeBaseItem {
  id: number;
  title: string;
  content: string;
  type: KnowledgeBaseType;
  tags: string[] | null;
  includeInAiContext: boolean | null;
  priority: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<KnowledgeBaseType | "all">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBaseItem | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<KnowledgeBaseType>("brand_guideline");
  const [formTags, setFormTags] = useState("");
  const [formIncludeInAi, setFormIncludeInAi] = useState(true);
  const [formPriority, setFormPriority] = useState(0);
  
  // Queries
  const { data: items, isLoading, refetch } = trpc.knowledgeBase.list.useQuery({
    type: selectedType === "all" ? undefined : selectedType
  });
  
  // Mutations
  const createMutation = trpc.knowledgeBase.create.useMutation({
    onSuccess: () => {
      toast.success("Item created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to create item", { description: error.message });
    }
  });
  
  const updateMutation = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated successfully");
      setEditingItem(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to update item", { description: error.message });
    }
  });
  
  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete item", { description: error.message });
    }
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormType("brand_guideline");
    setFormTags("");
    setFormIncludeInAi(true);
    setFormPriority(0);
  };

  const openEditDialog = (item: KnowledgeBaseItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormType(item.type);
    setFormTags(item.tags?.join(", ") || "");
    setFormIncludeInAi(item.includeInAiContext ?? true);
    setFormPriority(item.priority ?? 0);
  };

  const handleSubmit = () => {
    const tags = formTags.split(",").map(t => t.trim()).filter(Boolean);
    
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        title: formTitle,
        content: formContent,
        type: formType,
        tags,
        includeInAiContext: formIncludeInAi,
        priority: formPriority
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        content: formContent,
        type: formType,
        tags,
        includeInAiContext: formIncludeInAi,
        priority: formPriority
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Filter items by search query
  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }) || [];

  // Group items by type for display
  const groupedItems = filteredItems.reduce((acc, item) => {
    const type = item.type as KnowledgeBaseType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<KnowledgeBaseType, typeof filteredItems>);

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground mt-1">
              Store brand guidelines, swipe files, and AI instructions to personalize your content
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Knowledge Base Item</DialogTitle>
                <DialogDescription>
                  Add content that will help AI generate personalized posts for you
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="item-title">Title</Label>
                    <Input
                      id="item-title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g., Brand Voice Guidelines"
                    />
                  </div>
                  
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="item-type">Type</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as KnowledgeBaseType)}>
                      <SelectTrigger id="item-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="item-content">Content</Label>
                  <Textarea
                    id="item-content"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Enter your content here..."
                    rows={8}
                  />
                </div>
                
                <div>
                  <Label htmlFor="item-tags">Tags (comma-separated)</Label>
                  <Input
                    id="item-tags"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g., brand, voice, tone"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-ai"
                      checked={formIncludeInAi}
                      onCheckedChange={setFormIncludeInAi}
                    />
                    <Label htmlFor="include-ai" className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Include in AI context
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formPriority.toString()} 
                      onValueChange={(v) => setFormPriority(parseInt(v))}
                    >
                      <SelectTrigger id="priority" className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Normal</SelectItem>
                        <SelectItem value="1">High</SelectItem>
                        <SelectItem value="2">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formTitle.trim() || !formContent.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Create Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search knowledge base"
            />
          </div>
          
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as KnowledgeBaseType | "all")}>
            <SelectTrigger className="w-48" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(typeConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <config.icon className="h-4 w-4" />
                    {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery 
                  ? "Try adjusting your search or filters"
                  : "Add your first knowledge base item to help AI generate personalized content"
                }
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([type, typeItems]) => {
              const config = typeConfig[type as KnowledgeBaseType];
              const Icon = config.icon;
              
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">{config.label}</h2>
                    <Badge variant="secondary">{typeItems.length}</Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {typeItems.map((item) => (
                      <Card key={item.id} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                {(item.priority ?? 0) > 0 && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" aria-label="High priority" />
                                )}
                                {item.title}
                              </CardTitle>
                              {item.includeInAiContext && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  AI Context
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(item)}
                                aria-label={`Edit ${item.title}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.id)}
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {item.content}
                          </p>
                          
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Knowledge Base Item</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as KnowledgeBaseType)}>
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={8}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-include-ai"
                    checked={formIncludeInAi}
                    onCheckedChange={setFormIncludeInAi}
                  />
                  <Label htmlFor="edit-include-ai" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Include in AI context
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select 
                    value={formPriority.toString()} 
                    onValueChange={(v) => setFormPriority(parseInt(v))}
                  >
                    <SelectTrigger id="edit-priority" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">High</SelectItem>
                      <SelectItem value="2">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formTitle.trim() || !formContent.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
