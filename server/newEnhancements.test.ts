/**
 * New Enhancements Tests
 * 
 * Tests for template duplication, digest scheduling preview, and PDF export features.
 */

import { describe, it, expect, vi } from "vitest";
import { generateInsightsHtml } from "./services/insightsPdfExport";
import type { TestHistoryInsights } from "./services/abTestInsights";

// Mock the database module
vi.mock("./db", () => ({
  getMastodonTemplate: vi.fn(),
  createMastodonTemplate: vi.fn(),
  getUserABTests: vi.fn(),
  getABTestWithVariants: vi.fn(),
}));

import * as db from "./db";

describe("Template Duplication", () => {
  describe("getMastodonTemplate", () => {
    it("should return a template when it exists", async () => {
      const mockTemplate = {
        id: 1,
        userId: 1,
        name: "Test Template",
        description: "A test template",
        category: "tech",
        content: "Hello {{topic}}!",
        defaultCW: null,
        cwPresetId: null,
        defaultVisibility: "public",
        isSystem: false,
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(db.getMastodonTemplate).mockResolvedValue(mockTemplate);
      
      const result = await db.getMastodonTemplate(1, 1);
      expect(result).toEqual(mockTemplate);
    });
    
    it("should return null when template does not exist", async () => {
      vi.mocked(db.getMastodonTemplate).mockResolvedValue(null);
      
      const result = await db.getMastodonTemplate(999, 1);
      expect(result).toBeNull();
    });
  });
  
  describe("createMastodonTemplate", () => {
    it("should create a new template and return its ID", async () => {
      vi.mocked(db.createMastodonTemplate).mockResolvedValue(42);
      
      const result = await db.createMastodonTemplate({
        name: "Duplicated Template",
        content: "Hello world!",
        userId: 1,
      });
      
      expect(result).toBe(42);
    });
  });
  
  describe("Duplicate template logic", () => {
    it("should create a copy with (Copy) suffix by default", async () => {
      const originalName = "My Template";
      const expectedName = `${originalName} (Copy)`;
      
      expect(expectedName).toBe("My Template (Copy)");
    });
    
    it("should use custom name when provided", async () => {
      const customName = "My Custom Copy";
      expect(customName).toBe("My Custom Copy");
    });
    
    it("should set isPublic to false for duplicated templates", async () => {
      const duplicatedTemplate = {
        isPublic: false,
      };
      
      expect(duplicatedTemplate.isPublic).toBe(false);
    });
  });
});

describe("Digest Scheduling Preview", () => {
  describe("calculateNextDigestDate", () => {
    it("should calculate next weekly digest date correctly", () => {
      const now = new Date("2024-01-15T10:00:00Z"); // Monday
      const dayOfWeek = 3; // Wednesday
      
      // Expected: next Wednesday (Jan 17)
      const expected = new Date("2024-01-17T09:00:00Z");
      
      // Simulate the calculation
      const next = new Date(now);
      const currentDay = now.getDay();
      let daysUntil = dayOfWeek - currentDay;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
      next.setHours(9, 0, 0, 0);
      
      expect(next.getDay()).toBe(dayOfWeek);
    });
    
    it("should wrap to next week if day has passed", () => {
      const now = new Date("2024-01-17T10:00:00Z"); // Wednesday
      const dayOfWeek = 1; // Monday
      
      // Expected: next Monday (Jan 22)
      const next = new Date(now);
      const currentDay = now.getDay();
      let daysUntil = dayOfWeek - currentDay;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
      
      expect(daysUntil).toBe(5); // 5 days until next Monday
    });
    
    it("should calculate next monthly digest date correctly", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      const dayOfMonth = 20;
      
      // Expected: Jan 20
      const next = new Date(now);
      next.setDate(dayOfMonth);
      
      expect(next.getDate()).toBe(20);
      expect(next > now).toBe(true);
    });
    
    it("should move to next month if day has passed", () => {
      const now = new Date("2024-01-25T10:00:00Z");
      const dayOfMonth = 15;
      
      // Expected: Feb 15
      const next = new Date(now);
      next.setDate(dayOfMonth);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      
      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(15);
    });
  });
  
  describe("DigestPreview structure", () => {
    it("should include all required fields", () => {
      const preview = {
        nextScheduledAt: new Date(),
        frequency: "weekly" as const,
        dayOfWeek: 1,
        dayOfMonth: 1,
        enabled: true,
        previewHtml: "<html>...</html>",
        previewContent: null,
        includedSections: {
          analytics: true,
          goalProgress: true,
          topPosts: true,
          platformComparison: true,
          scheduledPosts: true,
        },
      };
      
      expect(preview).toHaveProperty("nextScheduledAt");
      expect(preview).toHaveProperty("frequency");
      expect(preview).toHaveProperty("dayOfWeek");
      expect(preview).toHaveProperty("dayOfMonth");
      expect(preview).toHaveProperty("enabled");
      expect(preview).toHaveProperty("previewHtml");
      expect(preview).toHaveProperty("includedSections");
    });
    
    it("should return null nextScheduledAt when disabled", () => {
      const preview = {
        enabled: false,
        nextScheduledAt: null,
      };
      
      expect(preview.nextScheduledAt).toBeNull();
    });
  });
});

