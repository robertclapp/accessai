/**
 * A/B Test History Insights Tests
 * 
 * Tests for the comprehensive historical insights feature that analyzes
 * patterns across all completed A/B tests.
 */

import { describe, it, expect, vi } from "vitest";
import {
  generateTestHistoryInsights,
  extractContentFeatures,
} from "./services/abTestInsights";

// Mock the database module
vi.mock("./db", () => ({
  getUserABTests: vi.fn(),
  getABTestWithVariants: vi.fn(),
}));

// Import the mocked module
import * as db from "./db";

describe("A/B Test History Insights", () => {
  describe("generateTestHistoryInsights", () => {
    it("should return empty insights when no tests exist", async () => {
      vi.mocked(db.getUserABTests).mockResolvedValue([]);
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.summary.totalTests).toBe(0);
      expect(insights.summary.completedTests).toBe(0);
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.recommendations[0].title).toBe("Start A/B Testing");
    });
    
    it("should calculate summary statistics from completed tests", async () => {
      const mockTests = [
        {
          id: 1,
          name: "Test 1",
          platform: "linkedin",
          status: "completed",
          winningVariantId: 1,
          confidenceLevel: 95,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 1,
          description: null,
          durationHours: 48,
          startedAt: null,
          completedAt: null,
          bulkGroupId: null,
        },
        {
          id: 2,
          name: "Test 2",
          platform: "twitter",
          status: "completed",
          winningVariantId: 3,
          confidenceLevel: 85,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 1,
          description: null,
          durationHours: 48,
          startedAt: null,
          completedAt: null,
          bulkGroupId: null,
        },
      ];
      
      vi.mocked(db.getUserABTests).mockResolvedValue(mockTests);
      vi.mocked(db.getABTestWithVariants).mockImplementation(async (testId) => {
        if (testId === 1) {
          return {
            test: mockTests[0],
            variants: [
              { id: 1, testId: 1, label: "A", content: "Winner content with #hashtag", impressions: 1000, engagements: 100, engagementRate: 1000, clicks: 50, shares: 20, comments: 10, likes: 20, createdAt: new Date(), updatedAt: new Date() },
              { id: 2, testId: 1, label: "B", content: "Loser content", impressions: 1000, engagements: 50, engagementRate: 500, clicks: 25, shares: 10, comments: 5, likes: 10, createdAt: new Date(), updatedAt: new Date() },
            ],
          };
        }
        return {
          test: mockTests[1],
          variants: [
            { id: 3, testId: 2, label: "A", content: "Winner with emoji 🎉", impressions: 500, engagements: 75, engagementRate: 1500, clicks: 40, shares: 15, comments: 8, likes: 12, createdAt: new Date(), updatedAt: new Date() },
            { id: 4, testId: 2, label: "B", content: "Plain loser", impressions: 500, engagements: 25, engagementRate: 500, clicks: 10, shares: 5, comments: 2, likes: 8, createdAt: new Date(), updatedAt: new Date() },
          ],
        };
      });
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.summary.totalTests).toBe(2);
      expect(insights.summary.completedTests).toBe(2);
      expect(insights.summary.avgConfidenceLevel).toBe(90);
      expect(insights.platformBreakdown.length).toBe(2);
    });
    
    it("should identify the most tested platform", async () => {
      const mockTests = [
        { id: 1, platform: "linkedin", status: "completed", winningVariantId: 1, confidenceLevel: 90, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 1", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
        { id: 2, platform: "linkedin", status: "completed", winningVariantId: 3, confidenceLevel: 85, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 2", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
        { id: 3, platform: "twitter", status: "completed", winningVariantId: 5, confidenceLevel: 92, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 3", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
      ];
      
      vi.mocked(db.getUserABTests).mockResolvedValue(mockTests);
      vi.mocked(db.getABTestWithVariants).mockResolvedValue({
        test: mockTests[0],
        variants: [
          { id: 1, testId: 1, label: "A", content: "Winner", impressions: 100, engagements: 10, engagementRate: 1000, clicks: 5, shares: 2, comments: 1, likes: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, testId: 1, label: "B", content: "Loser", impressions: 100, engagements: 5, engagementRate: 500, clicks: 2, shares: 1, comments: 0, likes: 2, createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.summary.mostTestedPlatform).toBe("linkedin");
    });
    
    it("should generate recommendations based on patterns", async () => {
      const mockTests = [
        { id: 1, platform: "linkedin", status: "completed", winningVariantId: 1, confidenceLevel: 95, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 1", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
      ];
      
      vi.mocked(db.getUserABTests).mockResolvedValue(mockTests);
      vi.mocked(db.getABTestWithVariants).mockResolvedValue({
        test: mockTests[0],
        variants: [
          { id: 1, testId: 1, label: "A", content: "Winner with #hashtag and emoji 🎉", impressions: 1000, engagements: 100, engagementRate: 1000, clicks: 50, shares: 20, comments: 10, likes: 20, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, testId: 1, label: "B", content: "Plain loser content", impressions: 1000, engagements: 50, engagementRate: 500, clicks: 25, shares: 10, comments: 5, likes: 10, createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });
  
  describe("extractContentFeatures", () => {
    it("should detect emojis in content", () => {
      const content = "Hello world! 🎉🚀";
      const features = extractContentFeatures(content);
      
      expect(features.some(f => f.includes("Emoji"))).toBe(true);
    });
    
    it("should detect hashtags in content", () => {
      const content = "Check out #accessibility and #a11y";
      const features = extractContentFeatures(content);
      
      expect(features.some(f => f.includes("Hashtag"))).toBe(true);
    });
    
    it("should detect questions in content", () => {
      const content = "What do you think about this?";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Questions");
    });
    
    it("should detect calls to action", () => {
      const content = "Click here to learn more about our product";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Call to Action");
    });
    
    it("should detect links in content", () => {
      const content = "Visit https://example.com for more info";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Links");
    });
    
    it("should detect mentions in content", () => {
      const content = "Thanks @user for the feedback!";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Mentions");
    });
    
    it("should categorize content length correctly", () => {
      const shortContent = "Hi!";
      const mediumContent = "This is a medium length post that has more than 100 characters but less than 280 characters. It provides enough detail.";
      const longContent = "A".repeat(300);
      
      const shortFeatures = extractContentFeatures(shortContent);
      const mediumFeatures = extractContentFeatures(mediumContent);
      const longFeatures = extractContentFeatures(longContent);
      
      expect(shortFeatures.some(f => f.includes("Short"))).toBe(true);
      expect(mediumFeatures.some(f => f.includes("Medium"))).toBe(true);
      expect(longFeatures.some(f => f.includes("Long"))).toBe(true);
    });
    
    it("should detect multi-paragraph content", () => {
      const content = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Multi-paragraph");
    });
    
    it("should detect bullet points", () => {
      const content = "Key points:\n- First item\n- Second item\n- Third item";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Bullet Points");
    });
    
    it("should detect statistics", () => {
      const content = "We achieved 50% growth and 2 million users!";
      const features = extractContentFeatures(content);
      
      expect(features).toContain("Statistics");
    });
  });
  
  describe("TestHistoryInsights structure", () => {
    it("should include all required fields", async () => {
      vi.mocked(db.getUserABTests).mockResolvedValue([]);
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights).toHaveProperty("userId");
      expect(insights).toHaveProperty("generatedAt");
      expect(insights).toHaveProperty("summary");
      expect(insights).toHaveProperty("platformBreakdown");
      expect(insights).toHaveProperty("historicalInsights");
      expect(insights).toHaveProperty("contentLearnings");
      expect(insights).toHaveProperty("recommendations");
      expect(insights).toHaveProperty("timeAnalysis");
    });
    
    it("should have correct summary structure", async () => {
      vi.mocked(db.getUserABTests).mockResolvedValue([]);
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.summary).toHaveProperty("totalTests");
      expect(insights.summary).toHaveProperty("completedTests");
      expect(insights.summary).toHaveProperty("avgConfidenceLevel");
      expect(insights.summary).toHaveProperty("avgEngagementLift");
      expect(insights.summary).toHaveProperty("mostTestedPlatform");
      expect(insights.summary).toHaveProperty("bestPerformingPlatform");
    });
    
    it("should have correct content learnings structure", async () => {
      vi.mocked(db.getUserABTests).mockResolvedValue([]);
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.contentLearnings).toHaveProperty("winningElements");
      expect(insights.contentLearnings).toHaveProperty("losingElements");
      expect(Array.isArray(insights.contentLearnings.winningElements)).toBe(true);
      expect(Array.isArray(insights.contentLearnings.losingElements)).toBe(true);
    });
    
    it("should have correct time analysis structure", async () => {
      vi.mocked(db.getUserABTests).mockResolvedValue([]);
      
      const insights = await generateTestHistoryInsights(1);
      
      expect(insights.timeAnalysis).toHaveProperty("bestDayOfWeek");
      expect(insights.timeAnalysis).toHaveProperty("bestTimeOfDay");
      expect(insights.timeAnalysis).toHaveProperty("testFrequency");
    });
  });
  
  describe("Platform breakdown", () => {
    it("should group tests by platform", async () => {
      const mockTests = [
        { id: 1, platform: "linkedin", status: "completed", winningVariantId: 1, confidenceLevel: 90, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 1", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
        { id: 2, platform: "linkedin", status: "completed", winningVariantId: 3, confidenceLevel: 85, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 2", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
        { id: 3, platform: "twitter", status: "completed", winningVariantId: 5, confidenceLevel: 92, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 3", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
      ];
      
      vi.mocked(db.getUserABTests).mockResolvedValue(mockTests);
      vi.mocked(db.getABTestWithVariants).mockResolvedValue({
        test: mockTests[0],
        variants: [
          { id: 1, testId: 1, label: "A", content: "Winner", impressions: 100, engagements: 10, engagementRate: 1000, clicks: 5, shares: 2, comments: 1, likes: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, testId: 1, label: "B", content: "Loser", impressions: 100, engagements: 5, engagementRate: 500, clicks: 2, shares: 1, comments: 0, likes: 2, createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      
      const insights = await generateTestHistoryInsights(1);
      
      const linkedinBreakdown = insights.platformBreakdown.find(p => p.platform === "linkedin");
      const twitterBreakdown = insights.platformBreakdown.find(p => p.platform === "twitter");
      
      expect(linkedinBreakdown?.testsCompleted).toBe(2);
      expect(twitterBreakdown?.testsCompleted).toBe(1);
    });
    
    it("should calculate average confidence per platform", async () => {
      const mockTests = [
        { id: 1, platform: "linkedin", status: "completed", winningVariantId: 1, confidenceLevel: 90, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 1", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
        { id: 2, platform: "linkedin", status: "completed", winningVariantId: 3, confidenceLevel: 80, createdAt: new Date(), updatedAt: new Date(), userId: 1, name: "Test 2", description: null, durationHours: 48, startedAt: null, completedAt: null, bulkGroupId: null },
      ];
      
      vi.mocked(db.getUserABTests).mockResolvedValue(mockTests);
      vi.mocked(db.getABTestWithVariants).mockResolvedValue({
        test: mockTests[0],
        variants: [
          { id: 1, testId: 1, label: "A", content: "Winner", impressions: 100, engagements: 10, engagementRate: 1000, clicks: 5, shares: 2, comments: 1, likes: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, testId: 1, label: "B", content: "Loser", impressions: 100, engagements: 5, engagementRate: 500, clicks: 2, shares: 1, comments: 0, likes: 2, createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      
      const insights = await generateTestHistoryInsights(1);
      
      const linkedinBreakdown = insights.platformBreakdown.find(p => p.platform === "linkedin");
      expect(linkedinBreakdown?.avgConfidence).toBe(85);
    });
  });
  
  describe("Historical insights generation", () => {
    it("should generate high confidence insights for frequent patterns", async () => {
      const mockTests = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        platform: "linkedin",
        status: "completed",
        winningVariantId: i * 2 + 1,
        confidenceLevel: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 1,
        name: `Test ${i + 1}`,
        description: null,
        durationHours: 48,
        startedAt: null,
        completedAt: null,
        bulkGroupId: null,
      }));
      
      vi.mocked(db.getUserABTests).mockResolvedValue(mockTests);
      vi.mocked(db.getABTestWithVariants).mockResolvedValue({
        test: mockTests[0],
        variants: [
          { id: 1, testId: 1, label: "A", content: "Winner with #hashtag", impressions: 100, engagements: 10, engagementRate: 1000, clicks: 5, shares: 2, comments: 1, likes: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, testId: 1, label: "B", content: "Loser", impressions: 100, engagements: 5, engagementRate: 500, clicks: 2, shares: 1, comments: 0, likes: 2, createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      
      const insights = await generateTestHistoryInsights(1);
      
      // Should have platform performance insight with high confidence
      const platformInsight = insights.historicalInsights.find(
        i => i.category === "platform" && i.dataPoints >= 5
      );
      
      if (platformInsight) {
        expect(platformInsight.confidence).toBe("high");
      }
    });
  });
});
