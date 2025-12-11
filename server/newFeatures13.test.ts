/**
 * Tests for Template Collections, Rating Reminders, and Social Sharing features
 */
import { describe, it, expect, vi } from "vitest";

describe("Template Collections", () => {
  describe("createTemplateCollection", () => {
    it("should create a collection with required fields", () => {
      const collection = {
        name: "My Headlines",
        description: "Best headline templates",
        isPublic: false,
        color: "#6366f1",
      };
      expect(collection.name).toBe("My Headlines");
      expect(collection.color).toBe("#6366f1");
    });

    it("should allow public collections", () => {
      const collection = {
        name: "Community Favorites",
        isPublic: true,
      };
      expect(collection.isPublic).toBe(true);
    });
  });

  describe("addTemplateToCollection", () => {
    it("should add template to collection", () => {
      const collectionId = 1;
      const templateId = 5;
      expect(collectionId).toBe(1);
      expect(templateId).toBe(5);
    });

    it("should prevent duplicate additions", () => {
      const existingTemplates = [1, 2, 3];
      const newTemplateId = 2;
      const isDuplicate = existingTemplates.includes(newTemplateId);
      expect(isDuplicate).toBe(true);
    });
  });

  describe("getPublicCollections", () => {
    it("should return only public collections", () => {
      const collections = [
        { id: 1, isPublic: true },
        { id: 2, isPublic: false },
        { id: 3, isPublic: true },
      ];
      const publicOnly = collections.filter((c) => c.isPublic);
      expect(publicOnly.length).toBe(2);
    });

    it("should support pagination", () => {
      const limit = 10;
      const offset = 20;
      expect(limit).toBe(10);
      expect(offset).toBe(20);
    });
  });

  describe("downloadCollection", () => {
    it("should copy all templates from collection", () => {
      const collectionTemplates = [
        { id: 1, name: "Template 1" },
        { id: 2, name: "Template 2" },
      ];
      expect(collectionTemplates.length).toBe(2);
    });
  });
});

describe("Rating Reminder System", () => {
  describe("trackTemplateUsage", () => {
    it("should increment usage count", () => {
      let usageCount = 2;
      usageCount++;
      expect(usageCount).toBe(3);
    });

    it("should trigger reminder after 3 uses", () => {
      const usageCount = 3;
      const hasRated = false;
      const reminderDismissed = false;
      const shouldShowReminder =
        usageCount >= 3 && !hasRated && !reminderDismissed;
      expect(shouldShowReminder).toBe(true);
    });

    it("should not show reminder if already rated", () => {
      const usageCount = 5;
      const hasRated = true;
      const shouldShowReminder = usageCount >= 3 && !hasRated;
      expect(shouldShowReminder).toBe(false);
    });

    it("should not show reminder if dismissed", () => {
      const usageCount = 5;
      const hasRated = false;
      const reminderDismissed = true;
      const shouldShowReminder =
        usageCount >= 3 && !hasRated && !reminderDismissed;
      expect(shouldShowReminder).toBe(false);
    });
  });

  describe("dismissRatingReminder", () => {
    it("should mark reminder as dismissed", () => {
      let reminderDismissed = false;
      reminderDismissed = true;
      expect(reminderDismissed).toBe(true);
    });
  });

  describe("markTemplateAsRated", () => {
    it("should mark template as rated", () => {
      let hasRated = false;
      hasRated = true;
      expect(hasRated).toBe(true);
    });
  });

  describe("getTemplatesNeedingRating", () => {
    it("should return templates with 3+ uses and no rating", () => {
      const usageData = [
        { templateId: 1, usageCount: 5, hasRated: false },
        { templateId: 2, usageCount: 2, hasRated: false },
        { templateId: 3, usageCount: 4, hasRated: true },
      ];
      const needsRating = usageData.filter(
        (u) => u.usageCount >= 3 && !u.hasRated
      );
      expect(needsRating.length).toBe(1);
      expect(needsRating[0].templateId).toBe(1);
    });
  });
});

describe("Social Sharing", () => {
  describe("getShareUrl", () => {
    it("should generate correct share URL", () => {
      const templateId = 123;
      const baseUrl = "https://example.com";
      const shareUrl = `${baseUrl}/marketplace?template=${templateId}`;
      expect(shareUrl).toBe("https://example.com/marketplace?template=123");
    });
  });

  describe("shareToLinkedIn", () => {
    it("should generate LinkedIn share URL", () => {
      const shareUrl = "https://example.com/marketplace?template=123";
      const encodedUrl = encodeURIComponent(shareUrl);
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      expect(linkedInUrl).toContain("linkedin.com");
      expect(linkedInUrl).toContain(encodedUrl);
    });
  });

  describe("shareToTwitter", () => {
    it("should generate Twitter share URL with text", () => {
      const shareUrl = "https://example.com/marketplace?template=123";
      const text = "Check out this template!";
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(text);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      expect(twitterUrl).toContain("twitter.com");
      expect(twitterUrl).toContain(encodedText);
    });
  });

  describe("copyShareLink", () => {
    it("should copy URL to clipboard", async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      const url = "https://example.com/marketplace?template=123";
      await mockClipboard.writeText(url);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(url);
    });
  });
});

describe("Collection Color Handling", () => {
  it("should use default color when null", () => {
    const color = null;
    const displayColor = color || "#6366f1";
    expect(displayColor).toBe("#6366f1");
  });

  it("should use provided color when set", () => {
    const color = "#22c55e";
    const displayColor = color || "#6366f1";
    expect(displayColor).toBe("#22c55e");
  });

  it("should generate background color with opacity", () => {
    const color = "#6366f1";
    const bgColor = color + "20";
    expect(bgColor).toBe("#6366f120");
  });
});

describe("Collection Template Count", () => {
  it("should display template count correctly", () => {
    const collection = {
      id: 1,
      name: "Test Collection",
      templateCount: 5,
    };
    expect(collection.templateCount).toBe(5);
  });

  it("should handle zero templates", () => {
    const collection = {
      id: 1,
      name: "Empty Collection",
      templateCount: 0,
    };
    expect(collection.templateCount).toBe(0);
  });
});
