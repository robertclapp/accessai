/**
 * A/B Test Insights Service
 * 
 * Generates AI-powered recommendations based on A/B test results
 * to help users improve their future content.
 * 
 * @module services/abTestInsights
 */

import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { PLATFORM_DISPLAY_NAMES } from "../../shared/constants";

// ============================================
// TYPES
// ============================================

export interface ABTestInsight {
  testId: number;
  testName: string;
  platform: string;
  winningVariantLabel: string;
  confidenceLevel: number;
  insights: InsightItem[];
  recommendations: string[];
  contentPatterns: ContentPattern[];
  generatedAt: Date;
}

export interface InsightItem {
  category: "content" | "timing" | "engagement" | "audience" | "format";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

export interface ContentPattern {
  pattern: string;
  frequency: "winner" | "loser" | "both";
  effect: "positive" | "negative" | "neutral";
}

// ============================================
// ANALYSIS HELPERS
// ============================================

/**
 * Analyze content differences between variants
 */
function analyzeContentDifferences(
  winnerContent: string,
  loserContent: string
): { winnerFeatures: string[]; loserFeatures: string[]; differences: string[] } {
  const winnerFeatures: string[] = [];
  const loserFeatures: string[] = [];
  const differences: string[] = [];
  
  // Check for emojis
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const winnerEmojis = (winnerContent.match(emojiRegex) || []).length;
  const loserEmojis = (loserContent.match(emojiRegex) || []).length;
  
  if (winnerEmojis > loserEmojis) {
    winnerFeatures.push(`More emojis (${winnerEmojis} vs ${loserEmojis})`);
    differences.push("Winner uses more emojis");
  } else if (loserEmojis > winnerEmojis) {
    loserFeatures.push(`More emojis (${loserEmojis} vs ${winnerEmojis})`);
    differences.push("Loser uses more emojis");
  }
  
  // Check for hashtags
  const hashtagRegex = /#\w+/g;
  const winnerHashtags = (winnerContent.match(hashtagRegex) || []).length;
  const loserHashtags = (loserContent.match(hashtagRegex) || []).length;
  
  if (winnerHashtags > loserHashtags) {
    winnerFeatures.push(`More hashtags (${winnerHashtags} vs ${loserHashtags})`);
    differences.push("Winner uses more hashtags");
  } else if (loserHashtags > winnerHashtags) {
    loserFeatures.push(`More hashtags (${loserHashtags} vs ${winnerHashtags})`);
    differences.push("Loser uses more hashtags");
  }
  
  // Check for questions
  const winnerQuestions = (winnerContent.match(/\?/g) || []).length;
  const loserQuestions = (loserContent.match(/\?/g) || []).length;
  
  if (winnerQuestions > loserQuestions) {
    winnerFeatures.push("Contains questions");
    differences.push("Winner asks more questions");
  } else if (loserQuestions > winnerQuestions) {
    loserFeatures.push("Contains questions");
    differences.push("Loser asks more questions");
  }
  
  // Check for calls to action
  const ctaPatterns = /\b(click|learn more|read more|check out|discover|try|get|join|sign up|subscribe|follow|share|comment|like)\b/gi;
  const winnerCTAs = (winnerContent.match(ctaPatterns) || []).length;
  const loserCTAs = (loserContent.match(ctaPatterns) || []).length;
  
  if (winnerCTAs > loserCTAs) {
    winnerFeatures.push("Stronger call to action");
    differences.push("Winner has clearer CTAs");
  } else if (loserCTAs > winnerCTAs) {
    loserFeatures.push("Stronger call to action");
    differences.push("Loser has clearer CTAs");
  }
  
  // Check content length
  const winnerLength = winnerContent.length;
  const loserLength = loserContent.length;
  
  if (winnerLength > loserLength * 1.2) {
    winnerFeatures.push(`Longer content (${winnerLength} chars)`);
    differences.push("Winner is significantly longer");
  } else if (loserLength > winnerLength * 1.2) {
    loserFeatures.push(`Longer content (${loserLength} chars)`);
    differences.push("Loser is significantly longer");
  }
  
  // Check for line breaks (formatting)
  const winnerLineBreaks = (winnerContent.match(/\n/g) || []).length;
  const loserLineBreaks = (loserContent.match(/\n/g) || []).length;
  
  if (winnerLineBreaks > loserLineBreaks) {
    winnerFeatures.push("Better formatting with line breaks");
    differences.push("Winner uses more line breaks for readability");
  } else if (loserLineBreaks > winnerLineBreaks) {
    loserFeatures.push("Better formatting with line breaks");
    differences.push("Loser uses more line breaks for readability");
  }
  
  return { winnerFeatures, loserFeatures, differences };
}

/**
 * Calculate engagement metrics comparison
 */
function compareEngagementMetrics(
  winnerVariant: { impressions: number; engagements: number; clicks: number; shares: number; comments: number; likes: number },
  loserVariant: { impressions: number; engagements: number; clicks: number; shares: number; comments: number; likes: number }
): InsightItem[] {
  const insights: InsightItem[] = [];
  
  const winnerEngRate = winnerVariant.impressions > 0 
    ? (winnerVariant.engagements / winnerVariant.impressions) * 100 
    : 0;
  const loserEngRate = loserVariant.impressions > 0 
    ? (loserVariant.engagements / loserVariant.impressions) * 100 
    : 0;
  
  const engRateDiff = winnerEngRate - loserEngRate;
  
  if (engRateDiff > 1) {
    insights.push({
      category: "engagement",
      title: "Significant Engagement Improvement",
      description: `The winning variant achieved ${engRateDiff.toFixed(1)}% higher engagement rate`,
      impact: engRateDiff > 2 ? "high" : "medium",
    });
  }
  
  // Compare specific metrics
  if (winnerVariant.clicks > loserVariant.clicks * 1.5) {
    insights.push({
      category: "engagement",
      title: "Higher Click-Through Rate",
      description: "The winning content drove significantly more clicks",
      impact: "high",
    });
  }
  
  if (winnerVariant.shares > loserVariant.shares * 1.5) {
    insights.push({
      category: "engagement",
      title: "More Shareable Content",
      description: "The winning variant was shared more often, indicating higher perceived value",
      impact: "high",
    });
  }
  
  if (winnerVariant.comments > loserVariant.comments * 1.5) {
    insights.push({
      category: "engagement",
      title: "Higher Conversation Starter",
      description: "The winning content sparked more discussions and comments",
      impact: "medium",
    });
  }
  
  return insights;
}

// ============================================
// AI GENERATION
// ============================================

/**
 * Generate AI-powered insights using LLM
 */
async function generateAIInsights(
  testName: string,
  platform: string,
  winnerContent: string,
  loserContent: string,
  winnerMetrics: { impressions: number; engagements: number; engagementRate: number },
  loserMetrics: { impressions: number; engagements: number; engagementRate: number },
  contentAnalysis: { winnerFeatures: string[]; loserFeatures: string[]; differences: string[] }
): Promise<{ recommendations: string[]; patterns: ContentPattern[] }> {
  const platformName = PLATFORM_DISPLAY_NAMES[platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform;
  
  const prompt = `Analyze this A/B test result for ${platformName} and provide actionable insights.

TEST: "${testName}"

WINNING VARIANT (${winnerMetrics.engagementRate.toFixed(2)}% engagement rate):
"${winnerContent}"

LOSING VARIANT (${loserMetrics.engagementRate.toFixed(2)}% engagement rate):
"${loserContent}"

CONTENT ANALYSIS:
- Winner features: ${contentAnalysis.winnerFeatures.join(", ") || "None identified"}
- Loser features: ${contentAnalysis.loserFeatures.join(", ") || "None identified"}
- Key differences: ${contentAnalysis.differences.join(", ") || "Minimal differences"}

Provide your analysis in the following JSON format:
{
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "Specific, actionable recommendation 3"
  ],
  "patterns": [
    {
      "pattern": "Description of a content pattern observed",
      "frequency": "winner" | "loser" | "both",
      "effect": "positive" | "negative" | "neutral"
    }
  ]
}

Focus on:
1. What made the winner more effective
2. Specific content elements to replicate
3. Platform-specific best practices for ${platformName}
4. Tone and messaging insights`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert social media analyst. Provide concise, actionable insights based on A/B test results. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ab_test_insights",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Actionable recommendations based on the test results",
              },
              patterns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pattern: { type: "string" },
                    frequency: { type: "string", enum: ["winner", "loser", "both"] },
                    effect: { type: "string", enum: ["positive", "negative", "neutral"] },
                  },
                  required: ["pattern", "frequency", "effect"],
                  additionalProperties: false,
                },
                description: "Content patterns observed in the variants",
              },
            },
            required: ["recommendations", "patterns"],
            additionalProperties: false,
          },
        },
      },
    });
    
    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : '';
    if (!content) {
      throw new Error("No response from LLM");
    }
    
    const parsed = JSON.parse(content);
    return {
      recommendations: parsed.recommendations || [],
      patterns: parsed.patterns || [],
    };
  } catch (error) {
    console.error("[ABTestInsights] Error generating AI insights:", error);
    
    // Return fallback insights based on content analysis
    return {
      recommendations: [
        contentAnalysis.differences.length > 0 
          ? `Focus on: ${contentAnalysis.differences[0]}`
          : "Continue testing to gather more data",
        "Replicate the winning variant's structure in future posts",
        `Optimize content for ${platformName}'s audience preferences`,
      ],
      patterns: contentAnalysis.winnerFeatures.map(feature => ({
        pattern: feature,
        frequency: "winner" as const,
        effect: "positive" as const,
      })),
    };
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Generate insights for a completed A/B test
 */
export async function generateTestInsights(
  testId: number,
  userId: number
): Promise<ABTestInsight | null> {
  // Get test with variants
  const testData = await db.getABTestWithVariants(testId, userId);
  
  if (!testData) {
    console.error("[ABTestInsights] Test not found:", testId);
    return null;
  }
  
  const { test, variants } = testData;
  
  // Ensure test is completed with a winner
  if (test.status !== "completed" || !test.winningVariantId) {
    console.error("[ABTestInsights] Test not completed or no winner:", testId);
    return null;
  }
  
  // Find winner and loser variants
  const winner = variants.find(v => v.id === test.winningVariantId);
  const loser = variants.find(v => v.id !== test.winningVariantId);
  
  if (!winner || !loser) {
    console.error("[ABTestInsights] Could not identify winner/loser variants");
    return null;
  }
  
  // Analyze content differences
  const contentAnalysis = analyzeContentDifferences(winner.content, loser.content);
  
  // Compare engagement metrics
  const engagementInsights = compareEngagementMetrics(
    {
      impressions: winner.impressions || 0,
      engagements: winner.engagements || 0,
      clicks: winner.clicks || 0,
      shares: winner.shares || 0,
      comments: winner.comments || 0,
      likes: winner.likes || 0,
    },
    {
      impressions: loser.impressions || 0,
      engagements: loser.engagements || 0,
      clicks: loser.clicks || 0,
      shares: loser.shares || 0,
      comments: loser.comments || 0,
      likes: loser.likes || 0,
    }
  );
  
  // Generate AI insights
  const aiInsights = await generateAIInsights(
    test.name,
    test.platform,
    winner.content,
    loser.content,
    {
      impressions: winner.impressions || 0,
      engagements: winner.engagements || 0,
      engagementRate: (winner.engagementRate || 0) / 100,
    },
    {
      impressions: loser.impressions || 0,
      engagements: loser.engagements || 0,
      engagementRate: (loser.engagementRate || 0) / 100,
    },
    contentAnalysis
  );
  
  // Build content pattern insights
  const contentInsights: InsightItem[] = [];
  
  if (contentAnalysis.winnerFeatures.length > 0) {
    contentInsights.push({
      category: "content",
      title: "Winning Content Elements",
      description: `The winner featured: ${contentAnalysis.winnerFeatures.join(", ")}`,
      impact: "high",
    });
  }
  
  if (contentAnalysis.differences.length > 0) {
    contentInsights.push({
      category: "content",
      title: "Key Differentiators",
      description: contentAnalysis.differences.join(". "),
      impact: "medium",
    });
  }
  
  return {
    testId,
    testName: test.name,
    platform: test.platform,
    winningVariantLabel: winner.label,
    confidenceLevel: test.confidenceLevel || 0,
    insights: [...contentInsights, ...engagementInsights],
    recommendations: aiInsights.recommendations,
    contentPatterns: aiInsights.patterns,
    generatedAt: new Date(),
  };
}

/**
 * Get cached insights or generate new ones
 */
export async function getTestInsights(
  testId: number,
  userId: number
): Promise<ABTestInsight | null> {
  // For now, always generate fresh insights
  // In production, you might want to cache these
  return generateTestInsights(testId, userId);
}

/**
 * Generate summary insights across multiple tests
 */
export async function generateCrossTestInsights(
  userId: number,
  platform?: string
): Promise<{
  totalTests: number;
  avgConfidence: number;
  topPatterns: ContentPattern[];
  generalRecommendations: string[];
}> {
  const tests = await db.getUserABTests(userId);
  
  const completedTests = tests.filter(t => 
    t.status === "completed" && 
    t.winningVariantId &&
    (!platform || t.platform === platform)
  );
  
  if (completedTests.length === 0) {
    return {
      totalTests: 0,
      avgConfidence: 0,
      topPatterns: [],
      generalRecommendations: [
        "Complete more A/B tests to gather insights",
        "Test different content formats and styles",
        "Experiment with posting times and hashtags",
      ],
    };
  }
  
  const avgConfidence = completedTests.reduce((sum, t) => sum + (t.confidenceLevel || 0), 0) / completedTests.length;
  
  // Aggregate patterns from all tests
  const allPatterns: ContentPattern[] = [];
  
  for (const test of completedTests.slice(0, 5)) { // Limit to recent 5 tests
    const insights = await generateTestInsights(test.id, userId);
    if (insights) {
      allPatterns.push(...insights.contentPatterns);
    }
  }
  
  // Find most common positive patterns
  const patternCounts = new Map<string, { count: number; pattern: ContentPattern }>();
  
  for (const pattern of allPatterns) {
    if (pattern.effect === "positive") {
      const key = pattern.pattern.toLowerCase();
      const existing = patternCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        patternCounts.set(key, { count: 1, pattern });
      }
    }
  }
  
  const topPatterns = Array.from(patternCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => p.pattern);
  
  return {
    totalTests: completedTests.length,
    avgConfidence,
    topPatterns,
    generalRecommendations: [
      topPatterns.length > 0 
        ? `Your winning posts often feature: ${topPatterns[0].pattern}`
        : "Keep testing to identify winning patterns",
      "Maintain consistency with elements that work",
      "Continue A/B testing to refine your content strategy",
    ],
  };
}


