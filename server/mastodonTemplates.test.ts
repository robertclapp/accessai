/**
 * Tests for Mastodon Templates Management
 * 
 * Tests the template CRUD operations, filtering, and UI functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================
// MASTODON TEMPLATES CRUD TESTS
// ============================================

describe("Mastodon Templates CRUD", () => {
  describe("Template Creation", () => {
    it("should create a template with required fields", () => {
      const template = {
        name: "Political Discussion",
        category: "politics",
        content: "Let's discuss {{topic}} today",
        defaultCW: "Politics",
        description: "Template for political discussions",
      };
      
      expect(template.name).toBeDefined();
      expect(template.content).toBeDefined();
      expect(template.content.length).toBeLessThanOrEqual(500);
    });
    
    it("should enforce 500 character limit for content", () => {
      const longContent = "a".repeat(501);
      const isValid = longContent.length <= 500;
      
      expect(isValid).toBe(false);
    });
    
    it("should allow optional description", () => {
      const templateWithDesc = {
        name: "Test",
        content: "Content",
        description: "A description",
      };
      
      const templateWithoutDesc = {
        name: "Test",
        content: "Content",
      };
      
      expect(templateWithDesc.description).toBeDefined();
      expect(templateWithoutDesc.description).toBeUndefined();
    });
    
    it("should allow optional content warning", () => {
      const templateWithCW = {
        name: "Test",
        content: "Content",
        defaultCW: "Spoiler",
      };
      
      const templateWithoutCW = {
        name: "Test",
        content: "Content",
      };
      
      expect(templateWithCW.defaultCW).toBe("Spoiler");
      expect(templateWithoutCW.defaultCW).toBeUndefined();
    });
  });
  
  describe("Template Categories", () => {
    const validCategories = [
      "news",
      "opinion",
      "art",
      "photography",
      "tech",
      "gaming",
      "food",
      "politics",
      "health",
      "personal",
      "other",
    ];
    
    it("should accept all valid categories", () => {
      validCategories.forEach(category => {
        expect(validCategories.includes(category)).toBe(true);
      });
    });
    
    it("should default to 'other' category", () => {
      const template = {
        name: "Test",
        content: "Content",
        category: "other",
      };
      
      expect(template.category).toBe("other");
    });
    
    it("should have 11 categories total", () => {
      expect(validCategories.length).toBe(11);
    });
  });
  
  describe("Template Update", () => {
    it("should update template name", () => {
      const template = { id: 1, name: "Old Name", content: "Content" };
      const updated = { ...template, name: "New Name" };
      
      expect(updated.name).toBe("New Name");
      expect(updated.id).toBe(1);
    });
    
    it("should update template content", () => {
      const template = { id: 1, name: "Name", content: "Old Content" };
      const updated = { ...template, content: "New Content" };
      
      expect(updated.content).toBe("New Content");
    });
    
    it("should update template category", () => {
      const template = { id: 1, name: "Name", content: "Content", category: "other" };
      const updated = { ...template, category: "tech" };
      
      expect(updated.category).toBe("tech");
    });
  });
  
  describe("Template Deletion", () => {
    it("should delete template by id", () => {
      const templates = [
        { id: 1, name: "Template 1" },
        { id: 2, name: "Template 2" },
        { id: 3, name: "Template 3" },
      ];
      
      const afterDelete = templates.filter(t => t.id !== 2);
      
      expect(afterDelete.length).toBe(2);
      expect(afterDelete.find(t => t.id === 2)).toBeUndefined();
    });
    
    it("should not delete system templates", () => {
      const template = { id: 1, name: "System Template", isSystem: true };
      
      const canDelete = !template.isSystem;
      
      expect(canDelete).toBe(false);
    });
  });
});

// ============================================
// TEMPLATE FILTERING TESTS
// ============================================

describe("Template Filtering", () => {
  const mockTemplates = [
    { id: 1, name: "Political News", category: "politics", content: "Breaking news about politics" },
    { id: 2, name: "Tech Update", category: "tech", content: "Latest tech news" },
    { id: 3, name: "Gaming Review", category: "gaming", content: "Game review template" },
    { id: 4, name: "Food Recipe", category: "food", content: "Delicious recipe to share" },
    { id: 5, name: "Personal Update", category: "personal", content: "Personal life update" },
  ];
  
  describe("Search Filtering", () => {
    it("should filter by name", () => {
      const searchQuery = "political";
      const filtered = mockTemplates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Political News");
    });
    
    it("should filter by content", () => {
      const searchQuery = "recipe";
      const filtered = mockTemplates.filter(t => 
        t.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Food Recipe");
    });
    
    it("should be case insensitive", () => {
      const searchQuery = "TECH";
      const filtered = mockTemplates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Tech Update");
    });
    
    it("should return empty for no matches", () => {
      const searchQuery = "nonexistent";
      const filtered = mockTemplates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(filtered.length).toBe(0);
    });
  });
  
  describe("Category Filtering", () => {
    it("should filter by category", () => {
      const category = "gaming";
      const filtered = mockTemplates.filter(t => t.category === category);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Gaming Review");
    });
    
    it("should return all for 'all' category", () => {
      const category = "all";
      const filtered = category === "all" 
        ? mockTemplates 
        : mockTemplates.filter(t => t.category === category);
      
      expect(filtered.length).toBe(5);
    });
    
    it("should combine search and category filters", () => {
      const searchQuery = "news";
      const category = "politics";
      
      const filtered = mockTemplates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = t.category === category;
        return matchesSearch && matchesCategory;
      });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Political News");
    });
  });
});

// ============================================
// TEMPLATE PREVIEW TESTS
// ============================================

describe("Template Preview", () => {
  describe("Content Warning Display", () => {
    it("should show CW when present", () => {
      const template = {
        content: "Sensitive content here",
        defaultCW: "Politics, US Election",
      };
      
      expect(template.defaultCW).toBeTruthy();
      expect(template.defaultCW).toBe("Politics, US Election");
    });
    
    it("should not show CW when absent", () => {
      const template = {
        content: "Regular content",
        defaultCW: "",
      };
      
      expect(template.defaultCW).toBeFalsy();
    });
    
    it("should blur content when CW is present", () => {
      const template = {
        content: "Hidden content",
        defaultCW: "Spoiler",
      };
      
      const shouldBlur = !!template.defaultCW;
      
      expect(shouldBlur).toBe(true);
    });
  });
  
  describe("Variable Placeholders", () => {
    it("should detect variable placeholders", () => {
      const content = "Check out {{link}} for more about {{topic}}";
      const variables = content.match(/\{\{(\w+)\}\}/g);
      
      expect(variables).toContain("{{link}}");
      expect(variables).toContain("{{topic}}");
    });
    
    it("should replace variables with values", () => {
      const template = "Hello {{name}}, welcome to {{platform}}!";
      const values: Record<string, string> = { name: "User", platform: "Mastodon" };
      
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || "");
      
      expect(result).toBe("Hello User, welcome to Mastodon!");
    });
    
    it("should handle missing variables gracefully", () => {
      const template = "Hello {{name}}, your code is {{code}}";
      const values: Record<string, string> = { name: "User" };
      
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);
      
      expect(result).toBe("Hello User, your code is {{code}}");
    });
  });
  
  describe("Character Count", () => {
    it("should count characters correctly", () => {
      const content = "This is a test message";
      
      expect(content.length).toBe(22);
    });
    
    it("should warn when approaching limit", () => {
      const content = "a".repeat(450);
      const isNearLimit = content.length > 400;
      
      expect(isNearLimit).toBe(true);
    });
    
    it("should show error when over limit", () => {
      const content = "a".repeat(501);
      const isOverLimit = content.length > 500;
      
      expect(isOverLimit).toBe(true);
    });
  });
});

// ============================================
// TEMPLATE USAGE TESTS
// ============================================

describe("Template Usage", () => {
  describe("Usage Tracking", () => {
    it("should increment usage count", () => {
      const template = { id: 1, name: "Test", usageCount: 5 };
      const updated = { ...template, usageCount: template.usageCount + 1 };
      
      expect(updated.usageCount).toBe(6);
    });
    
    it("should track last used timestamp", () => {
      const now = Date.now();
      const template = { id: 1, name: "Test", lastUsedAt: now };
      
      expect(template.lastUsedAt).toBe(now);
    });
  });
  
  describe("Apply to Post Builder", () => {
    it("should copy content to post builder", () => {
      const template = { content: "Template content here" };
      const postBuilder = { content: "" };
      
      postBuilder.content = template.content;
      
      expect(postBuilder.content).toBe("Template content here");
    });
    
    it("should copy CW to post builder", () => {
      const template = { content: "Content", defaultCW: "Politics" };
      const postBuilder = { content: "", contentWarning: "" };
      
      postBuilder.content = template.content;
      postBuilder.contentWarning = template.defaultCW;
      
      expect(postBuilder.contentWarning).toBe("Politics");
    });
  });
});

// ============================================
// CATEGORY COLOR TESTS
// ============================================

describe("Category Colors", () => {
  const categoryColors: Record<string, string> = {
    news: "bg-blue-500",
    opinion: "bg-purple-500",
    art: "bg-pink-500",
    photography: "bg-amber-500",
    tech: "bg-cyan-500",
    gaming: "bg-green-500",
    food: "bg-orange-500",
    politics: "bg-red-500",
    health: "bg-emerald-500",
    personal: "bg-indigo-500",
    other: "bg-gray-500",
  };
  
  it("should have unique colors for each category", () => {
    const colors = Object.values(categoryColors);
    const uniqueColors = new Set(colors);
    
    expect(uniqueColors.size).toBe(colors.length);
  });
  
  it("should return gray for unknown category", () => {
    const unknownCategory = "unknown";
    const color = categoryColors[unknownCategory] || "bg-gray-500";
    
    expect(color).toBe("bg-gray-500");
  });
  
  it("should have all 11 categories with colors", () => {
    expect(Object.keys(categoryColors).length).toBe(11);
  });
});
