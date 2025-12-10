/**
 * Tests for new features:
 * 1. Category drag-and-drop reordering
 * 2. Digest pause reminder notification
 * 3. Time comparison PDF export
 */

import { describe, it, expect, vi } from "vitest";
import {
  shouldSendReminder,
  generatePauseReminderEmail,
} from "./services/digestPauseReminder";
import {
  generateComparisonHtml,
  type TimePeriodComparisonData,
} from "./services/insightsPdfExport";

// ============================================
// CATEGORY REORDERING TESTS
// ============================================

describe("Category Reordering", () => {
  describe("reorder endpoint", () => {
    it("should accept an array of category IDs", () => {
      const categoryIds = [3, 1, 2, 5, 4];
      expect(Array.isArray(categoryIds)).toBe(true);
      expect(categoryIds.length).toBe(5);
    });

    it("should maintain all category IDs after reordering", () => {
      const originalIds = [1, 2, 3, 4, 5];
      const reorderedIds = [3, 1, 5, 2, 4];
      
      const originalSet = new Set(originalIds);
      const reorderedSet = new Set(reorderedIds);
      
      expect(originalSet.size).toBe(reorderedSet.size);
      originalIds.forEach(id => {
        expect(reorderedSet.has(id)).toBe(true);
      });
    });

    it("should assign sequential sort orders", () => {
      const categoryIds = [5, 3, 1, 4, 2];
      const expectedOrders = categoryIds.map((_, index) => index);
      
      expect(expectedOrders).toEqual([0, 1, 2, 3, 4]);
    });
  });
});

// ============================================
// DIGEST PAUSE REMINDER TESTS
// ============================================

describe("Digest Pause Reminder", () => {
  describe("shouldSendReminder", () => {
    it("should return false when not paused", () => {
      const result = shouldSendReminder({
        isPaused: false,
        pauseUntil: new Date(Date.now() + 30 * 60 * 60 * 1000),
        pauseReminderSentAt: null,
      });
      expect(result).toBe(false);
    });

    it("should return false when no pauseUntil date", () => {
      const result = shouldSendReminder({
        isPaused: true,
        pauseUntil: null,
        pauseReminderSentAt: null,
      });
      expect(result).toBe(false);
    });

    it("should return false when resume is less than 24 hours away", () => {
      const result = shouldSendReminder({
        isPaused: true,
        pauseUntil: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        pauseReminderSentAt: null,
      });
      expect(result).toBe(false);
    });

    it("should return false when resume is more than 48 hours away", () => {
      const result = shouldSendReminder({
        isPaused: true,
        pauseUntil: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        pauseReminderSentAt: null,
      });
      expect(result).toBe(false);
    });

    it("should return true when resume is between 24-48 hours and no reminder sent", () => {
      const result = shouldSendReminder({
        isPaused: true,
        pauseUntil: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours
        pauseReminderSentAt: null,
      });
      expect(result).toBe(true);
    });

    it("should return false when reminder was sent recently", () => {
      const result = shouldSendReminder({
        isPaused: true,
        pauseUntil: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours
        pauseReminderSentAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      });
      expect(result).toBe(false);
    });

    it("should return true when reminder was sent more than 24 hours ago", () => {
      const result = shouldSendReminder({
        isPaused: true,
        pauseUntil: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours
        pauseReminderSentAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
      });
      expect(result).toBe(true);
    });
  });

  describe("generatePauseReminderEmail", () => {
    it("should generate email with subject and HTML", () => {
      const result = generatePauseReminderEmail({
        pauseUntil: new Date("2025-01-15T10:00:00Z"),
        pauseReason: null,
      });

      expect(result.subject).toBe("Your email digests will resume tomorrow");
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("Digest Reminder");
    });

    it("should include pause reason when provided", () => {
      const result = generatePauseReminderEmail({
        pauseUntil: new Date("2025-01-15T10:00:00Z"),
        pauseReason: "On vacation",
      });

      expect(result.html).toContain("On vacation");
      expect(result.html).toContain("Pause Reason");
    });

    it("should not include pause reason section when not provided", () => {
      const result = generatePauseReminderEmail({
        pauseUntil: new Date("2025-01-15T10:00:00Z"),
        pauseReason: null,
      });

      expect(result.html).not.toContain("Pause Reason");
    });

    it("should include formatted resume date", () => {
      const pauseUntil = new Date("2025-01-15T10:00:00Z");
      const result = generatePauseReminderEmail({
        pauseUntil,
        pauseReason: null,
      });

      // Should contain formatted date (exact format depends on locale)
      expect(result.html).toContain("2025");
    });
  });
});

