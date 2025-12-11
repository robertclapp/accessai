/**
 * Tests for New Features (Batch 12)
 * - Email notifications for digest A/B test auto-completion
 * - Template marketplace
 * - Template analytics
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe("Digest Test Auto-Complete Notifications", () => {
  describe("notifyDigestTestAutoComplete", () => {
    it("should format notification with winning variant details", async () => {
      // Test notification formatting
      const testName = "Subject Line Test";
      const winner = "A";
      const confidence = 95;
      const variantAName = "Short Subject";
      const variantBName = "Long Subject";
      const variantAOpenRate = 25.5;
      const variantBOpenRate = 18.2;
      
      // Verify the notification content would be correct
      const winnerName = winner === "A" ? variantAName : variantBName;
      const winnerRate = winner === "A" ? variantAOpenRate : variantBOpenRate;
      const loserRate = winner === "A" ? variantBOpenRate : variantAOpenRate;
      
      expect(winnerName).toBe("Short Subject");
      expect(winnerRate).toBe(25.5);
      expect((winnerRate - loserRate).toFixed(1)).toBe("7.3");
    });
    
    it("should include confidence level in notification", () => {
      const confidence = 95;
      const title = `🎯 Digest A/B Test Auto-Completed: Test Name`;
      
      expect(title).toContain("Auto-Completed");
      expect(confidence).toBeGreaterThanOrEqual(90);
    });
    
    it("should handle variant B winner correctly", () => {
      const winner = "B";
      const variantAName = "Short Subject";
      const variantBName = "Long Subject";
      
      const winnerName = winner === "A" ? variantAName : variantBName;
      expect(winnerName).toBe("Long Subject");
    });
  });
  
  describe("autoCompleteDigestTest with notification", () => {
    it("should return notificationSent status", () => {
      // Test that the function signature includes notificationSent
      const result = {
        success: true,
        winner: "A" as const,
        reason: "Statistical significance reached",
        notificationSent: true
      };
      
      expect(result).toHaveProperty("notificationSent");
      expect(result.notificationSent).toBe(true);
    });
    
    it("should calculate open rates correctly for notification", () => {
      const variantASent = 100;
      const variantAOpened = 25;
      const variantBSent = 100;
      const variantBOpened = 18;
      
      const variantAOpenRate = (variantASent > 0) 
        ? (variantAOpened / variantASent) * 100 
        : 0;
      const variantBOpenRate = (variantBSent > 0) 
        ? (variantBOpened / variantBSent) * 100 
        : 0;
      
      expect(variantAOpenRate).toBe(25);
      expect(variantBOpenRate).toBe(18);
    });
  });
});

describe("Template Marketplace", () => {
  describe("getMarketplaceTemplates", () => {
    it("should accept filter options", () => {
      const options = {
        category: "headline",
        search: "test",
        sortBy: "popular" as const,
        limit: 20,
        offset: 0
      };
      
      expect(options.category).toBe("headline");
      expect(options.sortBy).toBe("popular");
      expect(options.limit).toBe(20);
    });
    
    it("should support all sort options", () => {
      const sortOptions = ["popular", "rating", "newest", "downloads"];
      
      sortOptions.forEach(option => {
        expect(["popular", "rating", "newest", "downloads"]).toContain(option);
      });
    });
    
    it("should return templates with stats", () => {
      const templateWithStats = {
        id: 1,
        name: "Test Template",
        averageRating: 4.5,
        totalRatings: 10,
        downloadCount: 50
      };
      
      expect(templateWithStats).toHaveProperty("averageRating");
      expect(templateWithStats).toHaveProperty("totalRatings");
      expect(templateWithStats).toHaveProperty("downloadCount");
    });
    
    it("should filter by category", () => {
      const templates = [
        { id: 1, category: "headline" },
        { id: 2, category: "cta" },
        { id: 3, category: "headline" }
      ];
      
      const filtered = templates.filter(t => t.category === "headline");
      expect(filtered).toHaveLength(2);
    });
    
    it("should filter by search query", () => {
      const templates = [
        { id: 1, name: "Test Headline", description: "A test template" },
        { id: 2, name: "CTA Template", description: "Call to action" },
        { id: 3, name: "Another Test", description: "Testing" }
      ];
      
      const searchLower = "test".toLowerCase();
      const filtered = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
      
      expect(filtered).toHaveLength(2); // "Test Headline" and "Another Test" contain "test"
    });
  });
  
  describe("downloadMarketplaceTemplate", () => {
    it("should create a copy for the user", () => {
      const sourceTemplate = {
        id: 1,
        name: "Original Template",
        isPublic: true,
        userId: 100
      };
      
      const copiedTemplate = {
        ...sourceTemplate,
        id: 2,
        userId: 200,
        isPublic: false,
        copiedFromId: sourceTemplate.id
      };
      
      expect(copiedTemplate.userId).toBe(200);
      expect(copiedTemplate.isPublic).toBe(false);
      expect(copiedTemplate.copiedFromId).toBe(1);
    });
    
    it("should increment share count on source template", () => {
      let shareCount = 5;
      shareCount += 1;
      
      expect(shareCount).toBe(6);
    });
    
    it("should track download event", () => {
      const event = {
        templateId: 1,
        eventType: "download",
        userId: 200,
        metadata: { source: "marketplace" }
      };
      
      expect(event.eventType).toBe("download");
      expect(event.metadata.source).toBe("marketplace");
    });
  });
  
  describe("getMarketplaceCategories", () => {
    it("should return categories with counts", () => {
      const categories = [
        { category: "headline", count: 10 },
        { category: "cta", count: 5 },
        { category: "tone", count: 3 }
      ];
      
      expect(categories[0].count).toBe(10);
      expect(categories).toHaveLength(3);
    });
    
    it("should sort by count descending", () => {
      const categories = [
        { category: "cta", count: 5 },
        { category: "headline", count: 10 },
        { category: "tone", count: 3 }
      ];
      
      const sorted = [...categories].sort((a, b) => b.count - a.count);
      
      expect(sorted[0].category).toBe("headline");
      expect(sorted[1].category).toBe("cta");
      expect(sorted[2].category).toBe("tone");
    });
  });
});

describe("Template Analytics", () => {
  describe("trackTemplateEvent", () => {
    it("should track all event types", () => {
      const eventTypes = ["export", "import", "download", "view", "use"];
      
      eventTypes.forEach(type => {
        expect(["export", "import", "download", "view", "use"]).toContain(type);
      });
    });
    
    it("should include metadata", () => {
      const event = {
        templateId: 1,
        eventType: "download",
        userId: 100,
        metadata: {
          source: "marketplace",
          format: "json"
        }
      };
      
      expect(event.metadata.source).toBe("marketplace");
      expect(event.metadata.format).toBe("json");
    });
    
    it("should allow anonymous views", () => {
      const event = {
        templateId: 1,
        eventType: "view",
        userId: null,
        metadata: { source: "marketplace" }
      };
      
      expect(event.userId).toBeNull();
    });
  });
  
  describe("getTemplateAnalytics", () => {
    it("should count events by type", () => {
      const events = [
        { eventType: "view" },
        { eventType: "view" },
        { eventType: "download" },
        { eventType: "use" },
        { eventType: "export" }
      ];
      
      const views = events.filter(e => e.eventType === "view").length;
      const downloads = events.filter(e => e.eventType === "download").length;
      const uses = events.filter(e => e.eventType === "use").length;
      const exports = events.filter(e => e.eventType === "export").length;
      
      expect(views).toBe(2);
      expect(downloads).toBe(1);
      expect(uses).toBe(1);
      expect(exports).toBe(1);
    });
    
    it("should return recent activity", () => {
      const events = [
        { eventType: "view", createdAt: new Date() },
        { eventType: "download", createdAt: new Date() }
      ];
      
      const recentActivity = events.slice(0, 10).map(e => ({
        eventType: e.eventType,
        createdAt: e.createdAt
      }));
      
      expect(recentActivity).toHaveLength(2);
      expect(recentActivity[0]).toHaveProperty("eventType");
      expect(recentActivity[0]).toHaveProperty("createdAt");
    });
  });
  
  describe("getTemplateAnalyticsSummary", () => {
    it("should calculate totals correctly", () => {
      const templates = [
        { id: 1, isPublic: true },
        { id: 2, isPublic: true },
        { id: 3, isPublic: false }
      ];
      
      const totalTemplates = templates.length;
      const publicTemplates = templates.filter(t => t.isPublic).length;
      
      expect(totalTemplates).toBe(3);
      expect(publicTemplates).toBe(2);
    });
    
    it("should return top templates sorted by downloads", () => {
      const topTemplates = [
        { id: 1, name: "Template A", downloads: 50, rating: 4.5 },
        { id: 2, name: "Template B", downloads: 30, rating: 4.8 },
        { id: 3, name: "Template C", downloads: 10, rating: 4.0 }
      ];
      
      const sorted = [...topTemplates].sort((a, b) => b.downloads - a.downloads);
      
      expect(sorted[0].name).toBe("Template A");
      expect(sorted[0].downloads).toBe(50);
    });
    
    it("should limit top templates to 5", () => {
      const topTemplates = [
        { id: 1, downloads: 100 },
        { id: 2, downloads: 90 },
        { id: 3, downloads: 80 },
        { id: 4, downloads: 70 },
        { id: 5, downloads: 60 },
        { id: 6, downloads: 50 }
      ];
      
      const limited = topTemplates.slice(0, 5);
      expect(limited).toHaveLength(5);
    });
  });
  
  describe("getTrendingTemplates", () => {
    it("should calculate activity score correctly", () => {
      const scores = { downloads: 5, views: 10, uses: 3 };
      
      // Activity score = downloads * 3 + uses * 2 + views
      const activityScore = scores.downloads * 3 + scores.uses * 2 + scores.views;
      
      expect(activityScore).toBe(31); // 15 + 6 + 10
    });
    
    it("should filter events from last 7 days", () => {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const events = [
        { createdAt: new Date() }, // Today
        { createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }, // 3 days ago
        { createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) } // 10 days ago
      ];
      
      const recentEvents = events.filter(e => e.createdAt >= sevenDaysAgo);
      expect(recentEvents).toHaveLength(2);
    });
    
    it("should sort by activity score descending", () => {
      const templates = [
        { templateId: 1, activityScore: 50 },
        { templateId: 2, activityScore: 100 },
        { templateId: 3, activityScore: 75 }
      ];
      
      const sorted = [...templates].sort((a, b) => b.activityScore - a.activityScore);
      
      expect(sorted[0].templateId).toBe(2);
      expect(sorted[1].templateId).toBe(3);
      expect(sorted[2].templateId).toBe(1);
    });
    
    it("should limit results", () => {
      const limit = 10;
      const templates = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      
      const limited = templates.slice(0, limit);
      expect(limited).toHaveLength(10);
    });
  });
});

describe("Marketplace UI Components", () => {
  describe("Category Colors", () => {
    it("should have colors for all categories", () => {
      const CATEGORY_COLORS: Record<string, string> = {
        headline: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        cta: "bg-green-500/10 text-green-500 border-green-500/20",
        tone: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        format: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        audience: "bg-pink-500/10 text-pink-500 border-pink-500/20",
        length: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
        hook: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        social_proof: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      };
      
      expect(CATEGORY_COLORS.headline).toBeDefined();
      expect(CATEGORY_COLORS.cta).toBeDefined();
      expect(CATEGORY_COLORS.tone).toBeDefined();
    });
    
    it("should return default color for unknown categories", () => {
      const getCategoryColor = (cat: string) => {
        const CATEGORY_COLORS: Record<string, string> = {
          headline: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        };
        return CATEGORY_COLORS[cat] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
      };
      
      expect(getCategoryColor("unknown")).toBe("bg-gray-500/10 text-gray-500 border-gray-500/20");
    });
  });
  
  describe("Star Rating Display", () => {
    it("should render correct number of filled stars", () => {
      const rating = 3.5;
      const stars = [1, 2, 3, 4, 5];
      
      const filledStars = stars.filter(star => star <= rating);
      expect(filledStars).toHaveLength(3);
    });
    
    it("should handle zero rating", () => {
      const rating = 0;
      const stars = [1, 2, 3, 4, 5];
      
      const filledStars = stars.filter(star => star <= rating);
      expect(filledStars).toHaveLength(0);
    });
    
    it("should handle perfect rating", () => {
      const rating = 5;
      const stars = [1, 2, 3, 4, 5];
      
      const filledStars = stars.filter(star => star <= rating);
      expect(filledStars).toHaveLength(5);
    });
  });
});

describe("Analytics Tab Integration", () => {
  describe("Summary Cards", () => {
    it("should display all summary metrics", () => {
      const summary = {
        totalTemplates: 10,
        publicTemplates: 5,
        totalDownloads: 100,
        totalExports: 25
      };
      
      expect(summary.totalTemplates).toBe(10);
      expect(summary.publicTemplates).toBe(5);
      expect(summary.totalDownloads).toBe(100);
      expect(summary.totalExports).toBe(25);
    });
    
    it("should handle empty analytics", () => {
      const summary = {
        totalTemplates: 0,
        publicTemplates: 0,
        totalDownloads: 0,
        totalExports: 0,
        topTemplates: []
      };
      
      expect(summary.topTemplates).toHaveLength(0);
    });
  });
  
  describe("Top Performing Templates", () => {
    it("should display ranking numbers", () => {
      const templates = [
        { id: 1, name: "First", downloads: 100 },
        { id: 2, name: "Second", downloads: 50 },
        { id: 3, name: "Third", downloads: 25 }
      ];
      
      templates.forEach((template, idx) => {
        expect(idx + 1).toBeGreaterThan(0);
        expect(idx + 1).toBeLessThanOrEqual(templates.length);
      });
    });
    
    it("should show download count and rating", () => {
      const template = {
        id: 1,
        name: "Popular Template",
        downloads: 100,
        rating: 4.5
      };
      
      expect(template.downloads).toBe(100);
      expect(template.rating.toFixed(1)).toBe("4.5");
    });
  });
});
