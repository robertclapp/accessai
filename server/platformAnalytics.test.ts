/**
 * Platform Analytics Comparison Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getPlatformAnalyticsComparison: vi.fn(),
    getPlatformTrends: vi.fn(),
    getBestPerformingPlatform: vi.fn(),
  };
});

describe("Platform Analytics Comparison", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe("getPlatformAnalyticsComparison", () => {
    it("should return metrics for all platforms", async () => {
      const mockMetrics = [
        {
          platform: "linkedin",
          postCount: 10,
          publishedCount: 8,
          totalImpressions: 5000,
          totalEngagements: 250,
          totalClicks: 100,
          totalLikes: 150,
          totalComments: 50,
          totalShares: 50,
          avgAccessibilityScore: 85,
          engagementRate: 5.0,
          bestPerformingPost: {
            id: 1,
            title: "Best LinkedIn Post",
            engagements: 100,
            impressions: 1000
          }
        },
        {
          platform: "twitter",
          postCount: 15,
          publishedCount: 12,
          totalImpressions: 8000,
          totalEngagements: 400,
          totalClicks: 150,
          totalLikes: 250,
          totalComments: 80,
          totalShares: 70,
          avgAccessibilityScore: 78,
          engagementRate: 5.0,
          bestPerformingPost: {
            id: 5,
            title: "Best Twitter Post",
            engagements: 150,
            impressions: 2000
          }
        }
      ];
      
      vi.mocked(db.getPlatformAnalyticsComparison).mockResolvedValue(mockMetrics);
      
      const result = await db.getPlatformAnalyticsComparison(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe("linkedin");
      expect(result[1].platform).toBe("twitter");
    });
    
    it("should return empty array when no posts exist", async () => {
      vi.mocked(db.getPlatformAnalyticsComparison).mockResolvedValue([]);
      
      const result = await db.getPlatformAnalyticsComparison(1);
      
      expect(result).toHaveLength(0);
    });
    
    it("should filter by date range when provided", async () => {
      const mockMetrics = [
        {
          platform: "linkedin",
          postCount: 5,
          publishedCount: 4,
          totalImpressions: 2500,
          totalEngagements: 125,
          totalClicks: 50,
          totalLikes: 75,
          totalComments: 25,
          totalShares: 25,
          avgAccessibilityScore: 85,
          engagementRate: 5.0
        }
      ];
      
      vi.mocked(db.getPlatformAnalyticsComparison).mockResolvedValue(mockMetrics);
      
      const dateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31")
      };
      
      const result = await db.getPlatformAnalyticsComparison(1, dateRange);
      
      expect(db.getPlatformAnalyticsComparison).toHaveBeenCalledWith(1, dateRange);
      expect(result).toHaveLength(1);
    });
    
    it("should calculate engagement rate correctly", async () => {
      const mockMetrics = [
        {
          platform: "instagram",
          postCount: 20,
          publishedCount: 18,
          totalImpressions: 10000,
          totalEngagements: 750,
          totalClicks: 200,
          totalLikes: 400,
          totalComments: 150,
          totalShares: 200,
          avgAccessibilityScore: 90,
          engagementRate: 7.5 // (750/10000) * 100
        }
      ];
      
      vi.mocked(db.getPlatformAnalyticsComparison).mockResolvedValue(mockMetrics);
      
      const result = await db.getPlatformAnalyticsComparison(1);
      
      expect(result[0].engagementRate).toBe(7.5);
    });
    
    it("should sort platforms by engagement rate descending", async () => {
      const mockMetrics = [
        {
          platform: "threads",
          postCount: 5,
          publishedCount: 5,
          totalImpressions: 1000,
          totalEngagements: 100,
          totalClicks: 30,
          totalLikes: 50,
          totalComments: 10,
          totalShares: 10,
          avgAccessibilityScore: 88,
          engagementRate: 10.0
        },
        {
          platform: "linkedin",
          postCount: 10,
          publishedCount: 8,
          totalImpressions: 5000,
          totalEngagements: 250,
          totalClicks: 100,
          totalLikes: 150,
          totalComments: 50,
          totalShares: 50,
          avgAccessibilityScore: 85,
          engagementRate: 5.0
        }
      ];
      
      vi.mocked(db.getPlatformAnalyticsComparison).mockResolvedValue(mockMetrics);
      
      const result = await db.getPlatformAnalyticsComparison(1);
      
      // Should be sorted by engagement rate (highest first)
      expect(result[0].engagementRate).toBeGreaterThanOrEqual(result[1].engagementRate);
    });
  });
  
  describe("getPlatformTrends", () => {
    it("should return daily trends for a platform", async () => {
      const mockTrends = [
        { date: "2024-01-01", impressions: 500, engagements: 25, posts: 2, engagementRate: 5.0 },
        { date: "2024-01-02", impressions: 600, engagements: 36, posts: 1, engagementRate: 6.0 },
        { date: "2024-01-03", impressions: 450, engagements: 27, posts: 3, engagementRate: 6.0 }
      ];
      
      vi.mocked(db.getPlatformTrends).mockResolvedValue(mockTrends);
      
      const result = await db.getPlatformTrends(1, "linkedin", "week");
      
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe("2024-01-01");
    });
    
    it("should return empty array when no data exists", async () => {
      vi.mocked(db.getPlatformTrends).mockResolvedValue([]);
      
      const result = await db.getPlatformTrends(1, "twitter", "month");
      
      expect(result).toHaveLength(0);
    });
    
    it("should handle different time periods", async () => {
      const mockTrends = [
        { date: "2024-01-15", impressions: 1000, engagements: 50, posts: 5, engagementRate: 5.0 }
      ];
      
      vi.mocked(db.getPlatformTrends).mockResolvedValue(mockTrends);
      
      // Test week period
      await db.getPlatformTrends(1, "facebook", "week");
      expect(db.getPlatformTrends).toHaveBeenCalledWith(1, "facebook", "week");
      
      // Test month period
      await db.getPlatformTrends(1, "facebook", "month");
      expect(db.getPlatformTrends).toHaveBeenCalledWith(1, "facebook", "month");
      
      // Test quarter period
      await db.getPlatformTrends(1, "facebook", "quarter");
      expect(db.getPlatformTrends).toHaveBeenCalledWith(1, "facebook", "quarter");
      
      // Test year period
      await db.getPlatformTrends(1, "facebook", "year");
      expect(db.getPlatformTrends).toHaveBeenCalledWith(1, "facebook", "year");
    });
    
    it("should sort trends by date ascending", async () => {
      const mockTrends = [
        { date: "2024-01-01", impressions: 500, engagements: 25, posts: 2, engagementRate: 5.0 },
        { date: "2024-01-02", impressions: 600, engagements: 36, posts: 1, engagementRate: 6.0 },
        { date: "2024-01-03", impressions: 450, engagements: 27, posts: 3, engagementRate: 6.0 }
      ];
      
      vi.mocked(db.getPlatformTrends).mockResolvedValue(mockTrends);
      
      const result = await db.getPlatformTrends(1, "instagram", "week");
      
      // Should be sorted by date
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });
  });
  
  describe("getBestPerformingPlatform", () => {
    it("should return the best performing platform", async () => {
      const mockBest = {
        platform: "linkedin",
        engagementRate: 8.5,
        totalEngagements: 500,
        recommendation: "Your LinkedIn content resonates well. Consider posting more thought leadership and industry insights."
      };
      
      vi.mocked(db.getBestPerformingPlatform).mockResolvedValue(mockBest);
      
      const result = await db.getBestPerformingPlatform(1);
      
      expect(result).not.toBeNull();
      expect(result?.platform).toBe("linkedin");
      expect(result?.engagementRate).toBe(8.5);
      expect(result?.recommendation).toContain("LinkedIn");
    });
    
    it("should return null when no platforms have data", async () => {
      vi.mocked(db.getBestPerformingPlatform).mockResolvedValue(null);
      
      const result = await db.getBestPerformingPlatform(1);
      
      expect(result).toBeNull();
    });
    
    it("should include a recommendation for each platform", async () => {
      const platforms = ["linkedin", "twitter", "facebook", "instagram", "threads"];
      
      for (const platform of platforms) {
        const mockBest = {
          platform,
          engagementRate: 5.0,
          totalEngagements: 100,
          recommendation: `Continue focusing on ${platform} for best results.`
        };
        
        vi.mocked(db.getBestPerformingPlatform).mockResolvedValue(mockBest);
        
        const result = await db.getBestPerformingPlatform(1);
        
        expect(result?.recommendation).toBeDefined();
        expect(result?.recommendation.length).toBeGreaterThan(0);
      }
    });
    
    it("should handle platforms with insufficient data", async () => {
      const mockBest = {
        platform: "twitter",
        engagementRate: 0,
        totalEngagements: 0,
        recommendation: "Post more content on twitter to gather meaningful analytics data."
      };
      
      vi.mocked(db.getBestPerformingPlatform).mockResolvedValue(mockBest);
      
      const result = await db.getBestPerformingPlatform(1);
      
      expect(result?.recommendation).toContain("Post more content");
    });
  });
});

describe("Platform Metrics Structure", () => {
  it("should have all required fields in PlatformMetrics", () => {
    const metrics: db.PlatformMetrics = {
      platform: "linkedin",
      postCount: 10,
      publishedCount: 8,
      totalImpressions: 5000,
      totalEngagements: 250,
      totalClicks: 100,
      totalLikes: 150,
      totalComments: 50,
      totalShares: 50,
      avgAccessibilityScore: 85,
      engagementRate: 5.0
    };
    
    expect(metrics.platform).toBeDefined();
    expect(metrics.postCount).toBeDefined();
    expect(metrics.publishedCount).toBeDefined();
    expect(metrics.totalImpressions).toBeDefined();
    expect(metrics.totalEngagements).toBeDefined();
    expect(metrics.totalClicks).toBeDefined();
    expect(metrics.totalLikes).toBeDefined();
    expect(metrics.totalComments).toBeDefined();
    expect(metrics.totalShares).toBeDefined();
    expect(metrics.avgAccessibilityScore).toBeDefined();
    expect(metrics.engagementRate).toBeDefined();
  });
  
  it("should allow optional bestPerformingPost field", () => {
    const metricsWithBest: db.PlatformMetrics = {
      platform: "twitter",
      postCount: 5,
      publishedCount: 4,
      totalImpressions: 2000,
      totalEngagements: 100,
      totalClicks: 40,
      totalLikes: 60,
      totalComments: 20,
      totalShares: 20,
      avgAccessibilityScore: 80,
      engagementRate: 5.0,
      bestPerformingPost: {
        id: 1,
        title: "Best Post",
        engagements: 50,
        impressions: 500
      }
    };
    
    expect(metricsWithBest.bestPerformingPost).toBeDefined();
    expect(metricsWithBest.bestPerformingPost?.id).toBe(1);
  });
});
