import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, Search, FileText, AlertTriangle, Copy, Folder, Settings, Palette, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CATEGORIES = [
  { value: "news", label: "News", color: "bg-blue-500" },
  { value: "opinion", label: "Opinion", color: "bg-purple-500" },
  { value: "art", label: "Art", color: "bg-pink-500" },
  { value: "photography", label: "Photography", color: "bg-amber-500" },
  { value: "tech", label: "Tech", color: "bg-cyan-500" },
  { value: "gaming", label: "Gaming", color: "bg-green-500" },
  { value: "food", label: "Food", color: "bg-orange-500" },
  { value: "politics", label: "Politics", color: "bg-red-500" },
  { value: "health", label: "Health", color: "bg-emerald-500" },
  { value: "personal", label: "Personal", color: "bg-indigo-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

type Category = "news" | "opinion" | "art" | "photography" | "tech" | "gaming" | "food" | "politics" | "health" | "personal" | "other";

export default function MastodonTemplates() {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "other" as Category,
    content: "",
    defaultCW: "",
    description: "",
  });
  
  // Category management state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", color: "#6366f1" });
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: templates, isLoading, refetch } = trpc.mastodonTemplates.list.useQuery();
  const { data: customCategories, refetch: refetchCategories } = trpc.templateCategories.list.useQuery();
  
  const createCategoryMutation = trpc.templateCategories.create.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      setNewCategory({ name: "", description: "", color: "#6366f1" });
      refetchCategories();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateCategoryMutation = trpc.templateCategories.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      setEditingCategory(null);
      refetchCategories();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteCategoryMutation = trpc.templateCategories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      refetchCategories();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const reorderCategoryMutation = trpc.templateCategories.reorder.useMutation({
    onSuccess: () => {
      toast.success("Categories reordered");
      refetchCategories();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && customCategories) {
      const oldIndex = customCategories.findIndex((cat) => cat.id === active.id);
      const newIndex = customCategories.findIndex((cat) => cat.id === over.id);
      
      const newOrder = arrayMove(customCategories, oldIndex, newIndex);
      const categoryIds = newOrder.map((cat) => cat.id);
      
      reorderCategoryMutation.mutate({ categoryIds });
    }
  };
  
  const createMutation = trpc.mastodonTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created", { description: "Your Mastodon template has been saved." });
      setIsCreateOpen(false);
      setNewTemplate({ name: "", category: "other", content: "", defaultCW: "", description: "" });
      refetch();
    },
    onError: (error) => {
      toast.error("Error", { description: error.message });
    },
  });

  const updateMutation = trpc.mastodonTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated", { description: "Your changes have been saved." });
      setIsEditOpen(false);
      setSelectedTemplate(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Error", { description: error.message });
    },
  });

  const deleteMutation = trpc.mastodonTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted", { description: "The template has been removed." });
      refetch();
    },
    onError: (error) => {
      toast.error("Error", { description: error.message });
    },
  });

  const duplicateMutation = trpc.mastodonTemplates.duplicate.useMutation({
    onSuccess: (result) => {
      toast.success("Template duplicated", { description: `Created "${result.name}"` });
      refetch();
    },
    onError: (error) => {
      toast.error("Error", { description: error.message });
    },
  });

  const handleDuplicate = (id: number, name: string) => {
    duplicateMutation.mutate({ id, newName: `${name} (Copy)` });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: newTemplate.name,
      category: newTemplate.category,
      content: newTemplate.content,
      defaultCW: newTemplate.defaultCW || undefined,
      description: newTemplate.description || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    
    updateMutation.mutate({
      id: selectedTemplate.id,
      name: selectedTemplate.name,
      category: selectedTemplate.category,
      content: selectedTemplate.content,
      defaultCW: selectedTemplate.defaultCW || undefined,
      description: selectedTemplate.description || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredTemplates = templates?.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const getCategoryInfo = (category: string | null) => {
    // First check custom categories
    const customCat = customCategories?.find(c => c.name.toLowerCase() === category?.toLowerCase());
    if (customCat) {
      return {
        value: customCat.name.toLowerCase(),
        label: customCat.name,
        color: '', // Will use inline style instead
        hexColor: customCat.color,
      };
    }
    // Fall back to preset categories
    const preset = CATEGORIES.find(c => c.value === category);
    if (preset) {
      return { ...preset, hexColor: null };
    }
    return { ...CATEGORIES[CATEGORIES.length - 1], hexColor: null };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mastodon Templates</h1>
            <p className="text-muted-foreground">
              Create and manage templates with content warnings for Mastodon posts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
              <Folder className="mr-2 h-4 w-4" />
              Manage Categories
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Mastodon Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template with content warning
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      placeholder="e.g., Political Discussion"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newTemplate.category}
                      onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v as Category })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Brief description of when to use this template"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cw">Content Warning (CW)</Label>
                  <Input
                    id="cw"
                    value={newTemplate.defaultCW}
                    onChange={(e) => setNewTemplate({ ...newTemplate, defaultCW: e.target.value })}
                    placeholder="e.g., Politics, US Election"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be shown as a spoiler tag on Mastodon
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content Template</Label>
                  <Textarea
                    id="content"
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    placeholder="Write your template content here. Use {{variable}} for placeholders."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {newTemplate.content.length}/500 characters
                  </p>
                </div>
                
                {/* Live Preview */}
                <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      {newTemplate.defaultCW && (
                        <div className="mb-3 flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">CW: {newTemplate.defaultCW}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">
                        {newTemplate.content || "Your content will appear here..."}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newTemplate.name || !newTemplate.content}>
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="text-muted-foreground text-center mt-1">
                {searchQuery || selectedCategory !== "all" 
                  ? "Try adjusting your search or filter"
                  : "Create your first Mastodon template to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(template => {
              const categoryInfo = getCategoryInfo(template.category);
              return (
                <Card key={template.id} className="group relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="secondary" 
                            className={categoryInfo.hexColor ? 'text-white' : `${categoryInfo.color} text-white`}
                            style={categoryInfo.hexColor ? { backgroundColor: categoryInfo.hexColor } : undefined}
                          >
                            {categoryInfo.label}
                          </Badge>
                          {template.isSystem && (
                            <Badge variant="outline">System</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsEditOpen(true);
                          }}
                          title="Edit template"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(template.id, template.name)}
                          disabled={duplicateMutation.isPending}
                          title="Duplicate template"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!template.isSystem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {template.defaultCW && (
                      <div className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-500 mb-2">
                        <AlertTriangle className="h-3 w-3" />
                        <span>CW: {template.defaultCW}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.content}
                    </p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {template.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update your Mastodon template
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Template Name</Label>
                    <Input
                      id="edit-name"
                      value={selectedTemplate.name}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={selectedTemplate.category || "other"}
                      onValueChange={(v) => setSelectedTemplate({ ...selectedTemplate, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={selectedTemplate.description || ""}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cw">Content Warning (CW)</Label>
                  <Input
                    id="edit-cw"
                    value={selectedTemplate.defaultCW || ""}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, defaultCW: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content">Content Template</Label>
                  <Textarea
                    id="edit-content"
                    value={selectedTemplate.content}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content: e.target.value })}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplate.content.length}/500 characters
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                How this template will appear on Mastodon
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  {selectedTemplate.defaultCW && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Content Warning</span>
                      </div>
                      <p className="mt-1 text-sm">{selectedTemplate.defaultCW}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Show Content
                      </Button>
                    </div>
                  )}
                  <div className={selectedTemplate.defaultCW ? "opacity-50" : ""}>
                    <p className="whitespace-pre-wrap">{selectedTemplate.content}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsPreviewOpen(false);
                setIsEditOpen(true);
              }}>
                Edit Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Management Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
              <DialogDescription>
                Create custom categories to organize your templates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Create new category */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">Create New Category</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Category name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Button
                      onClick={() => createCategoryMutation.mutate(newCategory)}
                      disabled={!newCategory.name || createCategoryMutation.isPending}
                      className="flex-1"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>

              {/* Custom categories list */}
              <div className="space-y-2">
                <h4 className="font-medium">Your Categories <span className="text-xs text-muted-foreground font-normal">(drag to reorder)</span></h4>
                {customCategories?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No custom categories yet. Create one above!
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={customCategories?.map(cat => cat.id) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {customCategories?.map((cat) => (
                          <SortableCategoryItem
                            key={cat.id}
                            cat={cat}
                            editingCategory={editingCategory}
                            setEditingCategory={setEditingCategory}
                            updateCategoryMutation={updateCategoryMutation}
                            deleteCategoryMutation={deleteCategoryMutation}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Default categories info */}
              <div className="pt-2 border-t">
                <h4 className="font-medium text-sm mb-2">Default Categories</h4>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map(cat => (
                    <Badge key={cat.value} variant="secondary" className="text-xs">
                      {cat.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Default categories cannot be modified
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


// Sortable category item component for drag and drop
function SortableCategoryItem({
  cat,
  editingCategory,
  setEditingCategory,
  updateCategoryMutation,
  deleteCategoryMutation,
}: {
  cat: any;
  editingCategory: any;
  setEditingCategory: (cat: any) => void;
  updateCategoryMutation: any;
  deleteCategoryMutation: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border rounded bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div
        className="w-4 h-4 rounded flex-shrink-0"
        style={{ backgroundColor: cat.color || "#6366f1" }}
      />
      {editingCategory?.id === cat.id ? (
        <>
          <Input
            value={editingCategory.name}
            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
            className="flex-1 h-8"
          />
          <Input
            type="color"
            value={editingCategory.color}
            onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
            className="w-8 h-8 p-0.5"
          />
          <Button
            size="sm"
            onClick={() => updateCategoryMutation.mutate(editingCategory)}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingCategory(null)}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 font-medium">{cat.name}</span>
          <span className="text-xs text-muted-foreground">
            {cat.templateCount || 0} templates
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingCategory({ id: cat.id, name: cat.name, color: cat.color })}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Delete this category?")) {
                deleteCategoryMutation.mutate({ id: cat.id });
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
