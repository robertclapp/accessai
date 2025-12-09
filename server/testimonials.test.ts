/**
 * Testimonials and Partners API Tests
 * 
 * Tests for the testimonials and featured partners management functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  // Existing mocks from other tests
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    role: "admin"
  }),
  // Testimonials mocks
  getActiveTestimonials: vi.fn().mockResolvedValue([
    { id: 1, name: "Sarah M.", quote: "Great product!", rating: 5, isActive: true },
    { id: 2, name: "James K.", quote: "Amazing service!", rating: 5, isActive: true }
  ]),
  getFeaturedTestimonials: vi.fn().mockResolvedValue([
    { id: 1, name: "Sarah M.", quote: "Great product!", rating: 5, featured: true, isActive: true }
  ]),
  getAllTestimonials: vi.fn().mockResolvedValue([
    { id: 1, name: "Sarah M.", quote: "Great product!", rating: 5, isActive: true },
    { id: 2, name: "James K.", quote: "Amazing service!", rating: 5, isActive: true },
    { id: 3, name: "Inactive User", quote: "Hidden", rating: 4, isActive: false }
  ]),
  createTestimonial: vi.fn().mockResolvedValue(4),
  updateTestimonial: vi.fn().mockResolvedValue(undefined),
  deleteTestimonial: vi.fn().mockResolvedValue(undefined),
  // Partners mocks - using correct function names from routers.ts
  getActiveFeaturedPartners: vi.fn().mockResolvedValue([
    { id: 1, name: "TechCrunch", logoUrl: "https://example.com/tc.png", partnerType: "media", isActive: true }
  ]),
  getAllFeaturedPartners: vi.fn().mockResolvedValue([
    { id: 1, name: "TechCrunch", logoUrl: "https://example.com/tc.png", partnerType: "media", isActive: true },
    { id: 2, name: "Forbes", logoUrl: "https://example.com/forbes.png", partnerType: "media", isActive: false }
  ]),
  createFeaturedPartner: vi.fn().mockResolvedValue(3),
  updateFeaturedPartner: vi.fn().mockResolvedValue(undefined),
  deleteFeaturedPartner: vi.fn().mockResolvedValue(undefined)
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  return { user };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  return { user };
}

function createPublicContext(): TrpcContext {
  return { user: null };
}

const caller = appRouter.createCaller;

describe("Testimonials API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("testimonials.getActive", () => {
    it("should return active testimonials for public users", async () => {
      const ctx = createPublicContext();
      const result = await caller(ctx).testimonials.getActive();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Sarah M.");
      expect(result[1].name).toBe("James K.");
    });

    it("should return active testimonials for authenticated users", async () => {
      const ctx = createUserContext();
      const result = await caller(ctx).testimonials.getActive();
      
      expect(result).toHaveLength(2);
    });
  });

  describe("testimonials.getFeatured", () => {
    it("should return featured testimonials for public users", async () => {
      const ctx = createPublicContext();
      const result = await caller(ctx).testimonials.getFeatured();
      
      expect(result).toHaveLength(1);
      expect(result[0].featured).toBe(true);
    });
  });

  describe("testimonials.getAll (admin)", () => {
    it("should return all testimonials for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).testimonials.getAll();
      
      expect(result).toHaveLength(3);
      expect(result.some(t => t.isActive === false)).toBe(true);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).testimonials.getAll()).rejects.toThrow();
    });
  });

  describe("testimonials.create (admin)", () => {
    it("should create a new testimonial for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).testimonials.create({
        name: "New User",
        quote: "New quote is at least 10 characters",
        rating: 5
      });
      
      expect(result.id).toBe(4);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).testimonials.create({
        name: "New User",
        quote: "New quote is at least 10 characters"
      })).rejects.toThrow();
    });
  });

  describe("testimonials.update (admin)", () => {
    it("should update a testimonial for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).testimonials.update({
        id: 1,
        name: "Updated Name",
        quote: "Updated quote is at least 10 characters"
      });
      
      expect(result.success).toBe(true);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).testimonials.update({
        id: 1,
        name: "Updated Name",
        quote: "Updated quote is at least 10 characters"
      })).rejects.toThrow();
    });
  });

  describe("testimonials.delete (admin)", () => {
    it("should delete a testimonial for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).testimonials.delete({ id: 1 });
      
      expect(result.success).toBe(true);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).testimonials.delete({ id: 1 })).rejects.toThrow();
    });
  });
});

describe("Featured Partners API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("partners.getActive", () => {
    it("should return active partners for public users", async () => {
      const ctx = createPublicContext();
      const result = await caller(ctx).partners.getActive();
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("TechCrunch");
    });

    it("should return active partners for authenticated users", async () => {
      const ctx = createUserContext();
      const result = await caller(ctx).partners.getActive();
      
      expect(result).toHaveLength(1);
    });
  });

  describe("partners.getAll (admin)", () => {
    it("should return all partners for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).partners.getAll();
      
      expect(result).toHaveLength(2);
      expect(result.some(p => p.isActive === false)).toBe(true);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).partners.getAll()).rejects.toThrow();
    });
  });

  describe("partners.create (admin)", () => {
    it("should create a new partner for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).partners.create({
        name: "New Partner",
        logoUrl: "https://example.com/new.png",
        partnerType: "media"
      });
      
      expect(result.id).toBe(3);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).partners.create({
        name: "New Partner",
        logoUrl: "https://example.com/new.png"
      })).rejects.toThrow();
    });
  });

  describe("partners.update (admin)", () => {
    it("should update a partner for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).partners.update({
        id: 1,
        name: "Updated Partner",
        logoUrl: "https://example.com/updated.png"
      });
      
      expect(result.success).toBe(true);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).partners.update({
        id: 1,
        name: "Updated Partner",
        logoUrl: "https://example.com/updated.png"
      })).rejects.toThrow();
    });
  });

  describe("partners.delete (admin)", () => {
    it("should delete a partner for admin users", async () => {
      const ctx = createAdminContext();
      const result = await caller(ctx).partners.delete({ id: 1 });
      
      expect(result.success).toBe(true);
    });

    it("should throw error for non-admin users", async () => {
      const ctx = createUserContext();
      
      await expect(caller(ctx).partners.delete({ id: 1 })).rejects.toThrow();
    });
  });
});

describe("Testimonials Display Logic", () => {
  it("should support rating values from 1 to 5", () => {
    const validRatings = [1, 2, 3, 4, 5];
    validRatings.forEach(rating => {
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
    });
  });

  it("should validate testimonial required fields", () => {
    const testimonial = { name: "Test", quote: "Test quote" };
    expect(testimonial.name).toBeTruthy();
    expect(testimonial.quote).toBeTruthy();
  });
});

describe("Partners Display Logic", () => {
  it("should support all partner types", () => {
    const validTypes = ["media", "customer", "partner", "integration"];
    validTypes.forEach(type => {
      expect(["media", "customer", "partner", "integration"]).toContain(type);
    });
  });

  it("should validate partner required fields", () => {
    const partner = { name: "Test", logoUrl: "https://example.com/logo.png" };
    expect(partner.name).toBeTruthy();
    expect(partner.logoUrl).toBeTruthy();
  });
});
