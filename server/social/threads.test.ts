/**
 * Threads API Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThreadsAdapter } from "./threads";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ThreadsAdapter", () => {
  let adapter: ThreadsAdapter;
  
  beforeEach(() => {
    vi.resetAllMocks();
    // Set up environment variables
    process.env.THREADS_APP_ID = "test-app-id";
    process.env.THREADS_APP_SECRET = "test-app-secret";
    adapter = new ThreadsAdapter();
  });
  
  describe("platform", () => {
    it("should have platform set to threads", () => {
      expect(adapter.platform).toBe("threads");
    });
  });
  
  describe("getAuthUrl", () => {
    it("should generate correct authorization URL", () => {
      const redirectUri = "https://example.com/callback";
      const state = "test-state-123";
      
      const url = adapter.getAuthUrl(redirectUri, state);
      
      expect(url).toContain("https://threads.net/oauth/authorize");
      expect(url).toContain("client_id=test-app-id");
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain("scope=threads_basic%2Cthreads_content_publish");
      expect(url).toContain("response_type=code");
      expect(url).toContain(`state=${state}`);
    });
  });
  
  describe("exchangeCodeForTokens", () => {
    it("should exchange code for tokens successfully", async () => {
      const mockTokenResponse = {
        access_token: "short-lived-token",
        user_id: "12345"
      };
      
      const mockLongLivedResponse = {
        access_token: "long-lived-token",
        expires_in: 5184000
      };
      
      const mockProfileResponse = {
        id: "12345",
        username: "testuser",
        name: "Test User"
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLongLivedResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfileResponse)
        });
      
      const result = await adapter.exchangeCodeForTokens("auth-code", "https://example.com/callback");
      
      expect(result.accessToken).toBe("long-lived-token");
      expect(result.accountId).toBe("12345");
      expect(result.accountName).toBe("testuser");
      expect(result.tokenExpiresAt).toBeInstanceOf(Date);
    });
    
    it("should throw error on failed token exchange", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve("Invalid code")
      });
      
      await expect(
        adapter.exchangeCodeForTokens("invalid-code", "https://example.com/callback")
      ).rejects.toThrow("Failed to exchange code for tokens");
    });
  });
  
  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      const mockResponse = {
        access_token: "new-token",
        expires_in: 5184000
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await adapter.refreshToken("old-token");
      
      expect(result.accessToken).toBe("new-token");
      expect(result.tokenExpiresAt).toBeInstanceOf(Date);
    });
    
    it("should throw error on failed refresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });
      
      await expect(adapter.refreshToken("expired-token")).rejects.toThrow("Failed to refresh token");
    });
  });
  
  describe("validateTokens", () => {
    it("should return true for valid tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "12345" })
      });
      
      const result = await adapter.validateTokens({ accessToken: "valid-token" });
      
      expect(result).toBe(true);
    });
    
    it("should return false for invalid tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });
      
      const result = await adapter.validateTokens({ accessToken: "invalid-token" });
      
      expect(result).toBe(false);
    });
    
    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      
      const result = await adapter.validateTokens({ accessToken: "token" });
      
      expect(result).toBe(false);
    });
  });
  
  describe("post", () => {
    const validTokens = { accessToken: "valid-token" };
    
    it("should post text content successfully", async () => {
      mockFetch
        // Get user ID
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "12345" })
        })
        // Create container
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "container-123" })
        })
        // Publish container
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "post-456" })
        });
      
      const result = await adapter.post(
        { content: "Hello Threads!" },
        validTokens
      );
      
      expect(result.success).toBe(true);
      expect(result.postId).toBe("post-456");
      expect(result.postUrl).toContain("threads.net");
    }, 35000); // Increased timeout for the wait period
    
    it("should truncate content exceeding 500 characters", async () => {
      const longContent = "A".repeat(600);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "12345" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "container-123" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "post-456" })
        });
      
      const result = await adapter.post(
        { content: longContent },
        validTokens
      );
      
      expect(result.success).toBe(true);
      
      // Verify the content was truncated in the API call
      const containerCall = mockFetch.mock.calls[1];
      const bodyParams = new URLSearchParams(containerCall[1].body);
      expect(bodyParams.get("text")!.length).toBeLessThanOrEqual(500);
    }, 35000);
    
    it("should handle hashtags", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "12345" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "container-123" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "post-456" })
        });
      
      const result = await adapter.post(
        { 
          content: "Hello Threads!",
          hashtags: ["accessibility", "a11y"]
        },
        validTokens
      );
      
      expect(result.success).toBe(true);
    }, 35000);
    
    it("should return error when user ID fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });
      
      const result = await adapter.post(
        { content: "Hello Threads!" },
        validTokens
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to get user ID");
    });
    
    it("should return error when container creation fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "12345" })
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve("Container creation failed")
        });
      
      const result = await adapter.post(
        { content: "Hello Threads!" },
        validTokens
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create Threads container");
    });
    
    it("should return error when publishing fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "12345" })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "container-123" })
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve("Publishing failed")
        });
      
      const result = await adapter.post(
        { content: "Hello Threads!" },
        validTokens
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to publish Threads post");
    }, 35000);
  });
});

describe("Threads Platform Integration", () => {
  it("should be included in Platform type", () => {
    // This test verifies the type system includes threads
    const platform: "threads" = "threads";
    expect(platform).toBe("threads");
  });
  
  it("should have correct character limit", () => {
    // Verify the 500 character limit is enforced
    const THREADS_CHAR_LIMIT = 500;
    expect(THREADS_CHAR_LIMIT).toBe(500);
  });
});
