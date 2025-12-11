/**
 * Digest A/B Test Auto-Complete Service
 * 
 * Automatically determines when digest A/B tests have reached
 * statistical significance and declares winners.
 */

import { digestABTests } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Calculate z-score for comparing two proportions
 */
export function calculateZScore(
  successA: number,
  totalA: number,
  successB: number,
  totalB: number
): number {
  if (totalA === 0 || totalB === 0) return 0;
  
  const pA = successA / totalA;
  const pB = successB / totalB;
  const pPooled = (successA + successB) / (totalA + totalB);
  
  if (pPooled === 0 || pPooled === 1) return 0;
  
  const standardError = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / totalA + 1 / totalB)
  );
  
  if (standardError === 0) return 0;
  
  return (pA - pB) / standardError;
}

/**
 * Convert z-score to p-value (two-tailed)
 */
export function zScoreToPValue(zScore: number): number {
  // Approximation of the cumulative normal distribution
  const absZ = Math.abs(zScore);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  // Two-tailed p-value
  return 2 * p;
}

/**
 * Check if result is statistically significant
 */
export function isStatisticallySignificant(
  successA: number,
  totalA: number,
  successB: number,
  totalB: number,
  confidenceLevel: number = 0.95
): { significant: boolean; pValue: number; zScore: number; confidenceLevel: number } {
  const zScore = calculateZScore(successA, totalA, successB, totalB);
  const pValue = zScoreToPValue(zScore);
  const alpha = 1 - confidenceLevel;
  
  return {
    significant: pValue < alpha,
    pValue,
    zScore,
    confidenceLevel
  };
}

/**
 * Determine the winner based on open rates
 */
export function determineWinner(
  opensA: number,
  sendsA: number,
  opensB: number,
  sendsB: number
): "A" | "B" | null {
  if (sendsA === 0 && sendsB === 0) return null;
  
  const rateA = sendsA > 0 ? opensA / sendsA : 0;
  const rateB = sendsB > 0 ? opensB / sendsB : 0;
  
  if (rateA > rateB) return "A";
  if (rateB > rateA) return "B";
  return null;
}

/**
 * Calculate minimum sample size needed for significance
 */
export function calculateMinSampleSize(
  baselineRate: number = 0.2, // 20% baseline open rate
  minimumDetectableEffect: number = 0.05, // 5% improvement
  power: number = 0.8,
  alpha: number = 0.05
): number {
  // Using simplified formula for sample size calculation
  const zAlpha = 1.96; // For 95% confidence
  const zBeta = 0.84; // For 80% power
  
  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pBar = (p1 + p2) / 2;
  
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + 
                              zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(p2 - p1, 2);
  
  return Math.ceil(numerator / denominator);
}

/**
 * Check and auto-complete a digest A/B test
 */
export async function checkAndAutoCompleteTest(testId: number): Promise<{
  completed: boolean;
  winner: "A" | "B" | null;
  significance: {
    significant: boolean;
    pValue: number;
    zScore: number;
    confidenceLevel: number;
  } | null;
}> {
  const { getDb } = await import("../db");
  const database = await getDb();
  if (!database) {
    return { completed: false, winner: null, significance: null };
  }
  const [test] = await database
    .select()
    .from(digestABTests)
    .where(eq(digestABTests.id, testId));
  
  if (!test || test.status !== "running") {
    return { completed: false, winner: null, significance: null };
  }
  
  const opensA = test.variantAOpened || 0;
  const sendsA = test.variantASent || 0;
  const opensB = test.variantBOpened || 0;
  const sendsB = test.variantBSent || 0;
  
  // Minimum sample size check (at least 30 sends per variant)
  const minSampleSize = 30;
  if (sendsA < minSampleSize || sendsB < minSampleSize) {
    return { completed: false, winner: null, significance: null };
  }
  
  const significance = isStatisticallySignificant(opensA, sendsA, opensB, sendsB);
  
  if (significance.significant) {
    const winner = determineWinner(opensA, sendsA, opensB, sendsB);
    
    // Auto-complete the test
    if (database) {
      await database
        .update(digestABTests)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(digestABTests.id, testId));
    }
    
    return { completed: true, winner, significance };
  }
  
  return { completed: false, winner: null, significance };
}

/**
 * Get test statistics with significance info
 */
export function getTestStatistics(
  opensA: number,
  sendsA: number,
  opensB: number,
  sendsB: number
): {
  rateA: number;
  rateB: number;
  difference: number;
  relativeImprovement: number;
  significance: {
    significant: boolean;
    pValue: number;
    zScore: number;
    confidenceLevel: number;
  };
  minSampleSize: number;
  currentSampleSize: number;
  progressToSignificance: number;
} {
  const rateA = sendsA > 0 ? opensA / sendsA : 0;
  const rateB = sendsB > 0 ? opensB / sendsB : 0;
  const difference = rateB - rateA;
  const relativeImprovement = rateA > 0 ? (rateB - rateA) / rateA : 0;
  
  const significance = isStatisticallySignificant(opensA, sendsA, opensB, sendsB);
  const minSampleSize = calculateMinSampleSize(Math.max(rateA, rateB, 0.1));
  const currentSampleSize = Math.min(sendsA, sendsB);
  const progressToSignificance = Math.min(currentSampleSize / minSampleSize, 1);
  
  return {
    rateA,
    rateB,
    difference,
    relativeImprovement,
    significance,
    minSampleSize,
    currentSampleSize,
    progressToSignificance
  };
}
