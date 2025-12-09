/**
 * Individual Blog Post Page
 * 
 * SEO-optimized blog post with accessible design, related posts, and social sharing.
 */

import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Eye, 
  ArrowLeft,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Copy,
  Check,
  Accessibility,
  User
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);

  const { data: post, isLoading, error } = trpc.blog.bySlug.useQuery(
    { slug: params.slug || "" },
    { enabled: !!params.slug }
  );

  const { data: relatedPosts } = trpc.blog.related.useQuery(
    { 
      postId: post?.id || 0, 
      categoryId: post?.category?.id || null, 
      limit: 3 
    },
    { enabled: !!post?.id }
  );

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Share functions
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = post?.title || "";

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="aspect-video mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Link for Accessibility */}
      <a 
        href="#article-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to article content
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

      {/* Article */}
      <article className="container py-12 max-w-4xl">
        {/* Back Link */}
        <Link href="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to all articles
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          {post.category && (
            <Badge variant="secondary" className="mb-4">
              {post.category.name}
            </Badge>
          )}
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">
              {post.excerpt}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.author && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                {post.author.name}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <time dateTime={post.publishedAt?.toString()}>
                {formatDate(post.publishedAt)}
              </time>
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {post.readingTimeMinutes} min read
            </span>
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {post.viewCount?.toLocaleString()} views
            </span>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <figure className="mb-8">
            <img
              src={post.featuredImage}
              alt={post.featuredImageAlt || ""}
              className="w-full rounded-lg shadow-lg"
            />
            {post.featuredImageAlt && (
              <figcaption className="text-sm text-muted-foreground mt-2 text-center">
                {post.featuredImageAlt}
              </figcaption>
            )}
          </figure>
        )}

        {/* Article Content */}
        <div 
          id="article-content"
          className="prose prose-lg dark:prose-invert max-w-none mb-12"
        >
          <Streamdown>{post.content}</Streamdown>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: { id: number; name: string; slug: string }) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-8" />

        {/* Share Section */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5" aria-hidden="true" />
            Share this article
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={shareOnTwitter}
              aria-label="Share on Twitter"
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={shareOnLinkedIn}
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={shareOnFacebook}
              aria-label="Share on Facebook"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyLink}
              aria-label="Copy link to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section aria-labelledby="related-posts-heading">
            <h2 id="related-posts-heading" className="text-2xl font-bold mb-6">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost: { id: number; slug: string; title: string; excerpt: string | null; featuredImage: string | null; publishedAt: Date | null }) => (
                <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    {relatedPost.featuredImage && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img
                          src={relatedPost.featuredImage}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-2 text-lg">
                        {relatedPost.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Create Accessible Content?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Put these accessibility tips into practice with AccessAI's 
            AI-powered content creation tools.
          </p>
          <Link href="/dashboard">
            <Button size="lg">Start Creating for Free</Button>
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