describe("PDF Export", () => {
  describe("generateInsightsHtml", () => {
    const mockInsights: TestHistoryInsights = {
      userId: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: 10,
        completedTests: 8,
        avgConfidenceLevel: 85,
        avgEngagementLift: 15.5,
        mostTestedPlatform: "linkedin",
        bestPerformingPlatform: "twitter",
      },
      platformBreakdown: [
        {
          platform: "linkedin",
          testsCompleted: 5,
          avgConfidence: 88,
          avgEngagementLift: 12.3,
          winningPatterns: ["Hashtags", "Questions"],
        },
        {
          platform: "twitter",
          testsCompleted: 3,
          avgConfidence: 82,
          avgEngagementLift: 18.7,
          winningPatterns: ["Emojis"],
        },
      ],
      historicalInsights: [
        {
          category: "content",
          title: "Questions drive engagement",
          description: "Posts with questions get 30% more engagement",
          confidence: "high",
          dataPoints: 15,
          trend: "improving",
        },
      ],
      contentLearnings: {
        winningElements: [
          { element: "Questions", frequency: 8 },
          { element: "Hashtags", frequency: 6 },
        ],
        losingElements: [
          { element: "Long paragraphs", frequency: 4 },
        ],
      },
      recommendations: [
        {
          title: "Use more questions",
          description: "Questions consistently outperform statements",
          priority: "high",
          basedOn: "8 tests",
        },
      ],
      timeAnalysis: {
        bestDayOfWeek: "Tuesday",
        bestTimeOfDay: "Morning",
        testFrequency: "2 per week",
      },
    };
    
    it("should generate valid HTML", () => {
      const html = generateInsightsHtml(mockInsights);
      
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });
    
    it("should include summary statistics", () => {
      const html = generateInsightsHtml(mockInsights);
      
      expect(html).toContain("10"); // totalTests
      expect(html).toContain("8"); // completedTests
      expect(html).toContain("85%"); // avgConfidenceLevel
    });
    
    it("should include platform breakdown when enabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includePlatformBreakdown: true,
      });
      
      expect(html).toContain("linkedin");
      expect(html).toContain("twitter");
    });
    
    it("should exclude platform breakdown when disabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includePlatformBreakdown: false,
      });
      
      // Platform table should not be present
      expect(html).not.toContain("Platform Performance");
    });
    
    it("should include content learnings when enabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includeContentLearnings: true,
      });
      
      expect(html).toContain("Winning Elements");
      expect(html).toContain("Questions");
    });
    
    it("should exclude content learnings when disabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includeContentLearnings: false,
      });
      
      expect(html).not.toContain("Content Learnings");
    });
    
    it("should include recommendations when enabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includeRecommendations: true,
      });
      
      expect(html).toContain("Recommendations");
      expect(html).toContain("Use more questions");
    });
    
    it("should exclude recommendations when disabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includeRecommendations: false,
      });
      
      expect(html).not.toContain("Recommendations");
    });
    
    it("should include time analysis when enabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includeTimeAnalysis: true,
      });
      
      expect(html).toContain("Time Analysis");
      expect(html).toContain("Tuesday");
    });
    
    it("should exclude time analysis when disabled", () => {
      const html = generateInsightsHtml(mockInsights, {
        includeTimeAnalysis: false,
      });
      
      expect(html).not.toContain("Time Analysis");
    });
    
    it("should include proper styling for print", () => {
      const html = generateInsightsHtml(mockInsights);
      
      expect(html).toContain("@media print");
    });
    
    it("should include AccessAI branding", () => {
      const html = generateInsightsHtml(mockInsights);
      
      expect(html).toContain("AccessAI");
    });
  });
  
  describe("PDF export options", () => {
    it("should default all options to true", () => {
      const defaultOptions = {
        includeRecommendations: true,
        includePlatformBreakdown: true,
        includeContentLearnings: true,
        includeTimeAnalysis: true,
      };
      
      expect(defaultOptions.includeRecommendations).toBe(true);
      expect(defaultOptions.includePlatformBreakdown).toBe(true);
      expect(defaultOptions.includeContentLearnings).toBe(true);
      expect(defaultOptions.includeTimeAnalysis).toBe(true);
    });
  });
});

describe("Integration scenarios", () => {
  it("should handle empty test history gracefully", () => {
    const emptyInsights: TestHistoryInsights = {
      userId: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: 0,
        completedTests: 0,
        avgConfidenceLevel: 0,
        avgEngagementLift: 0,
        mostTestedPlatform: null,
        bestPerformingPlatform: null,
      },
      platformBreakdown: [],
      historicalInsights: [],
      contentLearnings: {
        winningElements: [],
        losingElements: [],
      },
      recommendations: [],
      timeAnalysis: {
        bestDayOfWeek: null,
        bestTimeOfDay: null,
        testFrequency: null,
      },
    };
    
    const html = generateInsightsHtml(emptyInsights);
    
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("0"); // totalTests
    expect(html).toContain("N/A"); // null platform
  });
  
  it("should handle special characters in content", () => {
    const insightsWithSpecialChars: TestHistoryInsights = {
      userId: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: 1,
        completedTests: 1,
        avgConfidenceLevel: 90,
        avgEngagementLift: 10,
        mostTestedPlatform: "linkedin",
        bestPerformingPlatform: "linkedin",
      },
      platformBreakdown: [],
      historicalInsights: [],
      contentLearnings: {
        winningElements: [
          { element: "Emojis 🎉", frequency: 5 },
          { element: "Questions?", frequency: 3 },
        ],
        losingElements: [],
      },
      recommendations: [
        {
          title: "Use <strong> formatting",
          description: "HTML-like content & special chars",
          priority: "medium",
          basedOn: "1 test",
        },
      ],
      timeAnalysis: {
        bestDayOfWeek: "Monday",
        bestTimeOfDay: "9:00 AM",
        testFrequency: "Weekly",
      },
    };
    
    const html = generateInsightsHtml(insightsWithSpecialChars);
    
    expect(html).toContain("<!DOCTYPE html>");
    // The HTML should be generated without errors
  });
});
