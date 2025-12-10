/**
 * Data Export Service
 * 
 * Handles exporting user data in various formats (CSV, JSON).
 * Supports exporting posts, analytics, knowledge base items, and team data.
 * 
 * @module services/dataExport
 */

import * as db from "../db";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// ============================================
// TYPES
// ============================================

export type ExportFormat = "csv" | "json";

export type ExportType = 
  | "posts" 
  | "analytics" 
  | "knowledge_base" 
  | "teams" 
  | "images" 
  | "all";

export interface ExportOptions {
  userId: number;
  format: ExportFormat;
  type: ExportType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
  recordCount?: number;
  error?: string;
}

// ============================================
// CSV UTILITIES
// ============================================

/**
 * Escapes a value for CSV format
 * Handles quotes, commas, and newlines
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  const stringValue = typeof value === "object" 
    ? JSON.stringify(value) 
    : String(value);
  
  // If the value contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts an array of objects to CSV format
 */
function arrayToCsv<T extends Record<string, unknown>>(data: T[], headers?: string[]): string {
  if (data.length === 0) {
    return headers ? headers.join(",") + "\n" : "";
  }
  
  const keys = headers || Object.keys(data[0]);
  const headerRow = keys.join(",");
  
  const rows = data.map(item => 
    keys.map(key => escapeCsvValue(item[key])).join(",")
  );
  
  return [headerRow, ...rows].join("\n");
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Exports user posts in the specified format
 */
async function exportPosts(
  userId: number, 
  format: ExportFormat,
  dateRange?: { start: Date; end: Date }
): Promise<{ data: string; count: number }> {
  // Get all posts and filter by date range in memory
  const allPosts = await db.getUserPosts(userId, {});
  const posts = dateRange 
    ? allPosts.filter(post => {
        const createdAt = new Date(post.createdAt);
        return createdAt >= dateRange.start && createdAt <= dateRange.end;
      })
    : allPosts;
  
  const exportData = posts.map(post => ({
    id: post.id,
    title: post.title || "",
    content: post.content,
    platform: post.platform,
    status: post.status,
    accessibilityScore: post.accessibilityScore || 0,
    scheduledAt: post.scheduledAt?.toISOString() || "",
    publishedAt: post.publishedAt?.toISOString() || "",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    hashtags: post.hashtags?.join(", ") || "",
    likes: post.analytics?.likes || 0,
    comments: post.analytics?.comments || 0,
    shares: post.analytics?.shares || 0,
    impressions: post.analytics?.impressions || 0
  }));
  
  if (format === "csv") {
    return {
      data: arrayToCsv(exportData, [
        "id", "title", "content", "platform", "status", 
        "accessibilityScore", "scheduledAt", "publishedAt",
        "createdAt", "updatedAt", "hashtags",
        "likes", "comments", "shares", "impressions"
      ]),
      count: exportData.length
    };
  }
  
  return {
    data: JSON.stringify(exportData, null, 2),
    count: exportData.length
  };
}

/**
 * Exports analytics data for the user
 */
async function exportAnalytics(
  userId: number,
  format: ExportFormat,
  dateRange?: { start: Date; end: Date }
): Promise<{ data: string; count: number }> {
  // Get posts with engagement metrics and filter by date range in memory
  const allPosts = await db.getUserPosts(userId, {});
  const posts = dateRange 
    ? allPosts.filter(post => {
        const createdAt = new Date(post.createdAt);
        return createdAt >= dateRange.start && createdAt <= dateRange.end;
      })
    : allPosts;
  
  // Calculate aggregate analytics
  const platformStats: Record<string, {
    postCount: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalImpressions: number;
    avgAccessibilityScore: number;
  }> = {};
  
  posts.forEach(post => {
    if (!platformStats[post.platform]) {
      platformStats[post.platform] = {
        postCount: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalImpressions: 0,
        avgAccessibilityScore: 0
      };
    }
    
    const stats = platformStats[post.platform];
    stats.postCount++;
    stats.totalLikes += post.analytics?.likes || 0;
    stats.totalComments += post.analytics?.comments || 0;
    stats.totalShares += post.analytics?.shares || 0;
    stats.totalImpressions += post.analytics?.impressions || 0;
    stats.avgAccessibilityScore += post.accessibilityScore || 0;
  });
  
  // Calculate averages
  Object.values(platformStats).forEach(stats => {
    if (stats.postCount > 0) {
      stats.avgAccessibilityScore = Math.round(stats.avgAccessibilityScore / stats.postCount);
    }
  });
  
  const analyticsData = Object.entries(platformStats).map(([platform, stats]) => ({
    platform,
    ...stats,
    engagementRate: stats.totalImpressions > 0 
      ? ((stats.totalLikes + stats.totalComments + stats.totalShares) / stats.totalImpressions * 100).toFixed(2) + "%"
      : "0%"
  }));
  
  if (format === "csv") {
    return {
      data: arrayToCsv(analyticsData, [
        "platform", "postCount", "totalLikes", "totalComments", 
        "totalShares", "totalImpressions", "avgAccessibilityScore", "engagementRate"
      ]),
      count: analyticsData.length
    };
  }
  
  return {
    data: JSON.stringify({
      summary: {
        totalPosts: posts.length,
        dateRange: dateRange ? {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        } : "all time"
      },
      platformBreakdown: analyticsData,
      exportedAt: new Date().toISOString()
    }, null, 2),
    count: analyticsData.length
  };
}

/**
 * Exports knowledge base items
 */
async function exportKnowledgeBase(
  userId: number,
  format: ExportFormat
): Promise<{ data: string; count: number }> {
  const items = await db.getUserKnowledgeBase(userId);
  
  const exportData = items.map(item => ({
    id: item.id,
    title: item.title,
    content: item.content,
    type: item.type,
    tags: item.tags?.join(", ") || "",
    priority: item.priority || 0,
    includeInAiContext: item.includeInAiContext ?? true,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }));
  
  if (format === "csv") {
    return {
      data: arrayToCsv(exportData, [
        "id", "title", "content", "type", "tags", 
        "priority", "includeInAiContext", "createdAt", "updatedAt"
      ]),
      count: exportData.length
    };
  }
  
  return {
    data: JSON.stringify(exportData, null, 2),
    count: exportData.length
  };
}

/**
 * Exports team data
 */
async function exportTeams(
  userId: number,
  format: ExportFormat
): Promise<{ data: string; count: number }> {
  const teams = await db.getUserTeams(userId);
  
  const exportData = await Promise.all(teams.map(async team => {
    const members = await db.getTeamMembers(team.id);
    return {
      id: team.id,
      name: team.name,
      description: team.description || "",
      memberCount: members.length,
      members: members.map(m => ({
        id: m.userId,
        role: m.role,
        invitedAt: m.invitedAt?.toISOString() || "",
        acceptedAt: m.acceptedAt?.toISOString() || ""
      })),
      createdAt: team.createdAt.toISOString()
    };
  }));
  
  if (format === "csv") {
    // Flatten for CSV
    const flatData = exportData.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team.memberCount,
      memberIds: team.members.map(m => m.id).join("; "),
      createdAt: team.createdAt
    }));
    
    return {
      data: arrayToCsv(flatData, [
        "id", "name", "description", "memberCount", "memberIds", "createdAt"
      ]),
      count: flatData.length
    };
  }
  
  return {
    data: JSON.stringify(exportData, null, 2),
    count: exportData.length
  };
}