// ============================================
// A/B TEST HISTORY INSIGHTS
// ============================================

export interface HistoricalInsight {
  category: "content" | "timing" | "platform" | "engagement" | "strategy";
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  dataPoints: number;
  trend?: "improving" | "stable" | "declining";
}

export interface PlatformPerformance {
  platform: string;
  testsCompleted: number;
  avgConfidence: number;
  avgEngagementLift: number;
  winningPatterns: string[];
}

export interface TestHistoryInsights {
  userId: number;
  generatedAt: Date;
  summary: {
    totalTests: number;
    completedTests: number;
    avgConfidenceLevel: number;
    avgEngagementLift: number;
    mostTestedPlatform: string | null;
    bestPerformingPlatform: string | null;
  };
  platformBreakdown: PlatformPerformance[];
  historicalInsights: HistoricalInsight[];
  contentLearnings: {
    winningElements: { element: string; frequency: number; impact: string }[];
    losingElements: { element: string; frequency: number; impact: string }[];
  };
  recommendations: {
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    basedOn: string;
  }[];
  timeAnalysis: {
    bestDayOfWeek: string | null;
    bestTimeOfDay: string | null;
    testFrequency: number; // tests per month
  };
}

/**
 * Analyze content patterns across all completed tests
 */
function analyzeHistoricalPatterns(
  testsWithVariants: Array<{
    test: { id: number; name: string; platform: string; confidenceLevel: number | null; createdAt: Date };
    winnerContent: string;
    loserContent: string;
    engagementLift: number;
  }>
): {
  winningElements: { element: string; frequency: number; impact: string }[];
  losingElements: { element: string; frequency: number; impact: string }[];
} {
  const winningElements = new Map<string, { count: number; totalLift: number }>();
  const losingElements = new Map<string, { count: number; totalLift: number }>();
  
  for (const { winnerContent, loserContent, engagementLift } of testsWithVariants) {
    // Analyze winner content
    const winnerFeatures = extractContentFeatures(winnerContent);
    const loserFeatures = extractContentFeatures(loserContent);
    
    // Features unique to winner
    for (const feature of winnerFeatures) {
      if (!loserFeatures.includes(feature)) {
        const existing = winningElements.get(feature) || { count: 0, totalLift: 0 };
        existing.count++;
        existing.totalLift += engagementLift;
        winningElements.set(feature, existing);
      }
    }
    
    // Features unique to loser
    for (const feature of loserFeatures) {
      if (!winnerFeatures.includes(feature)) {
        const existing = losingElements.get(feature) || { count: 0, totalLift: 0 };
        existing.count++;
        existing.totalLift += engagementLift;
        losingElements.set(feature, existing);
      }
    }
  }
  
  // Convert to sorted arrays
  const sortedWinning = Array.from(winningElements.entries())
    .map(([element, data]) => ({
      element,
      frequency: data.count,
      impact: data.count > 0 ? `+${(data.totalLift / data.count).toFixed(1)}% avg lift` : "N/A",
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
  
  const sortedLosing = Array.from(losingElements.entries())
    .map(([element, data]) => ({
      element,
      frequency: data.count,
      impact: data.count > 0 ? `-${(data.totalLift / data.count).toFixed(1)}% avg lift` : "N/A",
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
  
  return {
    winningElements: sortedWinning,
    losingElements: sortedLosing,
  };
}

/**
 * Extract content features for pattern analysis
 */
export function extractContentFeatures(content: string): string[] {
  const features: string[] = [];
  
  // Check for emojis
  const emojiCount = (content.match(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g) || []).length;
  if (emojiCount > 0) features.push(`Emojis (${emojiCount})`);
  
  // Check for hashtags
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount > 0) features.push(`Hashtags (${hashtagCount})`);
  
  // Check for questions
  if (content.includes("?")) features.push("Questions");
  
  // Check for calls to action
  if (/\b(click|learn|read|check|discover|try|get|join|sign|subscribe|follow|share|comment|like)\b/i.test(content)) {
    features.push("Call to Action");
  }
  
  // Check for links
  if (/https?:\/\/\S+/i.test(content)) features.push("Links");
  
  // Check for mentions
  if (/@\w+/.test(content)) features.push("Mentions");
  
  // Check content length category
  if (content.length < 100) features.push("Short (< 100 chars)");
  else if (content.length < 280) features.push("Medium (100-280 chars)");
  else features.push("Long (> 280 chars)");
  
  // Check for line breaks (formatting)
  if ((content.match(/\n/g) || []).length > 2) features.push("Multi-paragraph");
  
  // Check for bullet points or lists
  if (/^[\-•*]\s/m.test(content)) features.push("Bullet Points");
  
  // Check for numbers/statistics
  if (/\d+%|\d+\s*(million|billion|thousand|k|m|b)/i.test(content)) features.push("Statistics");
  
  return features;
}

/**
 * Generate comprehensive historical insights for a user's A/B tests
 */
export async function generateTestHistoryInsights(
  userId: number
): Promise<TestHistoryInsights> {
  const tests = await db.getUserABTests(userId);
  
  const completedTests = tests.filter(t => t.status === "completed" && t.winningVariantId);
  
  // Initialize empty insights structure
  const insights: TestHistoryInsights = {
    userId,
    generatedAt: new Date(),
    summary: {
      totalTests: tests.length,
      completedTests: completedTests.length,
      avgConfidenceLevel: 0,
      avgEngagementLift: 0,
      mostTestedPlatform: null,
      bestPerformingPlatform: null,
    },
    platformBreakdown: [],
    historicalInsights: [],
    contentLearnings: {
      winningElements: [],
      losingElements: [],
    },
    recommendations: [],
    timeAnalysis: {
      bestDayOfWeek: null,
      bestTimeOfDay: null,
      testFrequency: 0,
    },
  };
  
  if (completedTests.length === 0) {
    insights.recommendations.push({
      priority: "high",
      title: "Start A/B Testing",
      description: "Run your first A/B test to begin gathering insights about what content resonates with your audience.",
      basedOn: "No completed tests",
    });
    return insights;
  }
  
  // Calculate summary statistics
  const totalConfidence = completedTests.reduce((sum, t) => sum + (t.confidenceLevel || 0), 0);
  insights.summary.avgConfidenceLevel = totalConfidence / completedTests.length;
  
  // Group by platform
  const platformGroups = new Map<string, typeof completedTests>();
  for (const test of completedTests) {
    const existing = platformGroups.get(test.platform) || [];
    existing.push(test);
    platformGroups.set(test.platform, existing);
  }
  
  // Find most tested platform
  let maxTests = 0;
  for (const [platform, platformTests] of Array.from(platformGroups.entries())) {
    if (platformTests.length > maxTests) {
      maxTests = platformTests.length;
      insights.summary.mostTestedPlatform = platform;
    }
  }
  
  // Analyze each platform
  const testsWithVariants: Array<{
    test: { id: number; name: string; platform: string; confidenceLevel: number | null; createdAt: Date };
    winnerContent: string;
    loserContent: string;
    engagementLift: number;
  }> = [];
  
  let bestPlatformLift = 0;
  
  for (const [platform, platformTests] of Array.from(platformGroups.entries())) {
    const platformInsights: PlatformPerformance = {
      platform,
      testsCompleted: platformTests.length,
      avgConfidence: platformTests.reduce((sum: number, t: { confidenceLevel: number | null }) => sum + (t.confidenceLevel || 0), 0) / platformTests.length,
      avgEngagementLift: 0,
      winningPatterns: [],
    };
    
    let totalLift = 0;
    const patterns = new Map<string, number>();
    
    for (const test of platformTests) {
      const testData = await db.getABTestWithVariants(test.id, userId);
      if (!testData) continue;
      
      const winner = testData.variants.find(v => v.id === test.winningVariantId);
      const loser = testData.variants.find(v => v.id !== test.winningVariantId);
      
      if (winner && loser) {
        const winnerRate = winner.engagementRate || 0;
        const loserRate = loser.engagementRate || 0;
        const lift = loserRate > 0 ? ((winnerRate - loserRate) / loserRate) * 100 : 0;
        
        totalLift += lift;
        
        testsWithVariants.push({
          test: {
            id: test.id,
            name: test.name,
            platform: test.platform,
            confidenceLevel: test.confidenceLevel,
            createdAt: test.createdAt,
          },
          winnerContent: winner.content,
          loserContent: loser.content,
          engagementLift: lift,
        });
        
        // Extract patterns from winner
        const features = extractContentFeatures(winner.content);
        for (const feature of features) {
          patterns.set(feature, (patterns.get(feature) || 0) + 1);
        }
      }
    }
    
    platformInsights.avgEngagementLift = platformTests.length > 0 ? totalLift / platformTests.length : 0;
    
    // Get top patterns for this platform
    platformInsights.winningPatterns = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
    
    insights.platformBreakdown.push(platformInsights);
    
    // Track best performing platform
    if (platformInsights.avgEngagementLift > bestPlatformLift) {
      bestPlatformLift = platformInsights.avgEngagementLift;
      insights.summary.bestPerformingPlatform = platform;
    }
  }
  
  // Calculate overall average engagement lift
  if (testsWithVariants.length > 0) {
    insights.summary.avgEngagementLift = testsWithVariants.reduce((sum, t) => sum + t.engagementLift, 0) / testsWithVariants.length;
  }
  
  // Analyze content patterns
  insights.contentLearnings = analyzeHistoricalPatterns(testsWithVariants);
  
  // Generate historical insights
  if (insights.contentLearnings.winningElements.length > 0) {
    const topWinner = insights.contentLearnings.winningElements[0];
    insights.historicalInsights.push({
      category: "content",
      title: "Top Winning Element",
      description: `"${topWinner.element}" appears in ${topWinner.frequency} winning variants with ${topWinner.impact}`,
      confidence: topWinner.frequency >= 3 ? "high" : topWinner.frequency >= 2 ? "medium" : "low",
      dataPoints: topWinner.frequency,
    });
  }
  
  if (insights.contentLearnings.losingElements.length > 0) {
    const topLoser = insights.contentLearnings.losingElements[0];
    insights.historicalInsights.push({
      category: "content",
      title: "Element to Avoid",
      description: `"${topLoser.element}" appears in ${topLoser.frequency} losing variants`,
      confidence: topLoser.frequency >= 3 ? "high" : topLoser.frequency >= 2 ? "medium" : "low",
      dataPoints: topLoser.frequency,
    });
  }
  
  // Platform-specific insights
  for (const platform of insights.platformBreakdown) {
    if (platform.testsCompleted >= 3) {
      insights.historicalInsights.push({
        category: "platform",
        title: `${PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform.platform} Performance`,
        description: `${platform.testsCompleted} tests completed with ${platform.avgEngagementLift.toFixed(1)}% average lift`,
        confidence: platform.testsCompleted >= 5 ? "high" : "medium",
        dataPoints: platform.testsCompleted,
        trend: platform.avgEngagementLift > 10 ? "improving" : platform.avgEngagementLift > 0 ? "stable" : "declining",
      });
    }
  }
  
  // Confidence level insight
  if (insights.summary.avgConfidenceLevel > 90) {
    insights.historicalInsights.push({
      category: "strategy",
      title: "High Confidence Tests",
      description: "Your tests consistently achieve high statistical confidence, indicating good sample sizes",
      confidence: "high",
      dataPoints: completedTests.length,
    });
  } else if (insights.summary.avgConfidenceLevel < 80) {
    insights.historicalInsights.push({
      category: "strategy",
      title: "Improve Test Confidence",
      description: "Consider running tests longer or with larger audiences to achieve higher confidence",
      confidence: "medium",
      dataPoints: completedTests.length,
    });
  }
  
  // Generate recommendations
  if (insights.contentLearnings.winningElements.length > 0) {
    insights.recommendations.push({
      priority: "high",
      title: "Replicate Winning Elements",
      description: `Include "${insights.contentLearnings.winningElements[0].element}" in your content - it consistently performs well`,
      basedOn: `${insights.contentLearnings.winningElements[0].frequency} winning variants`,
    });
  }
  
  if (insights.contentLearnings.losingElements.length > 0) {
    insights.recommendations.push({
      priority: "medium",
      title: "Avoid Underperforming Elements",
      description: `Consider reducing use of "${insights.contentLearnings.losingElements[0].element}" - it often appears in losing variants`,
      basedOn: `${insights.contentLearnings.losingElements[0].frequency} losing variants`,
    });
  }
  
  if (insights.summary.bestPerformingPlatform) {
    const bestPlatform = insights.platformBreakdown.find(p => p.platform === insights.summary.bestPerformingPlatform);
    if (bestPlatform && bestPlatform.winningPatterns.length > 0) {
      insights.recommendations.push({
        priority: "medium",
        title: `Optimize for ${PLATFORM_DISPLAY_NAMES[bestPlatform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || bestPlatform.platform}`,
        description: `Your best results come from this platform. Focus on: ${bestPlatform.winningPatterns.slice(0, 3).join(", ")}`,
        basedOn: `${bestPlatform.testsCompleted} completed tests`,
      });
    }
  }
  
  // Test frequency analysis
  if (completedTests.length >= 2) {
    const sortedByDate = [...completedTests].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const firstTest = new Date(sortedByDate[0].createdAt);
    const lastTest = new Date(sortedByDate[sortedByDate.length - 1].createdAt);
    const monthsDiff = Math.max(1, (lastTest.getTime() - firstTest.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    insights.timeAnalysis.testFrequency = completedTests.length / monthsDiff;
    
    if (insights.timeAnalysis.testFrequency < 2) {
      insights.recommendations.push({
        priority: "low",
        title: "Increase Testing Frequency",
        description: "Running more A/B tests will help you learn faster and optimize your content strategy",
        basedOn: `${insights.timeAnalysis.testFrequency.toFixed(1)} tests per month`,
      });
    }
  }
  
  return insights;
}
