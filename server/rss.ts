/**
 * RSS Feed Generator for AccessAI Blog
 * 
 * Generates an RSS 2.0 feed for blog posts, enabling users to subscribe
 * to accessibility tips and updates via their preferred feed reader.
 * 
 * @module server/rss
 */

import { Router, Request, Response } from 'express';
import { getPublishedBlogPosts } from './db';

/**
 * Express router for RSS feed endpoints
 */
export const rssRouter = Router();

/**
 * Escapes special XML characters to prevent XSS and parsing errors
 * 
 * @param text - The text to escape
 * @returns XML-safe escaped string
 */
function escapeXml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats a Date object to RFC 822 format required by RSS 2.0
 * 
 * @param date - The date to format
 * @returns RFC 822 formatted date string
 */
function formatRfc822Date(date: Date): string {
  return date.toUTCString();
}

/**
 * Strips HTML/Markdown tags for plain text description
 * 
 * @param content - The content to strip
 * @returns Plain text content
 */
function stripMarkdown(content: string): string {
  return content
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove tables
    .replace(/\|[^\n]+\|/g, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generates the RSS 2.0 XML feed for blog posts
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
async function generateRssFeed(req: Request, res: Response): Promise<void> {
  try {
    // Get the base URL from the request
    const protocol = req.protocol;
    const host = req.get('host') || 'accessai.app';
    const baseUrl = `${protocol}://${host}`;
    
    // Fetch published blog posts (limit to 50 most recent)
    const result = await getPublishedBlogPosts({ limit: 50, offset: 0 });
    const posts = result.posts;
    
    // Build the RSS XML
    const rssItems = posts.map((post: any) => {
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      const pubDate = post.publishedAt 
        ? formatRfc822Date(new Date(post.publishedAt))
        : formatRfc822Date(new Date(post.createdAt));
      
      // Use excerpt if available, otherwise strip and truncate content
      const description = post.excerpt 
        ? escapeXml(post.excerpt)
        : escapeXml(stripMarkdown(post.content).substring(0, 500) + '...');
      
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      ${post.categoryId ? `<category>${escapeXml(post.categoryName || '')}</category>` : ''}
    </item>`;
    }).join('');
    
    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AccessAI Blog - Accessibility Tips &amp; Insights</title>
    <link>${baseUrl}/blog</link>
    <description>Expert accessibility tips, WCAG guidelines, and inclusive design best practices for content creators and social media professionals.</description>
    <language>en-us</language>
    <lastBuildDate>${formatRfc822Date(new Date())}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>AccessAI Blog</title>
      <link>${baseUrl}/blog</link>
    </image>
    <copyright>Copyright ${new Date().getFullYear()} AccessAI. All rights reserved.</copyright>
    <managingEditor>hello@accessai.app (AccessAI Team)</managingEditor>
    <webMaster>hello@accessai.app (AccessAI Team)</webMaster>
    <ttl>60</ttl>${rssItems}
  </channel>
</rss>`;

    // Set appropriate headers for RSS
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(rssFeed);
    
  } catch (error) {
    console.error('[RSS] Error generating feed:', error);
    res.status(500).send('Error generating RSS feed');
  }
}

// Register the RSS feed route
rssRouter.get('/rss.xml', generateRssFeed);
rssRouter.get('/feed', generateRssFeed); // Alternative URL
rssRouter.get('/feed.xml', generateRssFeed); // Alternative URL

export default rssRouter;