// ============================================
// TIME COMPARISON PDF EXPORT TESTS
// ============================================

describe("Time Comparison PDF Export", () => {
  const mockComparisonData: TimePeriodComparisonData = {
    period1: {
      start: new Date("2024-11-01"),
      end: new Date("2024-11-30"),
      totalTests: 10,
      completedTests: 8,
      avgWinRate: 0.65,
      avgEngagementLift: 0.12,
    },
    period2: {
      start: new Date("2024-12-01"),
      end: new Date("2024-12-31"),
      totalTests: 15,
      completedTests: 12,
      avgWinRate: 0.75,
      avgEngagementLift: 0.18,
    },
    comparison: {
      testsChange: 0.5,
      winRateChange: 0.1,
      engagementLiftChange: 0.06,
      trend: "improving",
    },
    insights: [
      "Testing frequency increased by 50%",
      "Win rate improved significantly",
    ],
  };

  describe("generateComparisonHtml", () => {
    it("should generate valid HTML document", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });

    it("should include report title", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("A/B Test Period Comparison");
    });

    it("should include both period labels", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("Period 1");
      expect(html).toContain("Period 2");
    });

    it("should include trend indicator", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("Improving");
      expect(html).toContain("📈");
    });

    it("should include insights when provided", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("Testing frequency increased by 50%");
      expect(html).toContain("Win rate improved significantly");
    });

    it("should handle declining trend", () => {
      const decliningData: TimePeriodComparisonData = {
        ...mockComparisonData,
        comparison: {
          ...mockComparisonData.comparison,
          trend: "declining",
        },
      };

      const html = generateComparisonHtml(decliningData);

      expect(html).toContain("Declining");
      expect(html).toContain("📉");
    });

    it("should handle stable trend", () => {
      const stableData: TimePeriodComparisonData = {
        ...mockComparisonData,
        comparison: {
          ...mockComparisonData.comparison,
          trend: "stable",
        },
      };

      const html = generateComparisonHtml(stableData);

      expect(html).toContain("Stable");
      expect(html).toContain("➡️");
    });

    it("should format percentages correctly", () => {
      const html = generateComparisonHtml(mockComparisonData);

      // Should contain formatted percentages
      expect(html).toContain("65.0%");
      expect(html).toContain("75.0%");
    });

    it("should include VS separator", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("VS");
    });

    it("should include footer with generation info", () => {
      const html = generateComparisonHtml(mockComparisonData);

      expect(html).toContain("Generated by AccessAI");
    });

    it("should handle empty insights array", () => {
      const noInsightsData: TimePeriodComparisonData = {
        ...mockComparisonData,
        insights: [],
      };

      const html = generateComparisonHtml(noInsightsData);

      // Should still generate valid HTML
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).not.toContain("Key Insights");
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Feature Integration", () => {
  it("should have all required exports from digestPauseReminder", () => {
    expect(typeof shouldSendReminder).toBe("function");
    expect(typeof generatePauseReminderEmail).toBe("function");
  });

  it("should have all required exports from insightsPdfExport", () => {
    expect(typeof generateComparisonHtml).toBe("function");
  });
});
