/**
 * Social Media OAuth Callback Handler
 * 
 * This module handles OAuth callbacks from social media platforms.
 * It exchanges authorization codes for tokens and stores them in the database.
 */

import { Router } from "express";
import { nanoid } from "nanoid";
import { getAdapter, type Platform } from "./index";
import * as db from "../db";

export const socialOAuthRouter = Router();

// Store pending OAuth states (in production, use Redis or database)
const pendingOAuthStates = new Map<string, { userId: number; platform: Platform; redirectUri: string }>();

/**
 * Initiate OAuth flow for a social platform
 */
socialOAuthRouter.get("/connect/:platform", async (req, res) => {
  try {
    const platform = req.params.platform as Platform;
    const userId = (req as unknown as { user?: { id: number } }).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Validate platform
    if (!["linkedin", "twitter", "facebook", "instagram"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }
    
    // Generate state for CSRF protection
    const state = nanoid(32);
    const redirectUri = `${req.protocol}://${req.get("host")}/api/social/callback/${platform}`;
    
    // Store state for verification
    pendingOAuthStates.set(state, { userId, platform, redirectUri });
    
    // Set expiry for state (10 minutes)
    setTimeout(() => pendingOAuthStates.delete(state), 10 * 60 * 1000);
    
    // Get authorization URL
    const adapter = getAdapter(platform);
    const authUrl = adapter.getAuthUrl(redirectUri, state);
    
    return res.redirect(authUrl);
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return res.status(500).json({ error: "Failed to initiate OAuth" });
  }
});

/**
 * Handle OAuth callback from social platforms
 */
socialOAuthRouter.get("/callback/:platform", async (req, res) => {
  try {
    const platform = req.params.platform as Platform;
    const { code, state, error: oauthError } = req.query;
    
    // Check for OAuth errors
    if (oauthError) {
      console.error("OAuth error:", oauthError);
      return res.redirect(`/settings?error=${encodeURIComponent(String(oauthError))}`);
    }
    
    // Validate state
    if (!state || typeof state !== "string") {
      return res.redirect("/settings?error=invalid_state");
    }
    
    const pendingState = pendingOAuthStates.get(state);
    if (!pendingState) {
      return res.redirect("/settings?error=expired_state");
    }
    
    // Clean up state
    pendingOAuthStates.delete(state);
    
    // Validate code
    if (!code || typeof code !== "string") {
      return res.redirect("/settings?error=missing_code");
    }
    
    // Exchange code for tokens
    const adapter = getAdapter(platform);
    const tokens = await adapter.exchangeCodeForTokens(code, pendingState.redirectUri);
    
    // Store tokens in database
    await db.connectSocialAccount({
      userId: pendingState.userId,
      platform: platform,
      accountId: tokens.accountId,
      accountName: tokens.accountName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt
    });
    
    // Redirect back to settings with success
    return res.redirect(`/settings?connected=${platform}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return res.redirect(`/settings?error=${encodeURIComponent("Failed to connect account")}`);
  }
});

/**
 * Get OAuth connection URLs for all platforms
 */
socialOAuthRouter.get("/connect-urls", async (req, res) => {
  const userId = (req as unknown as { user?: { id: number } }).user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  
  return res.json({
    linkedin: `${baseUrl}/api/social/connect/linkedin`,
    twitter: `${baseUrl}/api/social/connect/twitter`,
    facebook: `${baseUrl}/api/social/connect/facebook`,
    instagram: `${baseUrl}/api/social/connect/instagram`
  });
});
