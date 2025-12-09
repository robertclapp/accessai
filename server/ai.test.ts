/**
 * AI Router Tests
 * 
 * Tests for AI content generation, accessibility checking, and voice transcription.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM invocation
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          ideas: [
            {
              title: "Test Idea 1",
              description: "A test idea description",
              hook: "Start with a question",
              contentType: "text",
              estimatedEngagement: "high"
            }
          ]
        })
      }
    }]
  })
}));

// Mock database functions - include all functions used by routers
vi.mock("./db", () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-user",
    subscriptionTier: "creator",
    monthlyPostsGenerated: 0
  }),
  getUserKnowledgeBase: vi.fn().mockResolvedValue([]),
  getAiContextItems: vi.fn().mockResolvedValue([]),
  getTemplateById: vi.fn().mockResolvedValue(null),
  incrementTemplateUsage: vi.fn().mockResolvedValue(undefined),
  createPost: vi.fn().mockResolvedValue(1),
  getUserPosts: vi.fn().mockResolvedValue([]),
  getPostById: vi.fn().mockResolvedValue(null),
  updatePost: vi.fn().mockResolvedValue(undefined),
  deletePost: vi.fn().mockResolvedValue(undefined),
  getTemplates: vi.fn().mockResolvedValue([]),
  createTemplate: vi.fn().mockResolvedValue(1),
  updateTemplate: vi.fn().mockResolvedValue(undefined),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  createKnowledgeBaseItem: vi.fn().mockResolvedValue(1),
  updateKnowledgeBaseItem: vi.fn().mockResolvedValue(undefined),
  deleteKnowledgeBaseItem: vi.fn().mockResolvedValue(undefined),
  getScheduledPosts: vi.fn().mockResolvedValue([]),
  getPostAnalytics: vi.fn().mockResolvedValue([]),
  recordPostAnalytics: vi.fn().mockResolvedValue(undefined),
  getUserTeams: vi.fn().mockResolvedValue([]),
  getTeamById: vi.fn().mockResolvedValue(null),
  createTeam: vi.fn().mockResolvedValue(1),
  updateTeam: vi.fn().mockResolvedValue(undefined),
  deleteTeam: vi.fn().mockResolvedValue(undefined),
  addTeamMember: vi.fn().mockResolvedValue(1),
  removeTeamMember: vi.fn().mockResolvedValue(undefined),
  updateTeamMemberRole: vi.fn().mockResolvedValue(undefined),
  updateUserSubscription: vi.fn().mockResolvedValue(undefined),
  getUserByStripeCustomerId: vi.fn().mockResolvedValue(null)
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
      headers: { origin: "https://test.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("AI Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
    vi.clearAllMocks();
  });

  describe("generateIdeas", () => {
    it("generates content ideas for a given topic and platform", async () => {
      const result = await caller.ai.generateIdeas({
        topic: "accessibility",
        platform: "linkedin",
        count: 3
      });

      expect(result).toHaveProperty("ideas");
      expect(Array.isArray(result.ideas)).toBe(true);
    });

    it("uses default count when not specified", async () => {
      const result = await caller.ai.generateIdeas({
        platform: "twitter"
      });

      expect(result).toHaveProperty("ideas");
    });
  });
});

describe("Posts Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("creates a new post with required fields", async () => {
    const result = await caller.posts.create({
      content: "Test post content",
      platform: "linkedin",
      status: "draft"
    });

    expect(result).toHaveProperty("postId");
    expect(typeof result.postId).toBe("number");
  });
});

describe("Auth Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("returns the current user from me query", async () => {
    const result = await caller.auth.me();
    
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user");
    expect(result?.email).toBe("test@example.com");
  });
});
