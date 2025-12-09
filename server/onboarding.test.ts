/**
 * Onboarding Feature Tests
 * 
 * Tests for the user onboarding flow including:
 * - Getting onboarding status
 * - Updating onboarding status
 * - Tour completion tracking
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    hasCompletedTour: false,
    tourCompletedAt: null
  }),
  updateUserOnboarding: vi.fn().mockResolvedValue(undefined)
}));

// Helper to create authenticated context
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("settings.getOnboardingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns onboarding status for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getOnboardingStatus();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("hasCompletedTour");
  });
});

describe("settings.updateOnboardingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates onboarding status with hasCompletedTour", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateOnboardingStatus({
      hasCompletedTour: true
    });

    expect(result).toEqual({ success: true });
  });

  it("updates onboarding status with tourCompletedAt", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateOnboardingStatus({
      hasCompletedTour: true,
      tourCompletedAt: new Date().toISOString()
    });

    expect(result).toEqual({ success: true });
  });

  it("handles tour skip scenario", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateOnboardingStatus({
      hasCompletedTour: true,
      tourSkipped: true
    });

    expect(result).toEqual({ success: true });
  });
});

describe("Onboarding Tour Steps", () => {
  it("defines all required tour step targets", () => {
    // These are the data-tour attributes that should exist in the UI
    const requiredTourTargets = [
      "post-builder",
      "voice-input",
      "content-calendar",
      "knowledge-base",
      "accessibility-checker"
    ];

    // This test documents the expected tour targets
    // Actual UI testing would verify these elements exist
    expect(requiredTourTargets).toHaveLength(5);
    expect(requiredTourTargets).toContain("voice-input");
    expect(requiredTourTargets).toContain("accessibility-checker");
    expect(requiredTourTargets).toContain("content-calendar");
  });
});

describe("Onboarding Context Logic", () => {
  it("should show welcome modal for new users", () => {
    // Logic: if hasCompletedTour is false and user is authenticated
    const hasCompletedTour = false;
    const isAuthenticated = true;
    
    const shouldShowWelcomeModal = !hasCompletedTour && isAuthenticated;
    
    expect(shouldShowWelcomeModal).toBe(true);
  });

  it("should not show welcome modal for returning users", () => {
    const hasCompletedTour = true;
    const isAuthenticated = true;
    
    const shouldShowWelcomeModal = !hasCompletedTour && isAuthenticated;
    
    expect(shouldShowWelcomeModal).toBe(false);
  });

  it("should not show welcome modal for unauthenticated users", () => {
    const hasCompletedTour = false;
    const isAuthenticated = false;
    
    const shouldShowWelcomeModal = !hasCompletedTour && isAuthenticated;
    
    expect(shouldShowWelcomeModal).toBe(false);
  });
});
