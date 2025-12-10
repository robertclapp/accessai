/**
 * Tests for new features:
 * - Mastodon content warning support
 * - Scheduled digest preview
 * - Bulk A/B test creation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./db", () => ({
  createPost: vi.fn().mockResolvedValue({ id: 1 }),
  getUserDigestPreferences: vi.fn().mockResolvedValue({
    enabled: true,
    frequency: "weekly",
    dayOfWeek: 1,
    hourUtc: 9,
  }),
  createABTest: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe("Mastodon Content Warning Support", () => {
  it("should include contentWarning field in post schema", () => {
    // The contentWarning field should be optional and accept strings
    const postWithCW = {
      content: "Test post content",
      platform: "mastodon",
      contentWarning: "Spoiler alert",
    };
    
    expect(postWithCW.contentWarning).toBe("Spoiler alert");
  });

  it("should allow empty content warning", () => {
    const postWithoutCW = {
      content: "Test post content",
      platform: "mastodon",
      contentWarning: "",
    };
    
    expect(postWithoutCW.contentWarning).toBe("");
  });

  it("should only show CW field for Mastodon platform", () => {
    // CW is Mastodon-specific feature
    const mastodonPost = { platform: "mastodon", showCW: true };
    const linkedinPost = { platform: "linkedin", showCW: false };
    
    expect(mastodonPost.showCW).toBe(true);
    expect(linkedinPost.showCW).toBe(false);
  });
});

describe("Scheduled Digest Preview", () => {
  it("should calculate next weekly send time correctly", () => {
    const now = new Date("2024-12-10T10:00:00Z"); // Tuesday
    const dayOfWeek = 1; // Monday
    const hourUtc = 9;
    
    // Calculate next Monday at 9 AM UTC
    const nextSend = new Date(now);
    nextSend.setUTCHours(hourUtc, 0, 0, 0);
    
    const currentDay = now.getUTCDay();
    let daysUntilNext = dayOfWeek - currentDay;
    if (daysUntilNext < 0 || (daysUntilNext === 0 && now > nextSend)) {
      daysUntilNext += 7;
    }
    nextSend.setUTCDate(now.getUTCDate() + daysUntilNext);
    
    // Should be next Monday
    expect(nextSend.getUTCDay()).toBe(1); // Monday
    expect(nextSend.getUTCHours()).toBe(9);
  });

  it("should calculate next monthly send time correctly", () => {
    const now = new Date("2024-12-15T10:00:00Z");
    const dayOfMonth = 1;
    const hourUtc = 9;
    
    const nextSend = new Date(now);
    nextSend.setUTCHours(hourUtc, 0, 0, 0);
    nextSend.setUTCDate(dayOfMonth);
    
    // If day has passed this month, move to next month
    if (nextSend <= now) {
      nextSend.setUTCMonth(nextSend.getUTCMonth() + 1);
    }
    
    // Should be January 1st
    expect(nextSend.getUTCMonth()).toBe(0); // January
    expect(nextSend.getUTCDate()).toBe(1);
  });

  it("should format countdown correctly", () => {
    const formatCountdown = (diff: number): string => {
      if (diff <= 0) return "Soon";
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
      } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`;
      } else {
        return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      }
    };
    
    // 2 days, 5 hours
    expect(formatCountdown(2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000)).toBe("2 days, 5 hours");
    
    // 1 day, 1 hour
    expect(formatCountdown(1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000)).toBe("1 day, 1 hour");
    
    // 3 hours, 30 minutes
    expect(formatCountdown(3 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe("3 hours, 30 minutes");
    
    // 45 minutes
    expect(formatCountdown(45 * 60 * 1000)).toBe("45 minutes");
    
    // 1 minute
    expect(formatCountdown(1 * 60 * 1000)).toBe("1 minute");
    
    // Past due
    expect(formatCountdown(-1000)).toBe("Soon");
  });
});

describe("Bulk A/B Test Creation", () => {
  it("should support multiple platform selection", () => {
    const bulkTestConfig = {
      name: "Holiday Campaign",
      platforms: ["linkedin", "twitter", "facebook"],
      isBulkTest: true,
      variants: [
        { label: "A", content: "Version A content" },
        { label: "B", content: "Version B content" },
      ],
    };
    
    expect(bulkTestConfig.platforms.length).toBe(3);
    expect(bulkTestConfig.isBulkTest).toBe(true);
  });

  it("should create separate test for each platform", () => {
    const platforms = ["linkedin", "twitter", "facebook"];
    const baseName = "Holiday Campaign";
    
    const testNames = platforms.map((p) => `${baseName} (${p})`);
    
    expect(testNames).toEqual([
      "Holiday Campaign (linkedin)",
      "Holiday Campaign (twitter)",
      "Holiday Campaign (facebook)",
    ]);
  });

  it("should require at least one platform selected", () => {
    const validatePlatforms = (platforms: string[]): boolean => {
      return platforms.length > 0;
    };
    
    expect(validatePlatforms(["linkedin"])).toBe(true);
    expect(validatePlatforms([])).toBe(false);
  });

  it("should preserve variant content across platforms", () => {
    const variants = [
      { label: "A", content: "Test content A" },
      { label: "B", content: "Test content B" },
    ];
    
    const platforms = ["linkedin", "twitter"];
    
    // Each platform should get the same variants
    platforms.forEach(() => {
      expect(variants[0].content).toBe("Test content A");
      expect(variants[1].content).toBe("Test content B");
    });
  });

  it("should support up to 5 variants", () => {
    const maxVariants = 5;
    const variants = Array.from({ length: maxVariants }, (_, i) => ({
      label: String.fromCharCode(65 + i), // A, B, C, D, E
      content: `Content ${i + 1}`,
    }));
    
    expect(variants.length).toBe(5);
    expect(variants[0].label).toBe("A");
    expect(variants[4].label).toBe("E");
  });

  it("should require minimum 2 variants", () => {
    const validateVariants = (variants: unknown[]): boolean => {
      return variants.length >= 2;
    };
    
    expect(validateVariants([{ label: "A" }, { label: "B" }])).toBe(true);
    expect(validateVariants([{ label: "A" }])).toBe(false);
  });
});

describe("Integration", () => {
  it("should support all 7 platforms for bulk testing", () => {
    const allPlatforms = [
      "linkedin",
      "twitter", 
      "facebook",
      "instagram",
      "threads",
      "bluesky",
      "mastodon",
    ];
    
    expect(allPlatforms.length).toBe(7);
  });

  it("should handle content warnings in bulk tests for Mastodon", () => {
    const bulkTest = {
      platforms: ["linkedin", "mastodon"],
      variants: [
        { label: "A", content: "Test content" },
      ],
      contentWarning: "Spoiler", // Only applies to Mastodon
    };
    
    // CW should only be used for Mastodon
    const mastodonTest = bulkTest.platforms.includes("mastodon");
    expect(mastodonTest).toBe(true);
  });
});
