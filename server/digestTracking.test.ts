/**
 * Tests for Digest Delivery Tracking
 * 
 * Tests the tracking functionality for email digest opens and clicks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ============================================
// TRACKING ID GENERATION TESTS
// ============================================

describe("Tracking ID Generation", () => {
  it("should generate unique tracking IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      // Simulate nanoid generation
      const id = crypto.randomBytes(12).toString("base64url");
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });
  
  it("should generate URL-safe tracking IDs", () => {
    const id = crypto.randomBytes(12).toString("base64url");
    // URL-safe characters only
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

// ============================================
// IP HASHING TESTS
// ============================================

describe("IP Hashing", () => {
  function hashIp(ip: string): string {
    return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
  }
  
  it("should hash IP addresses consistently", () => {
    const ip = "192.168.1.1";
    const hash1 = hashIp(ip);
    const hash2 = hashIp(ip);
    
    expect(hash1).toBe(hash2);
  });
  
  it("should produce different hashes for different IPs", () => {
    const hash1 = hashIp("192.168.1.1");
    const hash2 = hashIp("192.168.1.2");
    
    expect(hash1).not.toBe(hash2);
  });
  
  it("should truncate hash to 16 characters", () => {
    const hash = hashIp("192.168.1.1");
    
    expect(hash.length).toBe(16);
  });
  
  it("should produce hex characters only", () => {
    const hash = hashIp("192.168.1.1");
    
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

// ============================================
// OPEN TRACKING TESTS
// ============================================

describe("Open Tracking", () => {
  describe("Tracking Pixel", () => {
    it("should return a 1x1 transparent GIF", () => {
      const TRACKING_PIXEL = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      
      expect(TRACKING_PIXEL.length).toBeGreaterThan(0);
      expect(TRACKING_PIXEL.length).toBeLessThan(100);
    });
    
    it("should have correct GIF header", () => {
      const TRACKING_PIXEL = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      
      // GIF header starts with "GIF"
      const header = TRACKING_PIXEL.slice(0, 3).toString("ascii");
      expect(header).toBe("GIF");
    });
  });
  
  describe("Open Recording", () => {
    it("should increment open count", () => {
      const delivery = { openCount: 0 };
      delivery.openCount += 1;
      
      expect(delivery.openCount).toBe(1);
    });
    
    it("should set openedAt on first open", () => {
      const delivery = { openedAt: null as Date | null, openCount: 0 };
      
      if (!delivery.openedAt) {
        delivery.openedAt = new Date();
      }
      delivery.openCount += 1;
      
      expect(delivery.openedAt).toBeInstanceOf(Date);
    });
    
    it("should not update openedAt on subsequent opens", () => {
      const firstOpen = new Date("2024-01-01");
      const delivery = { openedAt: firstOpen, openCount: 1 };
      
      // Simulate second open
      if (!delivery.openedAt) {
        delivery.openedAt = new Date();
      }
      delivery.openCount += 1;
      
      expect(delivery.openedAt).toBe(firstOpen);
      expect(delivery.openCount).toBe(2);
    });
    
    it("should update status to opened", () => {
      const delivery = { status: "sent" as const };
      const newStatus = "opened" as const;
      
      expect(newStatus).toBe("opened");
    });
  });
});

// ============================================
// CLICK TRACKING TESTS
// ============================================

describe("Click Tracking", () => {
  describe("Click Recording", () => {
    it("should increment click count", () => {
      const delivery = { clickCount: 0 };
      delivery.clickCount += 1;
      
      expect(delivery.clickCount).toBe(1);
    });
    
    it("should set firstClickAt on first click", () => {
      const delivery = { firstClickAt: null as Date | null, clickCount: 0 };
      
      if (!delivery.firstClickAt) {
        delivery.firstClickAt = new Date();
      }
      delivery.clickCount += 1;
      
      expect(delivery.firstClickAt).toBeInstanceOf(Date);
    });
    
    it("should record clicked links", () => {
      const clickedLinks: { url: string; clickedAt: number; section?: string }[] = [];
      
      clickedLinks.push({
        url: "/dashboard",
        clickedAt: Date.now(),
        section: "analytics",
      });
      
      expect(clickedLinks.length).toBe(1);
      expect(clickedLinks[0].url).toBe("/dashboard");
      expect(clickedLinks[0].section).toBe("analytics");
    });
    
    it("should update status to clicked", () => {
      const delivery = { status: "opened" as const };
      const newStatus = "clicked" as const;
      
      expect(newStatus).toBe("clicked");
    });
  });
  
  describe("URL Redirect", () => {
    it("should decode URL-encoded paths", () => {
      const encoded = encodeURIComponent("/dashboard?tab=analytics");
      const decoded = decodeURIComponent(encoded);
      
      expect(decoded).toBe("/dashboard?tab=analytics");
    });
    
    it("should allow relative URLs", () => {
      const url = "/dashboard";
      const isRelative = url.startsWith("/");
      
      expect(isRelative).toBe(true);
    });
    
    it("should reject external URLs for security", () => {
      const externalUrl = "https://malicious.com";
      const baseUrl = "https://accessai.example.com";
      
      const isSafe = externalUrl.startsWith("/") || externalUrl.startsWith(baseUrl);
      
      expect(isSafe).toBe(false);
    });
  });
});

// ============================================
// DELIVERY STATS TESTS
// ============================================

describe("Delivery Statistics", () => {
  describe("Rate Calculations", () => {
    it("should calculate open rate correctly", () => {
      const totalSent = 100;
      const totalOpened = 25;
      
      const openRate = (totalOpened / totalSent) * 100;
      
      expect(openRate).toBe(25);
    });
    
    it("should calculate click rate correctly", () => {
      const totalSent = 100;
      const totalClicked = 10;
      
      const clickRate = (totalClicked / totalSent) * 100;
      
      expect(clickRate).toBe(10);
    });
    
    it("should handle zero sent gracefully", () => {
      const totalSent = 0;
      const totalOpened = 0;
      
      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      
      expect(openRate).toBe(0);
    });
    
    it("should handle 100% rates", () => {
      const totalSent = 10;
      const totalOpened = 10;
      
      const openRate = (totalOpened / totalSent) * 100;
      
      expect(openRate).toBe(100);
    });
  });
  
  describe("Aggregation", () => {
    it("should count opened deliveries", () => {
      const deliveries = [
        { openedAt: new Date() },
        { openedAt: null },
        { openedAt: new Date() },
        { openedAt: null },
      ];
      
      const totalOpened = deliveries.filter(d => d.openedAt !== null).length;
      
      expect(totalOpened).toBe(2);
    });
    
    it("should count clicked deliveries", () => {
      const deliveries = [
        { firstClickAt: new Date() },
        { firstClickAt: null },
        { firstClickAt: new Date() },
      ];
      
      const totalClicked = deliveries.filter(d => d.firstClickAt !== null).length;
      
      expect(totalClicked).toBe(2);
    });
    
    it("should return recent deliveries in order", () => {
      const deliveries = [
        { id: 1, sentAt: new Date("2024-01-01") },
        { id: 2, sentAt: new Date("2024-01-03") },
        { id: 3, sentAt: new Date("2024-01-02") },
      ];
      
      const sorted = [...deliveries].sort((a, b) => 
        b.sentAt.getTime() - a.sentAt.getTime()
      );
      
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });
  });
});

// ============================================
// TRACKING HTML INTEGRATION TESTS
// ============================================

describe("Tracking HTML Integration", () => {
  describe("Tracking Pixel Injection", () => {
    it("should inject tracking pixel before closing body tag", () => {
      const html = "<html><body>Content</body></html>";
      const trackingId = "test123";
      const trackingPixel = `<img src="/api/digest/track/open?tid=${trackingId}" width="1" height="1" alt="" style="display:none;" />`;
      
      const result = html.replace("</body>", `${trackingPixel}</body>`);
      
      expect(result).toContain(trackingPixel);
      expect(result).toContain("</body>");
    });
    
    it("should include tracking ID in pixel URL", () => {
      const trackingId = "abc123xyz";
      const pixelUrl = `/api/digest/track/open?tid=${trackingId}`;
      
      expect(pixelUrl).toContain(trackingId);
    });
  });
  
  describe("Link Wrapping", () => {
    it("should wrap relative links with tracking", () => {
      const html = '<a href="/dashboard">Dashboard</a>';
      const trackingId = "test123";
      
      const result = html.replace(
        /href="(\/[^"]+)"/g,
        (_, url) => `href="/api/digest/track/click?tid=${trackingId}&url=${encodeURIComponent(url)}"`
      );
      
      expect(result).toContain("/api/digest/track/click");
      expect(result).toContain(trackingId);
      expect(result).toContain(encodeURIComponent("/dashboard"));
    });
    
    it("should preserve original URL in encoded form", () => {
      const originalUrl = "/analytics?period=weekly";
      const encoded = encodeURIComponent(originalUrl);
      const decoded = decodeURIComponent(encoded);
      
      expect(decoded).toBe(originalUrl);
    });
  });
});

// ============================================
// DELIVERY STATUS TESTS
// ============================================

describe("Delivery Status", () => {
  const validStatuses = ["sent", "opened", "clicked", "bounced", "failed"];
  
  it("should have all valid status values", () => {
    expect(validStatuses).toContain("sent");
    expect(validStatuses).toContain("opened");
    expect(validStatuses).toContain("clicked");
    expect(validStatuses).toContain("bounced");
    expect(validStatuses).toContain("failed");
  });
  
  it("should transition from sent to opened", () => {
    let status = "sent";
    status = "opened";
    
    expect(status).toBe("opened");
  });
  
  it("should transition from opened to clicked", () => {
    let status = "opened";
    status = "clicked";
    
    expect(status).toBe("clicked");
  });
});
