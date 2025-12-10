/**
 * Tests for statistical significance calculation
 * Separate file to avoid mocking conflicts
 */

import { describe, it, expect } from "vitest";
import { calculateStatisticalSignificance } from "./db";

describe("Statistical Significance Calculation", () => {
  it("should calculate significance for high difference", () => {
    const confidence = calculateStatisticalSignificance(
      { impressions: 1000, engagements: 100 },
      { impressions: 1000, engagements: 50 }
    );
    expect(confidence).toBeGreaterThan(90);
  });

  it("should return low confidence for similar results", () => {
    const confidence = calculateStatisticalSignificance(
      { impressions: 1000, engagements: 100 },
      { impressions: 1000, engagements: 98 }
    );
    expect(confidence).toBeLessThan(90);
  });

  it("should return 0 for insufficient data", () => {
    const confidence = calculateStatisticalSignificance(
      { impressions: 10, engagements: 1 },
      { impressions: 10, engagements: 2 }
    );
    expect(confidence).toBe(0);
  });

  it("should handle zero impressions", () => {
    const confidence = calculateStatisticalSignificance(
      { impressions: 0, engagements: 0 },
      { impressions: 0, engagements: 0 }
    );
    expect(confidence).toBe(0);
  });

  it("should return 99% for very high z-score", () => {
    const confidence = calculateStatisticalSignificance(
      { impressions: 10000, engagements: 2000 },
      { impressions: 10000, engagements: 500 }
    );
    expect(confidence).toBe(99);
  });
});
