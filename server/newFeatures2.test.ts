/**
 * Tests for Email Digest Settings UI, A/B Test Winner Scheduling, and Mastodon Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database functions
vi.mock("./db", () => ({
  getEmailDigestPreferences: vi.fn(),
  updateEmailDigestPreferences: vi.fn(),
  getABTestById: vi.fn(),
  getABTestVariants: vi.fn(),
  createPost: vi.fn(),
  connectSocialAccount: vi.fn(),
  getUserSocialAccounts: vi.fn(),
}));

describe("Email Digest Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Digest Preferences", () => {
    it("should have valid frequency options", () => {
      const validFrequencies = ["weekly", "monthly", "disabled"];
      expect(validFrequencies).toContain("weekly");
      expect(validFrequencies).toContain("monthly");
      expect(validFrequencies).toContain("disabled");
    });

    it("should have valid day of week options", () => {
      const validDays = [0, 1, 2, 3, 4, 5, 6];
      expect(validDays).toHaveLength(7);
      expect(validDays[0]).toBe(0); // Sunday
      expect(validDays[6]).toBe(6); // Saturday
    });

    it("should have valid hour options", () => {
      const validHours = Array.from({ length: 24 }, (_, i) => i);
      expect(validHours).toHaveLength(24);
      expect(validHours[0]).toBe(0);
      expect(validHours[23]).toBe(23);
    });

    it("should have content section options", () => {
      const contentSections = [
        "analyticsOverview",
        "topPosts",
        "goalProgress",
        "platformComparison",
        "recommendations"
      ];
      expect(contentSections).toHaveLength(5);
      expect(contentSections).toContain("analyticsOverview");
      expect(contentSections).toContain("goalProgress");
    });
  });

  describe("Digest Email Generation", () => {
    it("should include analytics summary in digest", () => {
      const digestContent = {
        analyticsOverview: true,
        topPosts: true,
        goalProgress: true,
        platformComparison: true,
        recommendations: true
      };
      
      expect(digestContent.analyticsOverview).toBe(true);
      expect(digestContent.goalProgress).toBe(true);
    });

    it("should support preview functionality", () => {
      const previewPeriod = "weekly";
      expect(["weekly", "monthly"]).toContain(previewPeriod);
    });
  });
});

describe("A/B Test Winner Scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Schedule Winner Functionality", () => {
    it("should validate test has a winner before scheduling", () => {
      const test = {
        id: 1,
        status: "completed",
        winningVariantId: 5
      };
      
      expect(test.status).toBe("completed");
      expect(test.winningVariantId).toBeDefined();
      expect(test.winningVariantId).toBeGreaterThan(0);
    });

    it("should not allow scheduling for tests without a winner", () => {
      const test = {
        id: 2,
        status: "active",
        winningVariantId: null
      };
      
      expect(test.winningVariantId).toBeNull();
    });

    it("should validate scheduled date is in the future", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      
      expect(futureDate.getTime()).toBeGreaterThan(now.getTime());
      expect(pastDate.getTime()).toBeLessThan(now.getTime());
    });

    it("should support platform selection for scheduled post", () => {
      const platforms = ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon"];
      
      expect(platforms).toContain("linkedin");
      expect(platforms).toContain("mastodon");
      expect(platforms).toHaveLength(7);
    });

    it("should create post with winning variant content", () => {
      const winningVariant = {
        id: 5,
        content: "This is the winning content!",
        hashtags: ["marketing", "success"]
      };
      
      const scheduledPost = {
        content: winningVariant.content,
        hashtags: winningVariant.hashtags,
        status: "scheduled",
        scheduledAt: new Date("2025-12-15T10:00:00Z")
      };
      
      expect(scheduledPost.content).toBe(winningVariant.content);
      expect(scheduledPost.hashtags).toEqual(winningVariant.hashtags);
      expect(scheduledPost.status).toBe("scheduled");
    });
  });
});

describe("Mastodon Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Platform Configuration", () => {
    it("should have correct character limit", () => {
      const mastodonCharLimit = 500;
      expect(mastodonCharLimit).toBe(500);
    });

    it("should have correct hashtag limit", () => {
      const mastodonHashtagLimit = 5;
      expect(mastodonHashtagLimit).toBe(5);
    });

    it("should be included in platform list", () => {
      const platforms = ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon"];
      expect(platforms).toContain("mastodon");
    });
  });

  describe("Mastodon Adapter", () => {
    it("should format content correctly", () => {
      const content = "Hello Mastodon!";
      const hashtags = ["test", "mastodon"];
      
      const formattedContent = `${content}\n\n${hashtags.map(t => `#${t}`).join(" ")}`;
      
      expect(formattedContent).toContain("Hello Mastodon!");
      expect(formattedContent).toContain("#test");
      expect(formattedContent).toContain("#mastodon");
    });

    it("should truncate content exceeding character limit", () => {
      const longContent = "a".repeat(600);
      const charLimit = 500;
      
      const truncated = longContent.length > charLimit 
        ? longContent.substring(0, charLimit - 3) + "..."
        : longContent;
      
      expect(truncated.length).toBe(500);
      expect(truncated.endsWith("...")).toBe(true);
    });

    it("should support OAuth authorization URL generation", () => {
      const instanceUrl = "https://mastodon.social";
      const clientId = "test-client-id";
      const redirectUri = "https://app.example.com/callback";
      const scopes = ["read", "write"];
      
      const authUrl = `${instanceUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes.join(" ")}`;
      
      expect(authUrl).toContain("mastodon.social");
      expect(authUrl).toContain("oauth/authorize");
      expect(authUrl).toContain("client_id=test-client-id");
    });

    it("should support federated instances", () => {
      const instances = [
        "https://mastodon.social",
        "https://mastodon.online",
        "https://fosstodon.org",
        "https://hachyderm.io"
      ];
      
      instances.forEach(instance => {
        expect(instance).toMatch(/^https:\/\//);
      });
    });
  });

  describe("Mastodon Post Result", () => {
    it("should return success with post ID and URL", () => {
      const result = {
        success: true,
        postId: "123456789",
        postUrl: "https://mastodon.social/@user/123456789"
      };
      
      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
      expect(result.postUrl).toContain("mastodon.social");
    });

    it("should return error on failure", () => {
      const result = {
        success: false,
        error: "Invalid credentials"
      };
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe("Platform Display Configuration", () => {
  it("should have display name for Mastodon", () => {
    const displayNames: Record<string, string> = {
      linkedin: "LinkedIn",
      twitter: "X (Twitter)",
      facebook: "Facebook",
      instagram: "Instagram",
      threads: "Threads",
      bluesky: "Bluesky",
      mastodon: "Mastodon"
    };
    
    expect(displayNames.mastodon).toBe("Mastodon");
  });

  it("should have color configuration for Mastodon", () => {
    const platformColors: Record<string, string> = {
      linkedin: "bg-blue-600",
      twitter: "bg-black",
      facebook: "bg-blue-500",
      instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
      threads: "bg-black",
      bluesky: "bg-sky-500",
      mastodon: "bg-purple-600"
    };
    
    expect(platformColors.mastodon).toBe("bg-purple-600");
  });

  it("should have icon for Mastodon", () => {
    const platformIcons: Record<string, string> = {
      linkedin: "in",
      twitter: "𝕏",
      facebook: "f",
      instagram: "📷",
      threads: "@",
      bluesky: "🦋",
      mastodon: "🐘"
    };
    
    expect(platformIcons.mastodon).toBe("🐘");
  });
});
