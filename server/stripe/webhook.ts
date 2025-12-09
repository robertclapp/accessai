/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for payment processing.
 * Verifies webhook signatures and processes payment events.
 */

import Stripe from "stripe";
import { Request, Response } from "express";
import { notifyOwner } from "../_core/notification";
import * as db from "../db";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover"
});

/**
 * Webhook handler for Stripe events
 * Must be registered with express.raw({ type: 'application/json' }) BEFORE express.json()
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[Stripe Webhook] Missing signature or webhook secret");
    return res.status(400).json({ error: "Missing signature or webhook secret" });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
  }

  // Handle test events - CRITICAL for webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, message);
    return res.status(500).json({ error: message });
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerEmail = session.metadata?.customer_email || session.customer_email;
  const customerName = session.metadata?.customer_name;

  console.log(`[Stripe] Checkout completed for user ${userId}`);

  if (userId) {
    // Update user's Stripe customer ID
    const customerId = typeof session.customer === "string" 
      ? session.customer 
      : session.customer?.id;

    if (customerId) {
      await db.updateUserSubscription(parseInt(userId), { stripeCustomerId: customerId });
    }

    // If this is a subscription checkout, the subscription webhook will handle tier update
    if (session.mode === "subscription" && session.subscription) {
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
      
      await db.updateUserSubscription(parseInt(userId), { stripeSubscriptionId: subscriptionId });
    }
  }

  // Notify owner of new subscription
  await notifyOwner({
    title: "New Subscription! 🎉",
    content: `${customerName || customerEmail || "A user"} just subscribed to AccessAI!\n\nSession ID: ${session.id}\nAmount: $${(session.amount_total || 0) / 100}`
  });
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  console.log(`[Stripe] Subscription ${subscription.status} for customer ${customerId}`);

  // Get user by Stripe customer ID
  const user = await db.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Determine tier from price
  const priceId = subscription.items.data[0]?.price.id;
  let tier: "free" | "creator" | "pro" = "free";
  
  // Map price to tier (you would configure these in Stripe Dashboard)
  // For now, we'll use metadata or default logic
  const tierFromMetadata = subscription.metadata?.tier;
  if (tierFromMetadata === "creator" || tierFromMetadata === "pro") {
    tier = tierFromMetadata;
  }

  // Update user subscription status
  await db.updateUserSubscription(user.id, { 
    subscriptionTier: tier, 
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status as "active" | "canceled" | "past_due" | "trialing"
  });
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  console.log(`[Stripe] Subscription canceled for customer ${customerId}`);

  const user = await db.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Downgrade to free tier
  await db.updateUserSubscription(user.id, { 
    subscriptionTier: "free", 
    stripeSubscriptionId: undefined,
    subscriptionStatus: "canceled"
  });

  // Notify owner
  await notifyOwner({
    title: "Subscription Canceled",
    content: `User ${user.email || user.name || user.id} has canceled their subscription.`
  });
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice paid: ${invoice.id}`);
  
  // Log for audit purposes
  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  console.log(`[Stripe] Invoice ${invoice.id} paid by customer ${customerId}, amount: $${(invoice.amount_paid || 0) / 100}`);
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  console.log(`[Stripe] Payment failed for invoice ${invoice.id}, customer ${customerId}`);

  if (customerId) {
    const user = await db.getUserByStripeCustomerId(customerId);
    if (user) {
      // Notify owner of failed payment
      await notifyOwner({
        title: "Payment Failed ⚠️",
        content: `Payment failed for user ${user.email || user.name || user.id}.\n\nInvoice ID: ${invoice.id}\nAmount: $${(invoice.amount_due || 0) / 100}`
      });
    }
  }
}

export { stripe };
