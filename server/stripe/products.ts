/**
 * Stripe Products Configuration
 * 
 * Centralized product and pricing definitions for AccessAI subscriptions.
 * These are used to create Stripe Checkout sessions and display pricing.
 */

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  features: string[];
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  popular?: boolean;
  limits: {
    postsPerMonth: number;
    socialAccounts: number;
    templates: number;
    knowledgeBaseItems: number;
    teamMembers: number;
    voiceMinutesPerMonth: number;
    imageGenerationsPerMonth: number;
  };
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started with accessible content creation",
    features: [
      "10 posts per month",
      "1 social account",
      "5 templates",
      "Basic accessibility checker",
      "10 knowledge base items",
      "5 minutes voice input/month",
      "5 AI image generations/month"
    ],
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      postsPerMonth: 10,
      socialAccounts: 1,
      templates: 5,
      knowledgeBaseItems: 10,
      teamMembers: 0,
      voiceMinutesPerMonth: 5,
      imageGenerationsPerMonth: 5
    }
  },
  {
    id: "creator",
    name: "Creator",
    description: "For content creators who want to scale their accessible content",
    features: [
      "Unlimited posts",
      "5 social accounts",
      "Unlimited templates",
      "Advanced accessibility checker with AI suggestions",
      "Unlimited knowledge base",
      "60 minutes voice input/month",
      "50 AI image generations/month",
      "Content calendar",
      "Analytics dashboard",
      "Priority support"
    ],
    priceMonthly: 19,
    priceYearly: 190, // ~17% discount
    popular: true,
    limits: {
      postsPerMonth: Infinity,
      socialAccounts: 5,
      templates: Infinity,
      knowledgeBaseItems: Infinity,
      teamMembers: 0,
      voiceMinutesPerMonth: 60,
      imageGenerationsPerMonth: 50
    }
  },
  {
    id: "pro",
    name: "Pro",
    description: "For teams and agencies creating accessible content at scale",
    features: [
      "Everything in Creator",
      "Unlimited social accounts",
      "Team collaboration (up to 5 members)",
      "Approval workflows",
      "White-label reports",
      "120 minutes voice input/month",
      "200 AI image generations/month",
      "API access",
      "Custom AI training",
      "Dedicated support"
    ],
    priceMonthly: 49,
    priceYearly: 490, // ~17% discount
    limits: {
      postsPerMonth: Infinity,
      socialAccounts: Infinity,
      templates: Infinity,
      knowledgeBaseItems: Infinity,
      teamMembers: 5,
      voiceMinutesPerMonth: 120,
      imageGenerationsPerMonth: 200
    }
  }
];

/**
 * Get a pricing tier by ID
 */
export function getPricingTier(tierId: string): PricingTier | undefined {
  return PRICING_TIERS.find(tier => tier.id === tierId);
}

/**
 * Check if a user's subscription allows a specific feature
 */
export function checkFeatureLimit(
  tierId: string,
  feature: keyof PricingTier["limits"],
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } {
  const tier = getPricingTier(tierId);
  if (!tier) {
    return { allowed: false, limit: 0, remaining: 0 };
  }
  
  const limit = tier.limits[feature];
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - currentUsage);
  const allowed = limit === Infinity || currentUsage < limit;
  
  return { allowed, limit, remaining };
}