/**
 * Exports generated images metadata
 */
async function exportImages(
  userId: number,
  format: ExportFormat
): Promise<{ data: string; count: number }> {
  const images = await db.getUserGeneratedImages(userId);
  
  const exportData = images.map(img => ({
    id: img.id,
    prompt: img.prompt,
    imageUrl: img.imageUrl,
    altText: img.altText || "",
    createdAt: img.createdAt.toISOString()
  }));
  
  if (format === "csv") {
    return {
      data: arrayToCsv(exportData, [
        "id", "prompt", "imageUrl", "platform", "createdAt"
      ]),
      count: exportData.length
    };
  }
  
  return {
    data: JSON.stringify(exportData, null, 2),
    count: exportData.length
  };
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

/**
 * Main export function that handles all export types
 * 
 * @param options - Export configuration options
 * @returns Export result with file URL and metadata
 */
export async function exportUserData(options: ExportOptions): Promise<ExportResult> {
  const { userId, format, type, dateRange, includeMetadata = true } = options;
  
  try {
    let exportData: { data: string; count: number };
    let fileName: string;
    
    switch (type) {
      case "posts":
        exportData = await exportPosts(userId, format, dateRange);
        fileName = `accessai-posts-${Date.now()}`;
        break;
        
      case "analytics":
        exportData = await exportAnalytics(userId, format, dateRange);
        fileName = `accessai-analytics-${Date.now()}`;
        break;
        
      case "knowledge_base":
        exportData = await exportKnowledgeBase(userId, format);
        fileName = `accessai-knowledge-base-${Date.now()}`;
        break;
        
      case "teams":
        exportData = await exportTeams(userId, format);
        fileName = `accessai-teams-${Date.now()}`;
        break;
        
      case "images":
        exportData = await exportImages(userId, format);
        fileName = `accessai-images-${Date.now()}`;
        break;
        
      case "all": {
        // Export all data types
        const [postsData, analyticsData, kbData, teamsData, imagesData] = await Promise.all([
          exportPosts(userId, "json", dateRange),
          exportAnalytics(userId, "json", dateRange),
          exportKnowledgeBase(userId, "json"),
          exportTeams(userId, "json"),
          exportImages(userId, "json")
        ]);
        
        const allData = {
          exportedAt: new Date().toISOString(),
          userId,
          posts: JSON.parse(postsData.data),
          analytics: JSON.parse(analyticsData.data),
          knowledgeBase: JSON.parse(kbData.data),
          teams: JSON.parse(teamsData.data),
          images: JSON.parse(imagesData.data)
        };
        
        exportData = {
          data: JSON.stringify(allData, null, 2),
          count: postsData.count + kbData.count + teamsData.count + imagesData.count
        };
        fileName = `accessai-full-export-${Date.now()}`;
        break;
      }
        
      default:
        return { success: false, error: `Unknown export type: ${type}` };
    }
    
    // Add metadata wrapper for JSON exports
    if (format === "json" && includeMetadata && type !== "all") {
      const wrappedData = {
        exportedAt: new Date().toISOString(),
        exportType: type,
        recordCount: exportData.count,
        data: JSON.parse(exportData.data)
      };
      exportData.data = JSON.stringify(wrappedData, null, 2);
    }
    
    // Upload to S3
    const fileExtension = format === "csv" ? "csv" : "json";
    const contentType = format === "csv" ? "text/csv" : "application/json";
    const fileKey = `exports/${userId}/${fileName}-${nanoid(8)}.${fileExtension}`;
    
    const { url } = await storagePut(
      fileKey,
      Buffer.from(exportData.data, "utf-8"),
      contentType
    );
    
    return {
      success: true,
      fileUrl: url,
      fileKey,
      fileName: `${fileName}.${fileExtension}`,
      recordCount: exportData.count
    };
    
  } catch (error) {
    console.error("[DataExport] Export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed"
    };
  }
}

/**
 * Gets a list of available export types with descriptions
 */
export function getExportTypes(): Array<{ type: ExportType; name: string; description: string }> {
  return [
    {
      type: "posts",
      name: "Posts",
      description: "All your social media posts with content, status, and engagement metrics"
    },
    {
      type: "analytics",
      name: "Analytics",
      description: "Aggregated performance metrics and engagement statistics by platform"
    },
    {
      type: "knowledge_base",
      name: "Knowledge Base",
      description: "Brand guidelines, swipe files, and AI instructions"
    },
    {
      type: "teams",
      name: "Teams",
      description: "Team information and member details"
    },
    {
      type: "images",
      name: "Generated Images",
      description: "AI-generated images with prompts and URLs"
    },
    {
      type: "all",
      name: "Full Export",
      description: "Complete data export including all of the above (JSON only)"
    }
  ];
}


// ============================================
// PLATFORM ANALYTICS EXPORT
// ============================================

/**
 * Exports platform analytics comparison data
 */
export async function exportPlatformAnalytics(
  userId: number,
  format: ExportFormat,
  dateRange?: { start: Date; end: Date }
): Promise<ExportResult> {
  try {
    const platformMetrics = await db.getPlatformAnalyticsComparison(userId, dateRange);
    const bestPlatform = await db.getBestPerformingPlatform(userId);
    
    if (format === "csv") {
      // Create CSV with platform metrics
      const csvData = platformMetrics.map(p => ({
        platform: p.platform,
        postCount: p.postCount,
        publishedCount: p.publishedCount,
        totalImpressions: p.totalImpressions,
        totalEngagements: p.totalEngagements,
        totalClicks: p.totalClicks,
        totalLikes: p.totalLikes,
        totalComments: p.totalComments,
        totalShares: p.totalShares,
        avgAccessibilityScore: p.avgAccessibilityScore,
        engagementRate: p.engagementRate.toFixed(2) + "%",
        bestPostId: p.bestPerformingPost?.id || "",
        bestPostTitle: p.bestPerformingPost?.title || "",
        bestPostEngagements: p.bestPerformingPost?.engagements || ""
      }));
      
      const csvContent = arrayToCsv(csvData, [
        "platform", "postCount", "publishedCount", "totalImpressions",
        "totalEngagements", "totalClicks", "totalLikes", "totalComments",
        "totalShares", "avgAccessibilityScore", "engagementRate",
        "bestPostId", "bestPostTitle", "bestPostEngagements"
      ]);
      
      const dateStr = dateRange 
        ? `${dateRange.start.toISOString().split("T")[0]}_to_${dateRange.end.toISOString().split("T")[0]}`
        : "all-time";
      const fileName = `platform-analytics-${dateStr}-${Date.now()}`;
      const fileKey = `exports/${userId}/${fileName}-${nanoid(8)}.csv`;
      
      const { url } = await storagePut(
        fileKey,
        Buffer.from(csvContent, "utf-8"),
        "text/csv"
      );
      
      return {
        success: true,
        fileUrl: url,
        fileKey,
        fileName: `${fileName}.csv`,
        recordCount: platformMetrics.length
      };
    }
    
    // JSON format with full data
    const jsonData = {
      exportedAt: new Date().toISOString(),
      exportType: "platform_analytics",
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      } : "all-time",
      summary: {
        totalPlatforms: platformMetrics.length,
        bestPerformingPlatform: bestPlatform
      },
      platforms: platformMetrics
    };
    
    const dateStr = dateRange 
      ? `${dateRange.start.toISOString().split("T")[0]}_to_${dateRange.end.toISOString().split("T")[0]}`
      : "all-time";
    const fileName = `platform-analytics-${dateStr}-${Date.now()}`;
    const fileKey = `exports/${userId}/${fileName}-${nanoid(8)}.json`;
    
    const { url } = await storagePut(
      fileKey,
      Buffer.from(JSON.stringify(jsonData, null, 2), "utf-8"),
      "application/json"
    );
    
    return {
      success: true,
      fileUrl: url,
      fileKey,
      fileName: `${fileName}.json`,
      recordCount: platformMetrics.length
    };
    
  } catch (error) {
    console.error("[DataExport] Platform analytics export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed"
    };
  }
}

// Re-export arrayToCsv for use in the export function
function arrayToCsvExport<T extends Record<string, unknown>>(data: T[], headers?: string[]): string {
  if (data.length === 0) {
    return headers ? headers.join(",") + "\n" : "";
  }
  
  const keys = headers || Object.keys(data[0]);
  const headerRow = keys.join(",");
  
  const rows = data.map(item => 
    keys.map(key => escapeCsvValue(item[key])).join(",")
  );
  
  return [headerRow, ...rows].join("\n");
}
