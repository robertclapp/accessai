/**
 * Sitemap Generator for AccessAI
 * 
 * Generates XML sitemaps for search engine optimization, including
 * static pages, blog posts, and blog categories. Follows the
 * sitemap protocol (https://www.sitemaps.org/protocol.html).
 * 
 * @module server/sitemap
 */

import { Router, Request, Response } from 'express';
import { getPublishedBlogPosts, getBlogCategories } from './db';

/**
 * Express router for sitemap endpoints
 */
export const sitemapRouter = Router();

/**
 * URL entry in the sitemap
 */
interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Formats a Date to ISO 8601 format (YYYY-MM-DD) for sitemap
 * 
 * @param date - The date to format
 * @returns ISO 8601 formatted date string
 */
function formatSitemapDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Escapes special XML characters
 * 
 * @param text - The text to escape
 * @returns XML-safe escaped string
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a single URL entry for the sitemap
 * 
 * @param url - The URL configuration
 * @returns XML string for the URL entry
 */
function generateUrlEntry(url: SitemapUrl): string {
  let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
  
  if (url.lastmod) {
    entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
  }
  
  if (url.changefreq) {
    entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
  }
  
  if (url.priority !== undefined) {
    entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
  }
  
  entry += '\n  </url>';
  return entry;
}

/**
 * Static pages that should always be in the sitemap
 */
const STATIC_PAGES: Array<Omit<SitemapUrl, 'loc'> & { path: string }> = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/blog', changefreq: 'daily', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.8 },
];

/**
 * Generates the main sitemap.xml
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
async function generateSitemap(req: Request, res: Response): Promise<void> {
  try {
    // Get the base URL from the request
    const protocol = req.protocol;
    const host = req.get('host') || 'accessai.app';
    const baseUrl = `${protocol}://${host}`;
    
    const urls: SitemapUrl[] = [];
    
    // Add static pages
    for (const page of STATIC_PAGES) {
      urls.push({
        loc: `${baseUrl}${page.path}`,
        lastmod: formatSitemapDate(new Date()),
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }
    
    // Add blog categories
    try {
      const categories = await getBlogCategories();
      for (const category of categories) {
        urls.push({
          loc: `${baseUrl}/blog?category=${category.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
        });
      }
    } catch (error) {
      console.warn('[Sitemap] Could not fetch blog categories:', error);
    }
    
    // Add blog posts
    try {
      const result = await getPublishedBlogPosts({ limit: 1000, offset: 0 });
      for (const post of result.posts) {
        const lastmod = post.updatedAt 
          ? formatSitemapDate(new Date(post.updatedAt))
          : post.publishedAt 
            ? formatSitemapDate(new Date(post.publishedAt))
            : formatSitemapDate(new Date(post.createdAt));
        
        urls.push({
          loc: `${baseUrl}/blog/${post.slug}`,
          lastmod,
          changefreq: 'monthly',
          priority: post.featured ? 0.8 : 0.6,
        });
      }
    } catch (error) {
      console.warn('[Sitemap] Could not fetch blog posts:', error);
    }
    
    // Generate the sitemap XML
    const urlEntries = urls.map(generateUrlEntry).join('\n');
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    // Set appropriate headers
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemap);
    
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Generates robots.txt with sitemap reference
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
function generateRobotsTxt(req: Request, res: Response): void {
  const protocol = req.protocol;
  const host = req.get('host') || 'accessai.app';
  const baseUrl = `${protocol}://${host}`;
  
  const robotsTxt = `# AccessAI Robots.txt
# https://www.robotstxt.org/

User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and API routes
Disallow: /api/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /admin/

# Allow blog and public pages
Allow: /blog/
Allow: /pricing
`;

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.send(robotsTxt);
}

// Register the sitemap routes
sitemapRouter.get('/sitemap.xml', generateSitemap);
sitemapRouter.get('/robots.txt', generateRobotsTxt);

export default sitemapRouter;
