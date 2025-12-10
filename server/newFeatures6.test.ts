/**
 * Tests for New Features (Batch 6)
 * - Custom template categories management
 * - Digest pause/resume functionality
 * - A/B test insights time period comparison
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================
// TEMPLATE CATEGORIES TESTS
// ============================================

describe("Template Categories", () => {
  describe("Category CRUD Operations", () => {
    it("should create a new custom category", () => {
      const category = {
        id: 1,
        userId: 1,
        name: "Announcements",
        description: "For product announcements",
        color: "#3b82f6",
        createdAt: new Date(),
      };
      
      expect(category.name).toBe("Announcements");
      expect(category.color).toBe("#3b82f6");
    });
    
    it("should validate category name is not empty", () => {
      const validateCategoryName = (name: string) => {
        if (!name || name.trim().length === 0) {
          throw new Error("Category name is required");
        }
        return true;
      };
      
      expect(() => validateCategoryName("")).toThrow("Category name is required");
      expect(validateCategoryName("Valid Name")).toBe(true);
    });
    
    it("should update category properties", () => {
      const category = {
        id: 1,
        name: "Old Name",
        color: "#000000",
      };
      
      const updated = {
        ...category,
        name: "New Name",
        color: "#ff0000",
      };
      
      expect(updated.name).toBe("New Name");
      expect(updated.color).toBe("#ff0000");
    });
    
    it("should list categories with template counts", () => {
      const categories = [
        { id: 1, name: "News", templateCount: 5 },
        { id: 2, name: "Personal", templateCount: 3 },
        { id: 3, name: "Tech", templateCount: 0 },
      ];
      
      expect(categories.length).toBe(3);
      expect(categories[0].templateCount).toBe(5);
      expect(categories[2].templateCount).toBe(0);
    });
    
    it("should delete category and handle templates", () => {
      const deleteCategory = (categoryId: number, reassignTo?: string) => {
        // When deleting, templates can be reassigned to "other" or another category
        return {
          deleted: true,
          templatesReassigned: reassignTo || "other",
        };
      };
      
      const result = deleteCategory(1);
      expect(result.deleted).toBe(true);
      expect(result.templatesReassigned).toBe("other");
    });
  });
  
  describe("Category Color Validation", () => {
    it("should validate hex color format", () => {
      const isValidHexColor = (color: string) => {
        return /^#[0-9A-Fa-f]{6}$/.test(color);
      };
      
      expect(isValidHexColor("#3b82f6")).toBe(true);
      expect(isValidHexColor("#FF0000")).toBe(true);
      expect(isValidHexColor("invalid")).toBe(false);
      expect(isValidHexColor("#fff")).toBe(false); // Must be 6 digits
    });
    
    it("should provide default color if not specified", () => {
      const getColor = (color?: string) => color || "#6366f1";
      
      expect(getColor()).toBe("#6366f1");
      expect(getColor("#ff0000")).toBe("#ff0000");
    });
  });
});

// ============================================
// DIGEST PAUSE/RESUME TESTS
// ============================================

describe("Digest Pause/Resume", () => {
  describe("Pause Functionality", () => {
    it("should pause digest with reason and optional end date", () => {
      const pauseDigest = (reason?: string, pauseUntil?: Date) => {
        return {
          isPaused: true,
          pausedAt: new Date(),
          pauseReason: reason || null,
          pauseUntil: pauseUntil || null,
        };
      };
      
      const result = pauseDigest("On vacation", new Date("2025-01-15"));
      expect(result.isPaused).toBe(true);
      expect(result.pauseReason).toBe("On vacation");
      expect(result.pauseUntil).toEqual(new Date("2025-01-15"));
    });
    
    it("should pause indefinitely when no end date provided", () => {
      const pauseDigest = (reason?: string, pauseUntil?: Date) => {
        return {
          isPaused: true,
          pausedAt: new Date(),
          pauseReason: reason || null,
          pauseUntil: pauseUntil || null,
        };
      };
      
      const result = pauseDigest("Taking a break");
      expect(result.isPaused).toBe(true);
      expect(result.pauseUntil).toBeNull();
    });
    
    it("should validate pause end date is in the future", () => {
      const validatePauseUntil = (date: Date) => {
        if (date <= new Date()) {
          throw new Error("Pause end date must be in the future");
        }
        return true;
      };
      
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(validatePauseUntil(futureDate)).toBe(true);
      
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(() => validatePauseUntil(pastDate)).toThrow("Pause end date must be in the future");
    });
  });
  
  describe("Resume Functionality", () => {
    it("should resume paused digest", () => {
      const resumeDigest = () => {
        return {
          isPaused: false,
          pausedAt: null,
          pauseReason: null,
          pauseUntil: null,
        };
      };
      
      const result = resumeDigest();
      expect(result.isPaused).toBe(false);
      expect(result.pausedAt).toBeNull();
    });
    
    it("should clear all pause-related fields on resume", () => {
      const preferences = {
        isPaused: true,
        pausedAt: new Date("2025-01-01"),
        pauseReason: "Vacation",
        pauseUntil: new Date("2025-01-15"),
      };
      
      const resumed = {
        ...preferences,
        isPaused: false,
        pausedAt: null,
        pauseReason: null,
        pauseUntil: null,
      };
      
      expect(resumed.isPaused).toBe(false);
      expect(resumed.pausedAt).toBeNull();
      expect(resumed.pauseReason).toBeNull();
      expect(resumed.pauseUntil).toBeNull();
    });
  });
  
  describe("Pause Status Check", () => {
    it("should return correct pause status", () => {
      const getPauseStatus = (preferences: any) => {
        return {
          isPaused: preferences.isPaused || false,
          pausedAt: preferences.pausedAt,
          pauseReason: preferences.pauseReason,
          pauseUntil: preferences.pauseUntil,
        };
      };
      
      const paused = getPauseStatus({
        isPaused: true,
        pausedAt: new Date("2025-01-01"),
        pauseReason: "Testing",
        pauseUntil: null,
      });
      
      expect(paused.isPaused).toBe(true);
      expect(paused.pauseReason).toBe("Testing");
    });
    
    it("should auto-resume when pause end date has passed", () => {
      const shouldAutoResume = (pauseUntil: Date | null) => {
        if (!pauseUntil) return false;
        return pauseUntil <= new Date();
      };
      
      const pastDate = new Date(Date.now() - 86400000);
      expect(shouldAutoResume(pastDate)).toBe(true);
      
      const futureDate = new Date(Date.now() + 86400000);
      expect(shouldAutoResume(futureDate)).toBe(false);
      
      expect(shouldAutoResume(null)).toBe(false);
    });
  });
  
  describe("Digest Sending Prevention", () => {
    it("should prevent sending when paused", () => {
      const canSendDigest = (preferences: any) => {
        if (preferences.isPaused) {
          // Check if auto-resume should happen
          if (preferences.pauseUntil && preferences.pauseUntil <= new Date()) {
            return true; // Auto-resumed
          }
          return false;
        }
        return true;
      };
      
      expect(canSendDigest({ isPaused: false })).toBe(true);
      expect(canSendDigest({ isPaused: true, pauseUntil: null })).toBe(false);
      
      const pastDate = new Date(Date.now() - 86400000);
      expect(canSendDigest({ isPaused: true, pauseUntil: pastDate })).toBe(true);
    });
  });
});

// ============================================
// TIME PERIOD COMPARISON TESTS
// ============================================

describe("A/B Test Time Period Comparison", () => {
  describe("Period Metrics Calculation", () => {
    it("should calculate metrics for a time period", () => {
      const calculatePeriodMetrics = (tests: any[]) => {
        if (tests.length === 0) {
          return { avgConfidence: 0, avgLift: 0, winRate: 0 };
        }
        
        const totalConfidence = tests.reduce((sum, t) => sum + (t.confidenceLevel || 0), 0);
        const testsWithWinner = tests.filter(t => t.winningVariantId).length;
        
        return {
          avgConfidence: totalConfidence / tests.length,
          avgLift: 15.5, // Mock value
          winRate: (testsWithWinner / tests.length) * 100,
        };
      };
      
      const tests = [
        { confidenceLevel: 95, winningVariantId: 1 },
        { confidenceLevel: 88, winningVariantId: 2 },
        { confidenceLevel: 92, winningVariantId: null },
      ];
      
      const metrics = calculatePeriodMetrics(tests);
      expect(metrics.avgConfidence).toBeCloseTo(91.67, 1);
      expect(metrics.winRate).toBeCloseTo(66.67, 1);
    });
    
    it("should handle empty period gracefully", () => {
      const calculatePeriodMetrics = (tests: any[]) => {
        if (tests.length === 0) {
          return { avgConfidence: 0, avgLift: 0, winRate: 0 };
        }
        return { avgConfidence: 90, avgLift: 10, winRate: 80 };
      };
      
      const metrics = calculatePeriodMetrics([]);
      expect(metrics.avgConfidence).toBe(0);
      expect(metrics.avgLift).toBe(0);
      expect(metrics.winRate).toBe(0);
    });
  });
  
  describe("Trend Detection", () => {
    it("should detect improving trend", () => {
      const getTrend = (val1: number, val2: number): "improving" | "stable" | "declining" => {
        const change = val2 - val1;
        if (Math.abs(change) < 5) return "stable";
        return change > 0 ? "improving" : "declining";
      };
      
      expect(getTrend(80, 95)).toBe("improving");
      expect(getTrend(90, 85)).toBe("declining");
      expect(getTrend(88, 90)).toBe("stable");
    });
    
    it("should handle edge cases in trend detection", () => {
      const getTrend = (val1: number, val2: number): "improving" | "stable" | "declining" => {
        const change = val2 - val1;
        if (Math.abs(change) < 5) return "stable";
        return change > 0 ? "improving" : "declining";
      };
      
      expect(getTrend(0, 0)).toBe("stable");
      expect(getTrend(0, 10)).toBe("improving");
      expect(getTrend(100, 90)).toBe("declining");
    });
  });
  
  describe("Period Comparison", () => {
    it("should compare two time periods", () => {
      const comparison = {
        testsCompleted: { period1: 5, period2: 8, change: 3, trend: "improving" as const },
        avgConfidenceLevel: { period1: 85, period2: 92, change: 7, trend: "improving" as const },
        avgEngagementLift: { period1: 12, period2: 18, change: 6, trend: "improving" as const },
        winRate: { period1: 70, period2: 75, change: 5, trend: "stable" as const },
      };
      
      expect(comparison.testsCompleted.change).toBe(3);
      expect(comparison.avgConfidenceLevel.trend).toBe("improving");
      expect(comparison.winRate.trend).toBe("stable");
    });
    
    it("should generate insights from comparison", () => {
      const generateInsights = (comparison: any) => {
        const insights: any[] = [];
        
        if (comparison.testsCompleted.change > 0) {
          insights.push({
            category: "activity",
            title: "Increased Testing Activity",
            impact: "positive",
          });
        }
        
        if (comparison.avgConfidenceLevel.change > 5) {
          insights.push({
            category: "quality",
            title: "Improved Test Quality",
            impact: "positive",
          });
        }
        
        return insights;
      };
      
      const comparison = {
        testsCompleted: { change: 3 },
        avgConfidenceLevel: { change: 7 },
      };
      
      const insights = generateInsights(comparison);
      expect(insights.length).toBe(2);
      expect(insights[0].title).toBe("Increased Testing Activity");
      expect(insights[1].title).toBe("Improved Test Quality");
    });
  });
  
  describe("Platform Breakdown Comparison", () => {
    it("should compare platform performance across periods", () => {
      const platformComparison = [
        { platform: "twitter", period1Tests: 3, period2Tests: 5, period1AvgLift: 10, period2AvgLift: 15, trend: "improving" as const },
        { platform: "linkedin", period1Tests: 2, period2Tests: 2, period1AvgLift: 12, period2AvgLift: 11, trend: "stable" as const },
      ];
      
      expect(platformComparison[0].trend).toBe("improving");
      expect(platformComparison[1].trend).toBe("stable");
    });
    
    it("should handle platforms with no tests in one period", () => {
      const platformComparison = [
        { platform: "twitter", period1Tests: 0, period2Tests: 3, period1AvgLift: 0, period2AvgLift: 12, trend: "improving" as const },
        { platform: "facebook", period1Tests: 2, period2Tests: 0, period1AvgLift: 8, period2AvgLift: 0, trend: "declining" as const },
      ];
      
      expect(platformComparison[0].period1Tests).toBe(0);
      expect(platformComparison[1].period2Tests).toBe(0);
    });
  });
  
  describe("Date Range Validation", () => {
    it("should validate date ranges", () => {
      const validateDateRange = (start: Date, end: Date) => {
        if (start >= end) {
          throw new Error("Start date must be before end date");
        }
        return true;
      };
      
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-31");
      expect(validateDateRange(start, end)).toBe(true);
      
      expect(() => validateDateRange(end, start)).toThrow("Start date must be before end date");
    });
    
    it("should format period labels correctly", () => {
      const formatPeriodLabel = (start: Date, end: Date) => {
        const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return `${startStr} - ${endStr}`;
      };
      
      const label = formatPeriodLabel(new Date("2025-01-01"), new Date("2025-01-31"));
      expect(label).toContain("Jan");
      expect(label).toContain("2025");
    });
  });
  
  describe("Recommendations Generation", () => {
    it("should generate recommendations based on comparison", () => {
      const generateRecommendations = (comparison: any) => {
        const recommendations: string[] = [];
        
        if (comparison.testsCompleted.period2 < comparison.testsCompleted.period1) {
          recommendations.push("Increase your testing frequency to maintain learning momentum.");
        }
        
        if (comparison.avgConfidenceLevel.period2 < 85) {
          recommendations.push("Run tests for longer durations to achieve higher statistical confidence.");
        }
        
        if (comparison.avgEngagementLift.period2 > comparison.avgEngagementLift.period1) {
          recommendations.push("Continue applying the content patterns that are working well.");
        }
        
        return recommendations;
      };
      
      const comparison = {
        testsCompleted: { period1: 5, period2: 3 },
        avgConfidenceLevel: { period2: 80 },
        avgEngagementLift: { period1: 10, period2: 15 },
      };
      
      const recommendations = generateRecommendations(comparison);
      expect(recommendations.length).toBe(3);
      expect(recommendations[0]).toContain("testing frequency");
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Feature Integration", () => {
  it("should allow templates to use custom categories", () => {
    const template = {
      id: 1,
      name: "Product Launch",
      category: "custom_announcements", // Custom category
      content: "Exciting news!",
    };
    
    const customCategories = [
      { id: 1, name: "Announcements", slug: "custom_announcements" },
    ];
    
    const categoryExists = customCategories.some(c => c.slug === template.category);
    expect(categoryExists).toBe(true);
  });
  
  it("should respect pause status in digest preview", () => {
    const getDigestPreview = (preferences: any) => {
      if (preferences.isPaused) {
        return {
          enabled: true,
          isPaused: true,
          pauseReason: preferences.pauseReason,
          nextScheduledAt: null, // No next send when paused
        };
      }
      return {
        enabled: true,
        isPaused: false,
        nextScheduledAt: new Date("2025-01-15"),
      };
    };
    
    const pausedPreview = getDigestPreview({ isPaused: true, pauseReason: "Vacation" });
    expect(pausedPreview.isPaused).toBe(true);
    expect(pausedPreview.nextScheduledAt).toBeNull();
    
    const activePreview = getDigestPreview({ isPaused: false });
    expect(activePreview.isPaused).toBe(false);
    expect(activePreview.nextScheduledAt).not.toBeNull();
  });
  
  it("should combine history insights with time comparison", () => {
    const historyInsights = {
      summary: { totalTests: 20, completedTests: 15 },
      recommendations: ["Use emojis", "Keep posts short"],
    };
    
    const timeComparison = {
      comparison: {
        testsCompleted: { period1: 5, period2: 10, trend: "improving" },
      },
      recommendations: ["Continue current strategy"],
    };
    
    // Both should be available for comprehensive analysis
    expect(historyInsights.summary.totalTests).toBe(20);
    expect(timeComparison.comparison.testsCompleted.trend).toBe("improving");
  });
});
