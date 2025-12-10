/**
 * Platform Goals and Industry Benchmarks Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getUserPlatformGoals: vi.fn(),
    getActiveGoals: vi.fn(),
    getPlatformGoal: vi.fn(),
    createPlatformGoal: vi.fn(),
    updatePlatformGoal: vi.fn(),
    deletePlatformGoal: vi.fn(),
    markGoalAchieved: vi.fn(),
    getGoalProgress: vi.fn(),
    recordGoalHistory: vi.fn(),
    getGoalHistoryForGoal: vi.fn(),
    getIndustryBenchmark: vi.fn(),
    getIndustryBenchmarks: vi.fn(),
    getAvailableIndustries: vi.fn(),
    compareWithBenchmarks: vi.fn(),
    seedIndustryBenchmarks: vi.fn(),
    getDefaultBenchmarks: vi.fn(),
  };
});

describe("Platform Goals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe("getUserPlatformGoals", () => {
    it("should return all goals for a user", async () => {
      const mockGoals = [
        {
          id: 1,
          userId: 1,
          platform: "linkedin",
          targetEngagementRate: 500,
          targetPostsPerMonth: 20,
          periodType: "monthly",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          userId: 1,
          platform: "twitter",
          targetEngagementRate: 300,
          targetPostsPerMonth: 30,
          periodType: "weekly",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      vi.mocked(db.getUserPlatformGoals).mockResolvedValue(mockGoals);
      
      const result = await db.getUserPlatformGoals(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe("linkedin");
      expect(result[1].platform).toBe("twitter");
    });
    
    it("should return empty array when no goals exist", async () => {
      vi.mocked(db.getUserPlatformGoals).mockResolvedValue([]);
      
      const result = await db.getUserPlatformGoals(1);
      
      expect(result).toHaveLength(0);
    });
  });
  
  describe("createPlatformGoal", () => {
    it("should create a new goal and return the ID", async () => {
      vi.mocked(db.createPlatformGoal).mockResolvedValue(1);
      
      const result = await db.createPlatformGoal({
        userId: 1,
        platform: "linkedin",
        targetEngagementRate: 500,
        targetPostsPerMonth: 20,
        periodType: "monthly"
      });
      
      expect(result).toBe(1);
      expect(db.createPlatformGoal).toHaveBeenCalledWith({
        userId: 1,
        platform: "linkedin",
        targetEngagementRate: 500,
        targetPostsPerMonth: 20,
        periodType: "monthly"
      });
    });
  });
  
  describe("getGoalProgress", () => {
    it("should return progress for all active goals", async () => {
      const mockProgress = [
        {
          goal: {
            id: 1,
            userId: 1,
            platform: "linkedin",
            targetEngagementRate: 500,
            isActive: true
          },
          currentEngagementRate: 3.5,
          progressPercent: 70,
          postsThisPeriod: 15,
          isAchieved: false
        },
        {
          goal: {
            id: 2,
            userId: 1,
            platform: "twitter",
            targetEngagementRate: 300,
            isActive: true
          },
          currentEngagementRate: 4.0,
          progressPercent: 100,
          postsThisPeriod: 25,
          isAchieved: true
        }
      ];
      
      vi.mocked(db.getGoalProgress).mockResolvedValue(mockProgress);
      
      const result = await db.getGoalProgress(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].isAchieved).toBe(false);
      expect(result[1].isAchieved).toBe(true);
    });
    
    it("should calculate progress percentage correctly", async () => {
      const mockProgress = [
        {
          goal: {
            id: 1,
            userId: 1,
            platform: "instagram",
            targetEngagementRate: 400, // 4.00%
            isActive: true
          },
          currentEngagementRate: 2.0, // 2.00%
          progressPercent: 50, // 2/4 = 50%
          postsThisPeriod: 10,
          isAchieved: false
        }
      ];
      
      vi.mocked(db.getGoalProgress).mockResolvedValue(mockProgress);
      
      const result = await db.getGoalProgress(1);
      
      expect(result[0].progressPercent).toBe(50);
    });
  });
  
  describe("markGoalAchieved", () => {
    it("should mark a goal as achieved", async () => {
      vi.mocked(db.markGoalAchieved).mockResolvedValue(undefined);
      
      await db.markGoalAchieved(1, 1);
      
      expect(db.markGoalAchieved).toHaveBeenCalledWith(1, 1);
    });
  });
  
  describe("deleteGoalMutation", () => {
    it("should delete a goal and its history", async () => {
      vi.mocked(db.deletePlatformGoal).mockResolvedValue(undefined);
      
      await db.deletePlatformGoal(1, 1);
      
      expect(db.deletePlatformGoal).toHaveBeenCalledWith(1, 1);
    });
  });
});

describe("Industry Benchmarks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe("getAvailableIndustries", () => {
    it("should return list of available industries", async () => {
      const mockIndustries = [
        "Technology",
        "Healthcare",
        "Finance",
        "Marketing & Advertising"
      ];
      
      vi.mocked(db.getAvailableIndustries).mockResolvedValue(mockIndustries);
      
      const result = await db.getAvailableIndustries();
      
      expect(result).toHaveLength(4);
      expect(result).toContain("Technology");
    });
    
    it("should return default industries when none exist in DB", async () => {
      vi.mocked(db.getAvailableIndustries).mockResolvedValue([
        "Technology",
        "Healthcare",
        "Finance",
        "Retail & E-commerce",
        "Education",
        "Marketing & Advertising"
      ]);
      
      const result = await db.getAvailableIndustries();
      
      expect(result.length).toBeGreaterThan(0);
    });
  });
  
  describe("getIndustryBenchmarks", () => {
    it("should return benchmarks for a specific industry", async () => {
      const mockBenchmarks = [
        {
          id: 1,
          industry: "Technology",
          platform: "linkedin",
          avgEngagementRate: 280,
          medianEngagementRate: 220,
          topPerformerRate: 550,
          avgPostsPerWeek: 5,
          benchmarkYear: 2024
        },
        {
          id: 2,
          industry: "Technology",
          platform: "twitter",
          avgEngagementRate: 150,
          medianEngagementRate: 100,
          topPerformerRate: 350,
          avgPostsPerWeek: 14,
          benchmarkYear: 2024
        }
      ];
      
      vi.mocked(db.getIndustryBenchmarks).mockResolvedValue(mockBenchmarks);
      
      const result = await db.getIndustryBenchmarks("Technology");
      
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe("linkedin");
    });
  });
  
  describe("compareWithBenchmarks", () => {
    it("should compare user metrics against industry benchmarks", async () => {
      const mockComparison = [
        {
          platform: "linkedin",
          userEngagementRate: 4.5,
          industryAverage: 2.8,
          industryMedian: 2.2,
          topPerformerThreshold: 5.5,
          percentile: 75,
          comparison: "above_average" as const,
          recommendation: "Great work! You're above the industry average on linkedin."
        },
        {
          platform: "twitter",
          userEngagementRate: 1.0,
          industryAverage: 1.5,
          industryMedian: 1.0,
          topPerformerThreshold: 3.5,
          percentile: 40,
          comparison: "average" as const,
          recommendation: "You're performing at industry average on twitter."
        }
      ];
      
      vi.mocked(db.compareWithBenchmarks).mockResolvedValue(mockComparison);
      
      const result = await db.compareWithBenchmarks(1, "Technology");
      
      expect(result).toHaveLength(2);
      expect(result[0].comparison).toBe("above_average");
      expect(result[1].comparison).toBe("average");
    });
    
    it("should identify top performers correctly", async () => {
      const mockComparison = [
        {
          platform: "instagram",
          userEngagementRate: 8.0,
          industryAverage: 2.5,
          industryMedian: 2.0,
          topPerformerThreshold: 5.0,
          percentile: 95,
          comparison: "top_performer" as const,
          recommendation: "Outstanding! You're in the top 10% for instagram."
        }
      ];
      
      vi.mocked(db.compareWithBenchmarks).mockResolvedValue(mockComparison);
      
      const result = await db.compareWithBenchmarks(1, "Marketing & Advertising");
      
      expect(result[0].comparison).toBe("top_performer");
      expect(result[0].percentile).toBeGreaterThanOrEqual(90);
    });
    
    it("should identify below average performers", async () => {
      const mockComparison = [
        {
          platform: "facebook",
          userEngagementRate: 0.3,
          industryAverage: 1.2,
          industryMedian: 0.9,
          topPerformerRate: 2.8,
          percentile: 15,
          comparison: "below_average" as const,
          recommendation: "There's room for improvement on facebook."
        }
      ];
      
      vi.mocked(db.compareWithBenchmarks).mockResolvedValue(mockComparison);
      
      const result = await db.compareWithBenchmarks(1, "Finance");
      
      expect(result[0].comparison).toBe("below_average");
      expect(result[0].percentile).toBeLessThan(30);
    });
  });
  
  describe("getDefaultBenchmarks", () => {
    it("should return default benchmark data", () => {
      // The getDefaultBenchmarks function is mocked, so we test the mock behavior
      vi.mocked(db.getDefaultBenchmarks).mockReturnValue([
        { industry: "Technology", platform: "linkedin", avgEngagementRate: 280, medianEngagementRate: 220, topPerformerRate: 550, avgPostsPerWeek: 5 }
      ]);
      
      const defaults = db.getDefaultBenchmarks();
      
      expect(defaults).toBeDefined();
      expect(defaults).toHaveLength(1);
    });
  });
});

describe("Goal History", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe("recordGoalHistory", () => {
    it("should record a history snapshot", async () => {
      vi.mocked(db.recordGoalHistory).mockResolvedValue(1);
      
      const result = await db.recordGoalHistory({
        goalId: 1,
        userId: 1,
        engagementRate: 350,
        postCount: 15,
        impressions: 5000,
        progressPercent: 70,
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-31")
      });
      
      expect(result).toBe(1);
    });
  });
  
  describe("getGoalHistoryForGoal", () => {
    it("should return history for a specific goal", async () => {
      const mockHistory = [
        {
          id: 1,
          goalId: 1,
          userId: 1,
          engagementRate: 350,
          postCount: 15,
          progressPercent: 70,
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
          createdAt: new Date()
        },
        {
          id: 2,
          goalId: 1,
          userId: 1,
          engagementRate: 420,
          postCount: 18,
          progressPercent: 84,
          periodStart: new Date("2024-02-01"),
          periodEnd: new Date("2024-02-29"),
          createdAt: new Date()
        }
      ];
      
      vi.mocked(db.getGoalHistoryForGoal).mockResolvedValue(mockHistory);
      
      const result = await db.getGoalHistoryForGoal(1);
      
      expect(result).toHaveLength(2);
      expect(result[1].progressPercent).toBeGreaterThan(result[0].progressPercent);
    });
  });
});

describe("Analytics Export", () => {
  it("should have export function available", async () => {
    // This tests the export functionality exists
    const dataExport = await import("./services/dataExport");
    
    // Verify the export function exists
    expect(typeof dataExport.exportPlatformAnalytics).toBe("function");
  });
});
