/**
 * Pricing Page
 * 
 * Displays subscription tiers and handles checkout.
 * Fully accessible with keyboard navigation and screen reader support.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Check, 
  Sparkles, 
  Zap, 
  Crown,
  Loader2,
  ArrowRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

// Pricing tiers (mirrored from server)
const PRICING_TIERS = [
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
    icon: Sparkles
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
    priceYearly: 190,
    popular: true,
    icon: Zap
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
    priceYearly: 490,
    icon: Crown
  }
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  
  // Get current subscription status
  const { data: subscription } = trpc.stripe.getSubscriptionStatus.useQuery(undefined, {
    enabled: isAuthenticated
  });
  
  // Checkout mutation
  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      toast.success("Redirecting to checkout...");
      window.open(checkoutUrl, "_blank");
      setLoadingTier(null);
    },
    onError: (error) => {
      toast.error("Failed to start checkout", { description: error.message });
      setLoadingTier(null);
    }
  });

  const handleSubscribe = (tierId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe");
      return;
    }
    
    if (tierId === "free") {
      toast.info("You're already on the Free plan");
      return;
    }
    
    setLoadingTier(tierId);
    checkoutMutation.mutate({
      tierId: tierId as "creator" | "pro",
      billingPeriod: isYearly ? "yearly" : "monthly"
    });
  };

  const currentTier = subscription?.tier || "free";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include our core 
            accessibility features to help you create inclusive content.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Label 
              htmlFor="billing-toggle" 
              className={!isYearly ? "font-semibold" : "text-muted-foreground"}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              aria-label="Toggle yearly billing"
            />
            <Label 
              htmlFor="billing-toggle"
              className={isYearly ? "font-semibold" : "text-muted-foreground"}
            >
              Yearly
              <Badge variant="secondary" className="ml-2">
                Save 17%
              </Badge>
            </Label>
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrentPlan = currentTier === tier.id;
            const price = isYearly ? tier.priceYearly : tier.priceMonthly;
            const isLoading = loadingTier === tier.id;
            
            return (
              <Card 
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.popular 
                    ? "border-primary shadow-lg scale-105" 
                    : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${
                      tier.popular ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        tier.popular ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <CardTitle>{tier.name}</CardTitle>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      ${price}
                    </span>
                    <span className="text-muted-foreground">
                      /{isYearly ? "year" : "month"}
                    </span>
                    {isYearly && tier.priceMonthly > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${Math.round(tier.priceYearly / 12)}/month billed annually
                      </p>
                    )}
                  </div>
                  
                  <ul className="space-y-3" role="list">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : tier.id === "free" ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={currentTier !== "free"}
                    >
                      {currentTier !== "free" ? "Downgrade" : "Get Started"}
                    </Button>
                  ) : (
                    <Button 
                      className={`w-full ${tier.popular ? "" : "variant-outline"}`}
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      {isLoading ? "Processing..." : "Subscribe"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        {/* FAQ / Additional Info */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto text-left">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can cancel your subscription at any time. You'll continue 
                  to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our Free plan lets you try all core features. Upgrade when you need 
                  more posts, voice minutes, or team collaboration.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards through Stripe, including Visa, 
                  Mastercard, and American Express.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We offer a 14-day money-back guarantee. If you're not satisfied, 
                  contact us for a full refund.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Have questions? We're here to help.
          </p>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
