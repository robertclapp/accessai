/**
 * Digest Tracking Router
 * 
 * Handles tracking pixel and click tracking for email digests.
 * These are public endpoints that don't require authentication.
 */

import { Router } from "express";
import crypto from "crypto";
import * as db from "./db";

const router = Router();

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/**
 * Hash IP address for privacy
 */
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

/**
 * GET /api/digest/track/open
 * 
 * Tracking pixel endpoint for recording email opens.
 * Returns a 1x1 transparent GIF.
 */
router.get("/api/digest/track/open", async (req, res) => {
  const trackingId = req.query.tid as string;
  
  if (trackingId) {
    try {
      const userAgent = req.headers["user-agent"] || undefined;
      const ip = req.ip || req.socket.remoteAddress || "";
      const ipHash = hashIp(ip);
      
      await db.recordDigestOpen(trackingId, userAgent, ipHash);
      console.log(`[DigestTracking] Recorded open for ${trackingId}`);
    } catch (error) {
      console.error("[DigestTracking] Failed to record open:", error);
    }
  }
  
  // Return tracking pixel
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": TRACKING_PIXEL.length,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  res.send(TRACKING_PIXEL);
});

/**
 * GET /api/digest/track/click
 * 
 * Click tracking endpoint that records the click and redirects to the target URL.
 */
router.get("/api/digest/track/click", async (req, res) => {
  const trackingId = req.query.tid as string;
  const targetUrl = req.query.url as string;
  const section = req.query.section as string | undefined;
  
  if (trackingId && targetUrl) {
    try {
      await db.recordDigestClick(trackingId, targetUrl, section);
      console.log(`[DigestTracking] Recorded click for ${trackingId}: ${targetUrl}`);
    } catch (error) {
      console.error("[DigestTracking] Failed to record click:", error);
    }
  }
  
  // Decode and redirect to target URL
  const decodedUrl = decodeURIComponent(targetUrl || "/");
  
  // Security: Only allow relative URLs or same-origin
  if (decodedUrl.startsWith("/") || decodedUrl.startsWith(process.env.VITE_FRONTEND_FORGE_API_URL || "")) {
    res.redirect(302, decodedUrl);
  } else {
    // Fallback to dashboard for external URLs (security measure)
    res.redirect(302, "/dashboard");
  }
});

export default router;
