/**
 * Settings and Social Media Integration Tests
 * 
 * Tests for the settings router and social media adapters.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    accessibilityPreferences: {},
    writingStyleProfile: {}
  }),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  updateUserAccessibilityPreferences: vi.fn().mockResolvedValue(undefined),
  updateUserWritingStyle: vi.fn().mockResolvedValue(undefined),
  getNotificationPreferences: vi.fn().mockResolvedValue({
    userId: 1,
    emailEnabled: true,
    emailDigestFrequency: "daily"
  }),
  updateNotificationPreferences: vi.fn().mockResolvedValue(undefined),
  getUserSocialAccounts: vi.fn().mockResolvedValue([
    { id: 1, platform: "linkedin", accountName: "Test LinkedIn" }
  ]),
  getSocialAccountByPlatform: vi.fn().mockResolvedValue({
    id: 1,
    platform: "linkedin",
    accountName: "Test LinkedIn",
    accessToken: "test-token"
  }),
  disconnectSocialAccountByUser: vi.fn().mockResolvedValue(undefined)
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("settings.updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user profile successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateProfile({
      name: "Updated Name",
      email: "updated@example.com"
    });

    expect(result).toEqual({ success: true });
  });

  it("allows partial updates", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateProfile({
      name: "Only Name"
    });

    expect(result).toEqual({ success: true });
  });
});

describe("settings.updateAccessibilityPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates accessibility preferences successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateAccessibilityPreferences({
      highContrast: true,
      dyslexiaFont: true,
      fontSize: "large",
      reduceMotion: true
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts all valid font sizes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    for (const fontSize of ["small", "medium", "large", "xlarge"] as const) {
      const result = await caller.settings.updateAccessibilityPreferences({
        fontSize
      });
      expect(result).toEqual({ success: true });
    }
  });
});

describe("settings.updateWritingStyle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates writing style successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateWritingStyle({
      tone: "friendly",
      formality: "professional",
      industry: "technology",
      targetAudience: "developers"
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts all valid formality levels", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    for (const formality of ["casual", "professional", "academic"] as const) {
      const result = await caller.settings.updateWritingStyle({
        formality
      });
      expect(result).toEqual({ success: true });
    }
  });
});

describe("settings.updateNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates notification preferences successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.updateNotificationPreferences({
      emailEnabled: true,
      emailDigestFrequency: "weekly",
      notifyOnPostPublished: true,
      inAppEnabled: true,
      soundEnabled: false
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts all valid digest frequencies", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    for (const freq of ["realtime", "daily", "weekly", "never"] as const) {
      const result = await caller.settings.updateNotificationPreferences({
        emailDigestFrequency: freq
      });
      expect(result).toEqual({ success: true });
    }
  });
});

describe("settings.getNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notification preferences", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getNotificationPreferences();

    expect(result).toHaveProperty("userId");
    expect(result).toHaveProperty("emailEnabled");
  });
});

describe("social.getConnectedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected social accounts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.social.getConnectedAccounts();

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("platform", "linkedin");
  });
});

describe("social.getConnectionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connection status for a platform", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.social.getConnectionStatus({
      platform: "linkedin"
    });

    expect(result).toHaveProperty("connected", true);
    expect(result).toHaveProperty("accountName", "Test LinkedIn");
  });
});

describe("social.disconnectAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disconnects a social account successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.social.disconnectAccount({
      accountId: 1
    });

    expect(result).toEqual({ success: true });
  });
});
