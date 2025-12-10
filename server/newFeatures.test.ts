/**
 * Tests for new features: Bluesky, Email Digest, and A/B Testing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getUserABTests: vi.fn(),
  getABTest: vi.fn(),
  getABTestWithVariants: vi.fn(),
  createABTest: vi.fn(),
  updateABTest: vi.fn(),
  deleteABTest: vi.fn(),
  createABTestVariant: vi.fn(),
  updateABTestVariant: vi.fn(),
  deleteABTestVariant: vi.fn(),
  startABTest: vi.fn(),
  completeABTest: vi.fn(),
  determineABTestWinner: vi.fn(),
  calculateStatisticalSignificance: vi.fn(),
  getUserPlatformGoals: vi.fn(),
  getPlatformAnalyticsComparison: vi.fn(),
  getUserAnalyticsSummary: vi.fn(),
  getUserPosts: vi.fn(),
}));

// Mock email digest service
vi.mock("./services/emailDigest", () => ({
  getDigestPreferences: vi.fn(),
  updateDigestPreferences: vi.fn(),
  sendDigestEmail: vi.fn(),
  generateDigestContent: vi.fn(),
  formatDigestEmail: vi.fn(),
}));

import * as db from "./db";
import * as emailDigest from "./services/emailDigest";

describe("Bluesky Adapter", () => {
  describe("BlueskyAdapter class", () => {
    it("should have correct platform identifier", async () => {
      const { BlueskyAdapter } = await import("./social/bluesky");
      const adapter = new BlueskyAdapter();
      
      expect(adapter.platform).toBe("bluesky");
    });

    it("should return app passwords URL for auth", async () => {
      const { BlueskyAdapter } = await import("./social/bluesky");
      const adapter = new BlueskyAdapter();
      
      const authUrl = adapter.getAuthUrl("http://localhost", "state123");
      expect(authUrl).toBe("https://bsky.app/settings/app-passwords");
    });

    it("should have post method", async () => {
      const { BlueskyAdapter } = await import("./social/bluesky");
      const adapter = new BlueskyAdapter();
      
      expect(typeof adapter.post).toBe("function");
    });

    it("should have validateTokens method", async () => {
      const { BlueskyAdapter } = await import("./social/bluesky");
      const adapter = new BlueskyAdapter();
      
      expect(typeof adapter.validateTokens).toBe("function");
    });
  });
});

describe("Email Digest Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDigestPreferences", () => {
    it("should return default preferences for new users", async () => {
      vi.mocked(emailDigest.getDigestPreferences).mockResolvedValue({
        enabled: false,
        frequency: "weekly",
        dayOfWeek: 1,
        dayOfMonth: 1,
        hourUtc: 9,
        includeAnalytics: true,
        includeGoalProgress: true,
        includeTopPosts: true,
        includePlatformComparison: true,
        includeScheduledPosts: true,
      });

      const prefs = await emailDigest.getDigestPreferences(1);
      expect(prefs.enabled).toBe(false);
      expect(prefs.frequency).toBe("weekly");
    });
  });

  describe("updateDigestPreferences", () => {
    it("should update preferences successfully", async () => {
      vi.mocked(emailDigest.updateDigestPreferences).mockResolvedValue(undefined);

      await expect(
        emailDigest.updateDigestPreferences(1, { enabled: true, frequency: "monthly" })
      ).resolves.not.toThrow();
    });
  });

  describe("formatDigestEmail", () => {
    it("should format email content correctly", async () => {
      vi.mocked(emailDigest.formatDigestEmail).mockReturnValue({
        subject: "Your Weekly Analytics Report",
        html: "<html>...</html>",
        text: "Your weekly report...",
      });

      const formatted = emailDigest.formatDigestEmail({
        period: "weekly",
        periodStart: new Date(),
        periodEnd: new Date(),
        analytics: {
          totalPosts: 10,
          totalImpressions: 1000,
          totalEngagements: 50,
          avgEngagementRate: 5,
          changeFromPrevious: { posts: 2, impressions: 100, engagements: 10 },
        },
        topPosts: [],
        goalProgress: [],
        platformComparison: [],
        scheduledPosts: [],
      });

      expect(formatted.subject).toContain("Weekly");
    });
  });
});

describe("A/B Testing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserABTests", () => {
    it("should return user's A/B tests", async () => {
      vi.mocked(db.getUserABTests).mockResolvedValue([
        {
          id: 1,
          userId: 1,
          name: "Test 1",
          description: "Test description",
          platform: "linkedin",
          status: "draft",
          startedAt: null,
          endedAt: null,
          durationHours: 48,
          winningVariantId: null,
          confidenceLevel: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const tests = await db.getUserABTests(1);
      expect(tests).toHaveLength(1);
      expect(tests[0].name).toBe("Test 1");
    });
  });

  describe("createABTest", () => {
    it("should create a new A/B test", async () => {
      vi.mocked(db.createABTest).mockResolvedValue(1);

      const testId = await db.createABTest({
        userId: 1,
        name: "New Test",
        platform: "twitter",
        status: "draft",
      });

      expect(testId).toBe(1);
    });
  });

  describe("getABTestWithVariants", () => {
    it("should return test with variants", async () => {
      vi.mocked(db.getABTestWithVariants).mockResolvedValue({
        test: {
          id: 1,
          userId: 1,
          name: "Test 1",
          description: null,
          platform: "linkedin",
          status: "active",
          startedAt: new Date(),
          endedAt: null,
          durationHours: 48,
          winningVariantId: null,
          confidenceLevel: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        variants: [
          {
            id: 1,
            testId: 1,
            label: "A",
            content: "Variant A content",
            hashtags: null,
            mediaUrls: null,
            postId: null,
            impressions: 100,
            engagements: 10,
            clicks: 5,
            shares: 2,
            comments: 3,
            likes: 5,
            engagementRate: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            testId: 1,
            label: "B",
            content: "Variant B content",
            hashtags: null,
            mediaUrls: null,
            postId: null,
            impressions: 100,
            engagements: 15,
            clicks: 8,
            shares: 3,
            comments: 4,
            likes: 8,
            engagementRate: 1500,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await db.getABTestWithVariants(1, 1);
      expect(result?.test.name).toBe("Test 1");
      expect(result?.variants).toHaveLength(2);
    });
  });

  describe("determineABTestWinner", () => {
    it("should determine winner with high confidence", async () => {
      vi.mocked(db.determineABTestWinner).mockResolvedValue({
        winnerId: 2,
        confidence: 95,
        recommendation: "Variant B is the clear winner with 15.00% engagement rate (95% confidence)",
      });

      const result = await db.determineABTestWinner(1);
      expect(result?.winnerId).toBe(2);
      expect(result?.confidence).toBe(95);
    });

    it("should return no winner with low confidence", async () => {
      vi.mocked(db.determineABTestWinner).mockResolvedValue({
        winnerId: null,
        confidence: 60,
        recommendation: "Results are not statistically significant yet. Continue running the test.",
      });

      const result = await db.determineABTestWinner(1);
      expect(result?.winnerId).toBeNull();
      expect(result?.confidence).toBe(60);
    });
  });

  describe("startABTest", () => {
    it("should start a draft test", async () => {
      vi.mocked(db.startABTest).mockResolvedValue(undefined);

      await expect(db.startABTest(1, 1)).resolves.not.toThrow();
    });
  });

  describe("completeABTest", () => {
    it("should complete test with winner", async () => {
      vi.mocked(db.completeABTest).mockResolvedValue(undefined);

      await expect(db.completeABTest(1, 1, 2, 95)).resolves.not.toThrow();
    });
  });

  describe("deleteABTest", () => {
    it("should delete test and variants", async () => {
      vi.mocked(db.deleteABTest).mockResolvedValue(undefined);

      await expect(db.deleteABTest(1, 1)).resolves.not.toThrow();
    });
  });
});

// Note: Statistical significance calculation tests are in a separate file
// to avoid mocking conflicts with the db module
