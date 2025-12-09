/**
 * Testimonials & Partners Admin Page
 * 
 * Admin interface for managing testimonials and featured partners/media logos.
 * Accessible with full keyboard navigation and screen reader support.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Star, 
  Quote, 
  Building2, 
  ArrowLeft,
  GripVertical,
  Eye,
  EyeOff
} from "lucide-react";
import { Link } from "wouter";

interface Testimonial {
  id: number;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  avatarUrl: string | null;
  rating: number | null;
  featured: boolean | null;
  displayOrder: number | null;
  isActive: boolean | null;
  createdAt: Date;
}

interface FeaturedPartner {
  id: number;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  partnerType: "media" | "customer" | "partner" | "integration" | null;
  displayOrder: number | null;
  isActive: boolean | null;
  createdAt: Date;
}

export default function TestimonialsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  // Testimonials state
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    name: "",
    role: "",
    company: "",
    quote: "",
    avatarUrl: "",
    rating: 5,
    featured: false,
    displayOrder: 0,
    isActive: true,
  });

  // Partners state
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<FeaturedPartner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: "",
    logoUrl: "",
    websiteUrl: "",
    partnerType: "partner" as "media" | "customer" | "partner" | "integration",
    displayOrder: 0,
    isActive: true,
  });

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "testimonial" | "partner"; id: number; name: string } | null>(null);

  // Queries
  const { data: testimonials, isLoading: testimonialsLoading } = trpc.testimonials.getAll.useQuery();
  const { data: partners, isLoading: partnersLoading } = trpc.partners.getAll.useQuery();

  // Mutations
  const createTestimonial = trpc.testimonials.create.useMutation({
    onSuccess: () => {
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getActive.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setTestimonialDialogOpen(false);
      resetTestimonialForm();
      toast.success("Testimonial created successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTestimonial = trpc.testimonials.update.useMutation({
    onSuccess: () => {
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getActive.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setTestimonialDialogOpen(false);
      setEditingTestimonial(null);
      resetTestimonialForm();
      toast.success("Testimonial updated successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTestimonial = trpc.testimonials.delete.useMutation({
    onSuccess: () => {
      utils.testimonials.getAll.invalidate();
      utils.testimonials.getActive.invalidate();
      utils.testimonials.getFeatured.invalidate();
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast.success("Testimonial deleted successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const createPartner = trpc.partners.create.useMutation({
    onSuccess: () => {
      utils.partners.getAll.invalidate();
      utils.partners.getActive.invalidate();
      setPartnerDialogOpen(false);
      resetPartnerForm();
      toast.success("Partner created successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePartner = trpc.partners.update.useMutation({
    onSuccess: () => {
      utils.partners.getAll.invalidate();
      utils.partners.getActive.invalidate();
      setPartnerDialogOpen(false);
      setEditingPartner(null);
      resetPartnerForm();
      toast.success("Partner updated successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePartner = trpc.partners.delete.useMutation({
    onSuccess: () => {
      utils.partners.getAll.invalidate();
      utils.partners.getActive.invalidate();
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast.success("Partner deleted successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  // Form helpers
  const resetTestimonialForm = () => {
    setTestimonialForm({
      name: "",
      role: "",
      company: "",
      quote: "",
      avatarUrl: "",
      rating: 5,
      featured: false,
      displayOrder: 0,
      isActive: true,
    });
  };

  const resetPartnerForm = () => {
    setPartnerForm({
      name: "",
      logoUrl: "",
      websiteUrl: "",
      partnerType: "partner",
      displayOrder: 0,
      isActive: true,
    });
  };

  const openEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      name: testimonial.name,
      role: testimonial.role || "",
      company: testimonial.company || "",
      quote: testimonial.quote,
      avatarUrl: testimonial.avatarUrl || "",
      rating: testimonial.rating || 5,
      featured: testimonial.featured || false,
      displayOrder: testimonial.displayOrder || 0,
      isActive: testimonial.isActive !== false,
    });
    setTestimonialDialogOpen(true);
  };

  const openEditPartner = (partner: FeaturedPartner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl || "",
      partnerType: partner.partnerType || "partner",
      displayOrder: partner.displayOrder || 0,
      isActive: partner.isActive !== false,
    });
    setPartnerDialogOpen(true);
  };

  const handleTestimonialSubmit = () => {
    const data = {
      name: testimonialForm.name,
      role: testimonialForm.role || undefined,
      company: testimonialForm.company || undefined,
      quote: testimonialForm.quote,
      avatarUrl: testimonialForm.avatarUrl || undefined,
      rating: testimonialForm.rating,
      featured: testimonialForm.featured,
      displayOrder: testimonialForm.displayOrder,
      isActive: testimonialForm.isActive,
    };

    if (editingTestimonial) {
      updateTestimonial.mutate({ id: editingTestimonial.id, ...data });
    } else {
      createTestimonial.mutate(data);
    }
  };

  const handlePartnerSubmit = () => {
    const data = {
      name: partnerForm.name,
      logoUrl: partnerForm.logoUrl,
      websiteUrl: partnerForm.websiteUrl || undefined,
      partnerType: partnerForm.partnerType,
      displayOrder: partnerForm.displayOrder,
      isActive: partnerForm.isActive,
    };

    if (editingPartner) {
      updatePartner.mutate({ id: editingPartner.id, ...data });
    } else {
      createPartner.mutate(data);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "testimonial") {
      deleteTestimonial.mutate({ id: deleteTarget.id });
    } else {
      deletePartner.mutate({ id: deleteTarget.id });
    }
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" aria-label="Back to dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Social Proof Management</h1>
              <p className="text-muted-foreground">Manage testimonials and featured partners</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="testimonials" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="testimonials" className="flex items-center gap-2">
              <Quote className="h-4 w-4" />
              Testimonials
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Partners
            </TabsTrigger>
          </TabsList>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Testimonials</h2>
                <p className="text-muted-foreground">Customer quotes displayed on the landing page</p>
              </div>
              <Button onClick={() => { resetTestimonialForm(); setEditingTestimonial(null); setTestimonialDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Testimonial
              </Button>
            </div>

            {testimonialsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-48" />
                  </Card>
                ))}
              </div>
            ) : testimonials && testimonials.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial: Testimonial) => (
                  <Card key={testimonial.id} className={`relative ${!testimonial.isActive ? "opacity-60" : ""}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {testimonial.featured && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                              Featured
                            </Badge>
                          )}
                          {!testimonial.isActive && (
                            <Badge variant="outline" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditTestimonial(testimonial)}
                            aria-label={`Edit testimonial from ${testimonial.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setDeleteTarget({ type: "testimonial", id: testimonial.id, name: testimonial.name }); setDeleteConfirmOpen(true); }}
                            aria-label={`Delete testimonial from ${testimonial.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {testimonial.rating && (
                        <div className="flex gap-0.5 mb-3">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}

                      <blockquote className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        "{testimonial.quote}"
                      </blockquote>

                      <div className="border-t pt-3">
                        <div className="font-medium">{testimonial.name}</div>
                        {(testimonial.role || testimonial.company) && (
                          <div className="text-sm text-muted-foreground">
                            {testimonial.role}{testimonial.role && testimonial.company && " at "}{testimonial.company}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Quote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No testimonials yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first testimonial to display on the landing page.</p>
                  <Button onClick={() => { resetTestimonialForm(); setTestimonialDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Testimonial
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Featured Partners</h2>
                <p className="text-muted-foreground">Logos displayed in the "As Seen In" section</p>
              </div>
              <Button onClick={() => { resetPartnerForm(); setEditingPartner(null); setPartnerDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </div>

            {partnersLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-32" />
                  </Card>
                ))}
              </div>
            ) : partners && partners.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {partners.map((partner: FeaturedPartner) => (
                  <Card key={partner.id} className={`relative ${!partner.isActive ? "opacity-60" : ""}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {partner.partnerType || "partner"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditPartner(partner)}
                            aria-label={`Edit ${partner.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setDeleteTarget({ type: "partner", id: partner.id, name: partner.name }); setDeleteConfirmOpen(true); }}
                            aria-label={`Delete ${partner.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center h-16 mb-3">
                        <img 
                          src={partner.logoUrl} 
                          alt={`${partner.name} logo`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="text-center">
                        <div className="font-medium text-sm">{partner.name}</div>
                        {!partner.isActive && (
                          <Badge variant="outline" className="text-xs mt-1">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No partners yet</h3>
                  <p className="text-muted-foreground mb-4">Add partner logos to display in the "As Seen In" section.</p>
                  <Button onClick={() => { resetPartnerForm(); setPartnerDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Partner
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Testimonial Dialog */}
      <Dialog open={testimonialDialogOpen} onOpenChange={setTestimonialDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              {editingTestimonial ? "Update the testimonial details below." : "Add a new customer testimonial to display on the landing page."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testimonial-name">Name *</Label>
                <Input
                  id="testimonial-name"
                  value={testimonialForm.name}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                  placeholder="Sarah M."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonial-role">Role</Label>
                <Input
                  id="testimonial-role"
                  value={testimonialForm.role}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                  placeholder="Content Creator"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-company">Company</Label>
              <Input
                id="testimonial-company"
                value={testimonialForm.company}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, company: e.target.value })}
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-quote">Quote *</Label>
              <Textarea
                id="testimonial-quote"
                value={testimonialForm.quote}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, quote: e.target.value })}
                placeholder="AccessAI has transformed how I create content..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testimonial-avatar">Avatar URL</Label>
                <Input
                  id="testimonial-avatar"
                  value={testimonialForm.avatarUrl}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, avatarUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonial-rating">Rating (1-5)</Label>
                <Select
                  value={testimonialForm.rating.toString()}
                  onValueChange={(value) => setTestimonialForm({ ...testimonialForm, rating: parseInt(value) })}
                >
                  <SelectTrigger id="testimonial-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} Star{n !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="testimonial-featured"
                  checked={testimonialForm.featured}
                  onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, featured: checked })}
                />
                <Label htmlFor="testimonial-featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="testimonial-active"
                  checked={testimonialForm.isActive}
                  onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, isActive: checked })}
                />
                <Label htmlFor="testimonial-active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestimonialDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTestimonialSubmit}
              disabled={!testimonialForm.name || !testimonialForm.quote || createTestimonial.isPending || updateTestimonial.isPending}
            >
              {createTestimonial.isPending || updateTestimonial.isPending ? "Saving..." : editingTestimonial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner Dialog */}
      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Edit Partner" : "Add Partner"}</DialogTitle>
            <DialogDescription>
              {editingPartner ? "Update the partner details below." : "Add a new partner logo to display on the landing page."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partner-name">Name *</Label>
              <Input
                id="partner-name"
                value={partnerForm.name}
                onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                placeholder="TechCrunch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-logo">Logo URL *</Label>
              <Input
                id="partner-logo"
                value={partnerForm.logoUrl}
                onChange={(e) => setPartnerForm({ ...partnerForm, logoUrl: e.target.value })}
                placeholder="https://..."
              />
              {partnerForm.logoUrl && (
                <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                  <img 
                    src={partnerForm.logoUrl} 
                    alt="Logo preview"
                    className="max-h-12 max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-website">Website URL</Label>
              <Input
                id="partner-website"
                value={partnerForm.websiteUrl}
                onChange={(e) => setPartnerForm({ ...partnerForm, websiteUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-type">Type</Label>
              <Select
                value={partnerForm.partnerType}
                onValueChange={(value: "media" | "customer" | "partner" | "integration") => setPartnerForm({ ...partnerForm, partnerType: value })}
              >
                <SelectTrigger id="partner-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="media">Media (As Seen In)</SelectItem>
                  <SelectItem value="customer">Customer (Trusted By)</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="partner-active"
                checked={partnerForm.isActive}
                onCheckedChange={(checked) => setPartnerForm({ ...partnerForm, isActive: checked })}
              />
              <Label htmlFor="partner-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePartnerSubmit}
              disabled={!partnerForm.name || !partnerForm.logoUrl || createPartner.isPending || updatePartner.isPending}
            >
              {createPartner.isPending || updatePartner.isPending ? "Saving..." : editingPartner ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteTestimonial.isPending || deletePartner.isPending}
            >
              {deleteTestimonial.isPending || deletePartner.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
