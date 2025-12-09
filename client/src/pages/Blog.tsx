/**
 * Public Blog Listing Page
 * 
 * SEO-optimized blog listing with categories, pagination, and accessible design.
 * Showcases accessibility tips and drives organic traffic.
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Tag,
  Accessibility,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Blog() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const postsPerPage = 9;

  const { data, isLoading } = trpc.blog.list.useQuery({
    limit: postsPerPage,
    offset: (page - 1) * postsPerPage,
  });

  const { data: categories } = trpc.blog.categories.useQuery();

  const totalPages = data ? Math.ceil(data.total / postsPerPage) : 1;

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta - would be handled by helmet in production */}
      
      {/* Skip Link for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Accessibility className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="font-bold text-xl">AccessAI</span>
          </Link>
          <nav className="flex items-center gap-6" aria-label="Main navigation">
            <Link href="/blog" className="text-sm font-medium text-primary">
              Blog
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Accessibility Insights & Tips
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Learn how to create inclusive social media content that reaches everyone. 
            Expert guides on WCAG compliance, accessible design, and inclusive communication.
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search articles..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search blog articles"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="main-content" className="container py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4" aria-hidden="true" />
                Categories
              </h2>
              <nav aria-label="Blog categories">
                <ul className="space-y-2">
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      aria-current={!searchQuery ? "page" : undefined}
                    >
                      All Articles
                    </Button>
                  </li>
                  {categories?.map((category: { id: number; name: string; slug: string }) => (
                    <li key={category.id}>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                      >
                        {category.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Newsletter Signup */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-lg">Stay Updated</CardTitle>
                  <CardDescription>
                    Get accessibility tips delivered to your inbox weekly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                    <Input 
                      type="email" 
                      placeholder="your@email.com"
                      aria-label="Email address for newsletter"
                    />
                    <Button className="w-full">Subscribe</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Blog Posts Grid */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 rounded-t-lg" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : data?.posts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No articles published yet. Check back soon!
                </p>
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </Card>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6" role="feed" aria-label="Blog articles">
                  {data?.posts.map((post: { id: number; slug: string; title: string; excerpt: string | null; featuredImage: string | null; featuredImageAlt: string | null; publishedAt: Date | null; readingTimeMinutes: number | null; viewCount: number | null; category: { name: string } | null }) => (
                    <article key={post.id} className="group">
                      <Link href={`/blog/${post.slug}`}>
                        <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                          {post.featuredImage && (
                            <div className="aspect-video overflow-hidden">
                              <img
                                src={post.featuredImage}
                                alt={post.featuredImageAlt || ""}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <CardHeader>
                            {post.category && (
                              <Badge variant="secondary" className="w-fit mb-2">
                                {post.category.name}
                              </Badge>
                            )}
                            <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                              {post.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-3">
                              {post.excerpt}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                <time dateTime={post.publishedAt?.toString()}>
                                  {formatDate(post.publishedAt)}
                                </time>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {post.readingTimeMinutes} min read
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" aria-hidden="true" />
                                {post.viewCount?.toLocaleString()} views
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav 
                    className="flex justify-center items-center gap-2 mt-12"
                    aria-label="Blog pagination"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="px-4 text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Create Accessible Content?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of creators using AccessAI to make their social media 
            content accessible to everyone.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="gap-2">
              Start Creating for Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="font-semibold">AccessAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AccessAI. Making social media accessible for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
