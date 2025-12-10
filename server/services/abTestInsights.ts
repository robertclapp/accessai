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
