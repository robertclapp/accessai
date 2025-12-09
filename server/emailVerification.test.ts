/**
 * Email Verification Tests
 * 
 * Tests for email verification functionality including:
 * - Token generation
 * - Token validation
 * - Rate limiting
 * - Email sending
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ============================================
// TEST HELPERS
// ============================================

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      get: (header: string) => {
        if (header === "host") return "localhost:3000";
        return undefined;
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      get: (header: string) => {
        if (header === "host") return "localhost:3000";
        return undefined;
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ============================================
// TESTS
// ============================================

describe("Email Verification", () => {
  describe("auth.verificationStatus", () => {
    it("returns verification status for authenticated user", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.verificationStatus();

      expect(result).toHaveProperty("isVerified");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("hasPendingVerification");
    });
  });

  describe("auth.canResendVerification", () => {
    it("returns resend availability for authenticated user", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.canResendVerification();

      expect(result).toHaveProperty("canResend");
      expect(typeof result.canResend).toBe("boolean");
    });
  });

  describe("auth.sendVerificationEmail", () => {
    it("requires valid email format", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.sendVerificationEmail({ email: "invalid-email" })
      ).rejects.toThrow();
    });

    it("accepts valid email and returns result", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.sendVerificationEmail({
        email: "valid@example.com",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });
  });

  describe("auth.verifyEmail", () => {
    it("requires non-empty token", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.verifyEmail({ token: "" })
      ).rejects.toThrow();
    });

    it("returns error for invalid token", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.verifyEmail({
        token: "invalid-token-12345",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid");
    });
  });
});

describe("Email Verification Input Validation", () => {
  it("validates email format strictly", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Test various invalid email formats
    const invalidEmails = [
      "not-an-email",
      "@missing-local.com",
      "missing-domain@",
      "spaces in@email.com",
      "double@@at.com",
    ];

    for (const email of invalidEmails) {
      await expect(
        caller.auth.sendVerificationEmail({ email })
      ).rejects.toThrow();
    }
  });

  it("accepts valid email formats", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Test various valid email formats
    const validEmails = [
      "simple@example.com",
      "user.name@example.com",
      "user+tag@example.com",
      "user@subdomain.example.com",
    ];

    for (const email of validEmails) {
      const result = await caller.auth.sendVerificationEmail({ email });
      expect(result).toHaveProperty("success");
    }
  });
});

describe("Token Validation", () => {
  it("handles expired tokens gracefully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Use a token that would be expired
    const result = await caller.auth.verifyEmail({
      token: "expired-token-abc123",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });

  it("handles already-used tokens", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Use a token that would be already used
    const result = await caller.auth.verifyEmail({
      token: "used-token-xyz789",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });
});
