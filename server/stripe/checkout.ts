/**
 * Stripe Checkout Session Creation
 * 
 * Creates checkout sessions for subscription upgrades.
 */

import Stripe from "stripe";
import { PRICING_TIERS, getPricingTier } from "./products";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover"
});

interface CreateCheckoutSessionParams {
  userId: number;
  userEmail: string;
  userName?: string;
  tierId: "creator" | "pro";
  billingPeriod: "monthly" | "yearly";
  origin: string;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<string> {
  const { userId, userEmail, userName, tierId, billingPeriod, origin } = params;
  
  const tier = getPricingTier(tierId);
  if (!tier) {
    throw new Error(`Invalid tier: ${tierId}`);
  }
  
  // Get price based on billing period
  const priceId = billingPeriod === "yearly" 
    ? tier.stripePriceIdYearly 
    : tier.stripePriceIdMonthly;
  
  // If no Stripe price ID configured, create a dynamic price
  // In production, you would configure these in Stripe Dashboard
  const amount = billingPeriod === "yearly" ? tier.priceYearly : tier.priceMonthly;
  
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  
  if (priceId) {
    // Use pre-configured Stripe price
    lineItems = [{
      price: priceId,
      quantity: 1
    }];
  } else {
    // Create dynamic price (for development/testing)
    lineItems = [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `AccessAI ${tier.name} Plan`,
          description: tier.description,
          metadata: {
            tier_id: tierId
          }
        },
        unit_amount: amount * 100, // Convert to cents
        recurring: {
          interval: billingPeriod === "yearly" ? "year" : "month"
        }
      },
      quantity: 1
    }];
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    allow_promotion_codes: true,
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail,
      customer_name: userName || "",
      tier: tierId,
      billing_period: billingPeriod
    },
    subscription_data: {
      metadata: {
        user_id: userId.toString(),
        tier: tierId
      }
    },
    success_url: `${origin}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?canceled=true`
  });
  
  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }
  
  return session.url;
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 */
export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl
  });
  
  return session.url;
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subData = subscription as unknown as {
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
      items: { data: Array<{ price: { id: string } }> };
      metadata?: { tier?: string };
    };
    return {
      status: subData.status,
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end,
      priceId: subData.items.data[0]?.price.id,
      tier: subData.metadata?.tier || "unknown"
    };
  } catch {
    return null;
  }
}

export { stripe };
