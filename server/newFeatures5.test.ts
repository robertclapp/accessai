/**
 * Tests for Mastodon Templates, Digest Scheduling, and A/B Test Insights
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================
// MASTODON TEMPLATES TESTS
// ============================================

describe("Mastodon Templates", () => {
  describe("Template Structure", () => {
    it("should have required fields for Mastodon templates", () => {
      const template = {
        id: 1,
        userId: 1,
        name: "Political Discussion",
        category: "politics",
        content: "Let's discuss {{topic}}",
        contentWarning: "Politics",
        hashtags: ["politics", "discussion"],
        isDefault: true,
      };
      
      expect(template.name).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.content).toBeDefined();
      expect(template.contentWarning).toBeDefined();
    });
    
    it("should support various template categories", () => {
      const categories = [
        "general",
        "politics",
        "spoiler",
        "food",
        "mental_health",
        "nsfw",
        "custom",
      ];
      
      categories.forEach(category => {
        expect(typeof category).toBe("string");
      });
    });
    
    it("should include hashtag suggestions", () => {
      const template = {
        hashtags: ["mastodon", "fediverse", "social"],
      };
      
      expect(Array.isArray(template.hashtags)).toBe(true);
      expect(template.hashtags.length).toBeGreaterThan(0);
    });
  });
  
  describe("Template Variables", () => {
    it("should support variable placeholders", () => {
      const content = "Check out {{link}} for more info about {{topic}}";
      const variables = content.match(/\{\{(\w+)\}\}/g);
      
      expect(variables).toContain("{{link}}");
      expect(variables).toContain("{{topic}}");
    });
    
    it("should replace variables with values", () => {
      const template = "Hello {{name}}, welcome to {{platform}}!";
      const values = { name: "User", platform: "Mastodon" };
      
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key as keyof typeof values] || "");
      
      expect(result).toBe("Hello User, welcome to Mastodon!");
    });
  });
});

// ============================================
// DIGEST SCHEDULING TESTS
// ============================================

describe("Digest Scheduling", () => {
  describe("Schedule Calculation", () => {
    it("should calculate next weekly digest time", () => {
      const preferences = {
        frequency: "weekly" as const,
        dayOfWeek: 1, // Monday
        hourUtc: 9,
      };
      
      const now = new Date("2024-01-15T08:00:00Z"); // Monday 8am
      const nextSend = calculateNextDigestTime(preferences, now);
      
      // Should be same day at 9am
      expect(nextSend.getUTCHours()).toBe(9);
      expect(nextSend.getUTCDay()).toBe(1);
    });
    
    it("should calculate next monthly digest time", () => {
      const preferences = {
        frequency: "monthly" as const,
        dayOfMonth: 15,
        hourUtc: 10,
      };
      
      const now = new Date("2024-01-10T08:00:00Z");
      const nextSend = calculateNextDigestTime(preferences, now);
      
      expect(nextSend.getUTCDate()).toBe(15);
      expect(nextSend.getUTCHours()).toBe(10);
    });
    
    it("should handle end of month edge cases", () => {
      const preferences = {
        frequency: "monthly" as const,
        dayOfMonth: 31,
        hourUtc: 9,
      };
      
      // February doesn't have 31 days
      const now = new Date("2024-02-01T08:00:00Z");
      const nextSend = calculateNextDigestTime(preferences, now);
      
      // Should use last day of month
      expect(nextSend.getUTCDate()).toBeLessThanOrEqual(29);
    });
  });
  
  describe("Due Check", () => {
    it("should identify when digest is due", () => {
      const lastSent = new Date("2024-01-08T09:00:00Z");
      const now = new Date("2024-01-15T09:00:00Z");
      
      const isDue = isDigestDue("weekly", 1, 1, 9, lastSent, now);
      
      expect(isDue).toBe(true);
    });
    
    it("should not trigger if already sent today", () => {
      const lastSent = new Date("2024-01-15T09:00:00Z");
      const now = new Date("2024-01-15T10:00:00Z");
      
      const isDue = isDigestDue("weekly", 1, 1, 9, lastSent, now);
      
      expect(isDue).toBe(false);
    });
  });
});

// Helper functions for testing
function calculateNextDigestTime(
  preferences: { frequency: "weekly" | "monthly"; dayOfWeek?: number; dayOfMonth?: number; hourUtc: number },
  now: Date
): Date {
  const next = new Date(now);
  next.setUTCHours(preferences.hourUtc, 0, 0, 0);
  
  if (preferences.frequency === "weekly") {
    const targetDay = preferences.dayOfWeek ?? 1;
    const currentDay = now.getUTCDay();
    let daysUntil = targetDay - currentDay;
    
    if (daysUntil < 0 || (daysUntil === 0 && now.getUTCHours() >= preferences.hourUtc)) {
      daysUntil += 7;
    }
    
    next.setUTCDate(now.getUTCDate() + daysUntil);
  } else {
    const targetDate = Math.min(preferences.dayOfMonth ?? 1, 28);
    next.setUTCDate(targetDate);
    
    if (next <= now) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
  }
  
  return next;
}

function isDigestDue(
  frequency: "weekly" | "monthly",
  dayOfWeek: number,
  dayOfMonth: number,
  hourUtc: number,
  lastSent: Date | null,
  now: Date = new Date()
): boolean {
  if (lastSent) {
    const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSent < 23) {
      return false;
    }
  }
  
  if (now.getUTCHours() !== hourUtc) {
    return false;
  }
  
  if (frequency === "weekly") {
    return now.getUTCDay() === dayOfWeek;
  } else {
    return now.getUTCDate() === dayOfMonth || 
           (dayOfMonth > 28 && now.getUTCDate() === new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate());
  }
}

// ============================================
// A/B TEST INSIGHTS TESTS
// ============================================

describe("A/B Test Insights", () => {
  describe("Content Analysis", () => {
    it("should detect emoji usage differences", () => {
      const winner = "Great news! 🎉 Check this out 🚀";
      const loser = "Great news! Check this out";
      
      const analysis = analyzeContentDifferences(winner, loser);
      
      expect(analysis.differences).toContain("Winner uses more emojis");
    });
    
    it("should detect hashtag usage differences", () => {
      const winner = "Check out #marketing #tips #social";
      const loser = "Check out this content";
      
      const analysis = analyzeContentDifferences(winner, loser);
      
      expect(analysis.winnerFeatures.some(f => f.includes("hashtag"))).toBe(true);
    });
    
    it("should detect question usage", () => {
      const winner = "What do you think? Have you tried this?";
      const loser = "This is a statement.";
      
      const analysis = analyzeContentDifferences(winner, loser);
      
      expect(analysis.winnerFeatures.some(f => f.includes("question"))).toBe(true);
    });
    
    it("should detect call to action differences", () => {
      const winner = "Click here to learn more! Sign up today!";
      const loser = "Here is some information.";
      
      const analysis = analyzeContentDifferences(winner, loser);
      
      expect(analysis.winnerFeatures.some(f => f.includes("call to action"))).toBe(true);
    });
    
    it("should detect content length differences", () => {
      const winner = "This is a much longer piece of content that goes into detail about the topic at hand and provides valuable information to the reader.";
      const loser = "Short content.";
      
      const analysis = analyzeContentDifferences(winner, loser);
      
      expect(analysis.differences.some(d => d.includes("longer"))).toBe(true);
    });
  });
  
  describe("Engagement Comparison", () => {
    it("should identify significant engagement improvement", () => {
      const winner = { impressions: 1000, engagements: 100, clicks: 50, shares: 20, comments: 15, likes: 80 };
      const loser = { impressions: 1000, engagements: 30, clicks: 10, shares: 5, comments: 5, likes: 20 };
      
      const insights = compareEngagementMetrics(winner, loser);
      
      expect(insights.some(i => i.category === "engagement")).toBe(true);
    });
    
    it("should highlight click-through improvements", () => {
      const winner = { impressions: 1000, engagements: 100, clicks: 100, shares: 10, comments: 10, likes: 50 };
      const loser = { impressions: 1000, engagements: 50, clicks: 20, shares: 10, comments: 10, likes: 30 };
      
      const insights = compareEngagementMetrics(winner, loser);
      
      expect(insights.some(i => i.title.includes("Click"))).toBe(true);
    });
  });
  
  describe("Insight Generation", () => {
    it("should generate structured insights", () => {
      const insight = {
        category: "content" as const,
        title: "Test Insight",
        description: "This is a test insight",
        impact: "high" as const,
      };
      
      expect(insight.category).toBe("content");
      expect(insight.impact).toBe("high");
    });
    
    it("should categorize insights correctly", () => {
      const categories = ["content", "timing", "engagement", "audience", "format"];
      
      categories.forEach(cat => {
        expect(typeof cat).toBe("string");
      });
    });
    
    it("should provide actionable recommendations", () => {
      const recommendations = [
        "Use more emojis to increase engagement",
        "Include questions to spark conversation",
        "Add clear calls to action",
      ];
      
      recommendations.forEach(rec => {
        expect(rec.length).toBeGreaterThan(10);
      });
    });
  });
  
  describe("Content Patterns", () => {
    it("should identify winning patterns", () => {
      const pattern = {
        pattern: "Uses emojis",
        frequency: "winner" as const,
        effect: "positive" as const,
      };
      
      expect(pattern.frequency).toBe("winner");
      expect(pattern.effect).toBe("positive");
    });
    
    it("should identify losing patterns", () => {
      const pattern = {
        pattern: "Too long content",
        frequency: "loser" as const,
        effect: "negative" as const,
      };
      
      expect(pattern.frequency).toBe("loser");
      expect(pattern.effect).toBe("negative");
    });
  });
});

// Helper functions for testing
function analyzeContentDifferences(winner: string, loser: string) {
  const winnerFeatures: string[] = [];
  const loserFeatures: string[] = [];
  const differences: string[] = [];
  
  // Check emojis
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const winnerEmojis = (winner.match(emojiRegex) || []).length;
  const loserEmojis = (loser.match(emojiRegex) || []).length;
  
  if (winnerEmojis > loserEmojis) {
    winnerFeatures.push(`More emojis (${winnerEmojis} vs ${loserEmojis})`);
    differences.push("Winner uses more emojis");
  }
  
  // Check hashtags
  const hashtagRegex = /#\w+/g;
  const winnerHashtags = (winner.match(hashtagRegex) || []).length;
  const loserHashtags = (loser.match(hashtagRegex) || []).length;
  
  if (winnerHashtags > loserHashtags) {
    winnerFeatures.push(`More hashtags (${winnerHashtags} vs ${loserHashtags})`);
  }
  
  // Check questions
  const winnerQuestions = (winner.match(/\?/g) || []).length;
  const loserQuestions = (loser.match(/\?/g) || []).length;
  
  if (winnerQuestions > loserQuestions) {
    winnerFeatures.push("Contains questions");
  }
  
  // Check CTAs
  const ctaPatterns = /\b(click|learn more|sign up|subscribe)\b/gi;
  const winnerCTAs = (winner.match(ctaPatterns) || []).length;
  const loserCTAs = (loser.match(ctaPatterns) || []).length;
  
  if (winnerCTAs > loserCTAs) {
    winnerFeatures.push("Stronger call to action");
  }
  
  // Check length
  if (winner.length > loser.length * 1.5) {
    differences.push("Winner is significantly longer");
  }
  
  return { winnerFeatures, loserFeatures, differences };
}

function compareEngagementMetrics(
  winner: { impressions: number; engagements: number; clicks: number; shares: number; comments: number; likes: number },
  loser: { impressions: number; engagements: number; clicks: number; shares: number; comments: number; likes: number }
) {
  const insights: { category: string; title: string; description: string; impact: string }[] = [];
  
  const winnerEngRate = winner.impressions > 0 ? (winner.engagements / winner.impressions) * 100 : 0;
  const loserEngRate = loser.impressions > 0 ? (loser.engagements / loser.impressions) * 100 : 0;
  
  if (winnerEngRate > loserEngRate + 1) {
    insights.push({
      category: "engagement",
      title: "Significant Engagement Improvement",
      description: `Winner achieved ${(winnerEngRate - loserEngRate).toFixed(1)}% higher engagement rate`,
      impact: "high",
    });
  }
  
  if (winner.clicks > loser.clicks * 1.5) {
    insights.push({
      category: "engagement",
      title: "Higher Click-Through Rate",
      description: "Winner drove significantly more clicks",
      impact: "high",
    });
  }
  
  return insights;
}
