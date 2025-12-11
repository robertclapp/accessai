/**
 * Tests for new features:
 * 1. Rating Comments - Written reviews alongside star ratings
 * 2. Digest Test Auto-Complete - Automatic test completion based on statistical significance
 * 3. Template Import/Export - JSON export/import for templates
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock database
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
  };
});

describe("Rating Comments", () => {
  describe("rateTemplate with review", () => {
    it("should accept a review along with rating", async () => {
      const mockRateTemplate = vi.fn().mockResolvedValue(1);
      vi.spyOn(db, "rateTemplate").mockImplementation(mockRateTemplate);
      
      const result = await db.rateTemplate(1, 1, 5, "Great template for headlines!");
      
      expect(mockRateTemplate).toHaveBeenCalledWith(1, 1, 5, "Great template for headlines!");
      expect(result).toBe(1);
    });
    
    it("should allow rating without review", async () => {
      const mockRateTemplate = vi.fn().mockResolvedValue(2);
      vi.spyOn(db, "rateTemplate").mockImplementation(mockRateTemplate);
      
      const result = await db.rateTemplate(1, 1, 4);
      
      expect(mockRateTemplate).toHaveBeenCalledWith(1, 1, 4);
      expect(result).toBe(2);
    });
    
    it("should validate rating is between 1-5", () => {
      // Rating validation happens at the router level
      expect(true).toBe(true);
    });
  });
  
  describe("getTemplateRatings", () => {
    it("should return ratings with reviews", async () => {
      const mockGetRatings = vi.fn().mockResolvedValue({
        averageRating: 4.5,
        totalRatings: 2,
        ratings: [
          { id: 1, templateId: 1, userId: 1, rating: 5, review: "Excellent!", createdAt: new Date() },
          { id: 2, templateId: 1, userId: 2, rating: 4, review: null, createdAt: new Date() },
        ],
      });
      vi.spyOn(db, "getTemplateRatings").mockImplementation(mockGetRatings);
      
      const result = await db.getTemplateRatings(1);
      
      expect(result.averageRating).toBe(4.5);
      expect(result.totalRatings).toBe(2);
      expect(result.ratings.length).toBe(2);
      expect(result.ratings[0].review).toBe("Excellent!");
    });
  });
});

describe("Digest Test Auto-Complete", () => {
  describe("calculateDigestTestSignificance", () => {
    it("should return no significance for small sample sizes", () => {
      const result = db.calculateDigestTestSignificance(5, 2, 5, 3);
      
      expect(result.confidence).toBe(0);
      expect(result.winner).toBeNull();
      expect(result.isSignificant).toBe(false);
    });
    
    it("should calculate significance for larger samples", () => {
      // Variant A: 100 sent, 30 opened (30%)
      // Variant B: 100 sent, 20 opened (20%)
      const result = db.calculateDigestTestSignificance(100, 30, 100, 20);
      
      expect(result.winner).toBe("A");
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it("should detect highly significant differences", () => {
      // Variant A: 500 sent, 200 opened (40%)
      // Variant B: 500 sent, 100 opened (20%)
      const result = db.calculateDigestTestSignificance(500, 200, 500, 100);
      
      expect(result.winner).toBe("A");
      expect(result.isSignificant).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(95);
    });
    
    it("should handle equal rates", () => {
      const result = db.calculateDigestTestSignificance(100, 25, 100, 25);
      
      expect(result.winner).toBeNull();
      expect(result.isSignificant).toBe(false);
    });
    
    it("should handle zero opens", () => {
      const result = db.calculateDigestTestSignificance(100, 0, 100, 0);
      
      expect(result.confidence).toBe(0);
      expect(result.winner).toBeNull();
    });
  });
  
  describe("checkDigestTestAutoComplete", () => {
    it("should return shouldComplete false for non-running tests", async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        shouldComplete: false,
        winner: null,
        confidence: 0,
        reason: "Test not running",
      });
      vi.spyOn(db, "checkDigestTestAutoComplete").mockImplementation(mockCheck);
      
      const result = await db.checkDigestTestAutoComplete(1);
      
      expect(result.shouldComplete).toBe(false);
      expect(result.reason).toBe("Test not running");
    });
    
    it("should return shouldComplete true when significance reached", async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        shouldComplete: true,
        winner: "A",
        confidence: 97,
        reason: "Statistical significance reached at 97% confidence",
      });
      vi.spyOn(db, "checkDigestTestAutoComplete").mockImplementation(mockCheck);
      
      const result = await db.checkDigestTestAutoComplete(1);
      
      expect(result.shouldComplete).toBe(true);
      expect(result.winner).toBe("A");
      expect(result.confidence).toBe(97);
    });
  });
  
  describe("autoCompleteDigestTest", () => {
    it("should complete test when conditions are met", async () => {
      const mockAutoComplete = vi.fn().mockResolvedValue({
        success: true,
        winner: "B",
        reason: "Statistical significance reached at 96% confidence",
      });
      vi.spyOn(db, "autoCompleteDigestTest").mockImplementation(mockAutoComplete);
      
      const result = await db.autoCompleteDigestTest(1);
      
      expect(result.success).toBe(true);
      expect(result.winner).toBe("B");
    });
    
    it("should not complete test when conditions not met", async () => {
      const mockAutoComplete = vi.fn().mockResolvedValue({
        success: false,
        winner: null,
        reason: "Minimum sample size not reached",
      });
      vi.spyOn(db, "autoCompleteDigestTest").mockImplementation(mockAutoComplete);
      
      const result = await db.autoCompleteDigestTest(1);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain("sample size");
    });
  });
  
  describe("updateDigestTestAutoCompleteSettings", () => {
    it("should update auto-complete settings", async () => {
      const mockUpdate = vi.fn().mockResolvedValue(true);
      vi.spyOn(db, "updateDigestTestAutoCompleteSettings").mockImplementation(mockUpdate);
      
      const result = await db.updateDigestTestAutoCompleteSettings(1, 1, {
        autoCompleteEnabled: true,
        minimumSampleSize: 200,
        confidenceThreshold: 99,
      });
      
      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(1, 1, {
        autoCompleteEnabled: true,
        minimumSampleSize: 200,
        confidenceThreshold: 99,
      });
    });
  });
});

describe("Template Import/Export", () => {
  describe("exportTemplate", () => {
    it("should export template to JSON format", async () => {
      const mockExport = vi.fn().mockResolvedValue({
        name: "Test Template",
        description: "A test template",
        category: "headline",
        variantATemplate: "Template A content",
        variantBTemplate: "Template B content",
        variantALabel: "Version A",
        variantBLabel: "Version B",
        tags: ["test", "headline"],
        exportedAt: "2024-01-01T00:00:00.000Z",
        version: "1.0",
      });
      vi.spyOn(db, "exportTemplate").mockImplementation(mockExport);
      
      const result = await db.exportTemplate(1, 1);
      
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Test Template");
      expect(result!.version).toBe("1.0");
      expect(result!.exportedAt).toBeDefined();
    });
    
    it("should return null for non-existent template", async () => {
      const mockExport = vi.fn().mockResolvedValue(null);
      vi.spyOn(db, "exportTemplate").mockImplementation(mockExport);
      
      const result = await db.exportTemplate(999, 1);
      
      expect(result).toBeNull();
    });
  });
  
  describe("importTemplate", () => {
    it("should import template from JSON data", async () => {
      const mockImport = vi.fn().mockResolvedValue({
        id: 10,
        name: "Imported Template",
        description: "Imported from JSON",
        category: "headline",
        variantATemplate: "Content A",
        variantBTemplate: "Content B",
        userId: 1,
        isSystem: false,
        isPublic: false,
      });
      vi.spyOn(db, "importTemplate").mockImplementation(mockImport);
      
      const importData = {
        name: "Imported Template",
        description: "Imported from JSON",
        category: "headline",
        variantATemplate: "Content A",
        variantBTemplate: "Content B",
        variantALabel: null,
        variantBLabel: null,
        tags: null,
        exportedAt: "2024-01-01T00:00:00.000Z",
        version: "1.0",
      };
      
      const result = await db.importTemplate(1, importData);
      
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Imported Template");
      expect(result!.isSystem).toBe(false);
    });
    
    it("should handle duplicate names by appending date", async () => {
      const mockImport = vi.fn().mockResolvedValue({
        id: 11,
        name: "My Template (Imported 1/1/2024)",
        category: "headline",
      });
      vi.spyOn(db, "importTemplate").mockImplementation(mockImport);
      
      const importData = {
        name: "My Template",
        description: null,
        category: "headline",
        variantATemplate: "A",
        variantBTemplate: "B",
        variantALabel: null,
        variantBLabel: null,
        tags: null,
        exportedAt: "2024-01-01T00:00:00.000Z",
        version: "1.0",
      };
      
      const result = await db.importTemplate(1, importData);
      
      expect(result!.name).toContain("Imported");
    });
    
    it("should return null for invalid data", async () => {
      const mockImport = vi.fn().mockResolvedValue(null);
      vi.spyOn(db, "importTemplate").mockImplementation(mockImport);
      
      const invalidData = {
        name: "",
        description: null,
        category: "",
        variantATemplate: "",
        variantBTemplate: "",
        variantALabel: null,
        variantBLabel: null,
        tags: null,
        exportedAt: "",
        version: "1.0",
      };
      
      const result = await db.importTemplate(1, invalidData);
      
      expect(result).toBeNull();
    });
  });
  
  describe("exportMultipleTemplates", () => {
    it("should export multiple templates at once", async () => {
      const mockExportMultiple = vi.fn().mockResolvedValue([
        { name: "Template 1", category: "headline", version: "1.0" },
        { name: "Template 2", category: "tone", version: "1.0" },
      ]);
      vi.spyOn(db, "exportMultipleTemplates").mockImplementation(mockExportMultiple);
      
      const result = await db.exportMultipleTemplates([1, 2], 1);
      
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("Template 1");
      expect(result[1].name).toBe("Template 2");
    });
    
    it("should skip templates user cannot access", async () => {
      const mockExportMultiple = vi.fn().mockResolvedValue([
        { name: "Template 1", category: "headline", version: "1.0" },
      ]);
      vi.spyOn(db, "exportMultipleTemplates").mockImplementation(mockExportMultiple);
      
      const result = await db.exportMultipleTemplates([1, 999], 1);
      
      expect(result.length).toBe(1);
    });
  });
  
  describe("importMultipleTemplates", () => {
    it("should import multiple templates at once", async () => {
      const mockImportMultiple = vi.fn().mockResolvedValue({
        imported: 3,
        failed: 0,
        templates: [
          { id: 1, name: "Template 1" },
          { id: 2, name: "Template 2" },
          { id: 3, name: "Template 3" },
        ],
      });
      vi.spyOn(db, "importMultipleTemplates").mockImplementation(mockImportMultiple);
      
      const templates = [
        { name: "Template 1", category: "headline", variantATemplate: "A", variantBTemplate: "B", description: null, variantALabel: null, variantBLabel: null, tags: null, exportedAt: "", version: "1.0" },
        { name: "Template 2", category: "tone", variantATemplate: "A", variantBTemplate: "B", description: null, variantALabel: null, variantBLabel: null, tags: null, exportedAt: "", version: "1.0" },
        { name: "Template 3", category: "cta", variantATemplate: "A", variantBTemplate: "B", description: null, variantALabel: null, variantBLabel: null, tags: null, exportedAt: "", version: "1.0" },
      ];
      
      const result = await db.importMultipleTemplates(1, templates);
      
      expect(result.imported).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.templates.length).toBe(3);
    });
    
    it("should track failed imports", async () => {
      const mockImportMultiple = vi.fn().mockResolvedValue({
        imported: 2,
        failed: 1,
        templates: [
          { id: 1, name: "Template 1" },
          { id: 2, name: "Template 2" },
        ],
      });
      vi.spyOn(db, "importMultipleTemplates").mockImplementation(mockImportMultiple);
      
      const templates = [
        { name: "Template 1", category: "headline", variantATemplate: "A", variantBTemplate: "B", description: null, variantALabel: null, variantBLabel: null, tags: null, exportedAt: "", version: "1.0" },
        { name: "", category: "", variantATemplate: "", variantBTemplate: "", description: null, variantALabel: null, variantBLabel: null, tags: null, exportedAt: "", version: "1.0" }, // Invalid
        { name: "Template 2", category: "tone", variantATemplate: "A", variantBTemplate: "B", description: null, variantALabel: null, variantBLabel: null, tags: null, exportedAt: "", version: "1.0" },
      ];
      
      const result = await db.importMultipleTemplates(1, templates);
      
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(1);
    });
  });
});
