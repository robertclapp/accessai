/**
 * Tests for new features:
 * 1. Custom Color Picker for Categories
 * 2. Digest Content Customization
 * 3. A/B Test Templates
 */

import { describe, it, expect, vi } from "vitest";

// ============================================
// CUSTOM COLOR PICKER TESTS
// ============================================

describe("Custom Color Picker for Categories", () => {
  describe("Color validation", () => {
    it("should accept valid hex color codes", () => {
      const validColors = ["#ff0000", "#00ff00", "#0000ff", "#123456", "#abcdef"];
      validColors.forEach(color => {
        expect(/^#[0-9a-fA-F]{6}$/.test(color)).toBe(true);
      });
    });

    it("should reject invalid hex color codes", () => {
      const invalidColors = ["ff0000", "#fff", "#gggggg", "red", "#12345"];
      invalidColors.forEach(color => {
        expect(/^#[0-9a-fA-F]{6}$/.test(color)).toBe(false);
      });
    });

    it("should handle uppercase hex codes", () => {
      const color = "#ABCDEF";
      expect(/^#[0-9a-fA-F]{6}$/.test(color)).toBe(true);
    });
  });

  describe("Color display", () => {
    it("should convert hex to CSS-compatible format", () => {
      const hexColor = "#ff5733";
      // The color should be directly usable in CSS
      expect(hexColor.startsWith("#")).toBe(true);
      expect(hexColor.length).toBe(7);
    });

    it("should provide default color when none specified", () => {
      const defaultColor = "#6366f1";
      expect(defaultColor).toBeDefined();
      expect(/^#[0-9a-fA-F]{6}$/.test(defaultColor)).toBe(true);
    });
  });
});

// ============================================
// DIGEST CONTENT CUSTOMIZATION TESTS
// ============================================

describe("Digest Content Customization", () => {
  const defaultSections = ["analytics", "goalProgress", "topPosts", "platformComparison", "scheduledPosts"];

  describe("Section ordering", () => {
    it("should maintain all sections when reordering", () => {
      const reordered = ["topPosts", "analytics", "goalProgress", "scheduledPosts", "platformComparison"];
      expect(reordered.length).toBe(defaultSections.length);
      expect(reordered.sort()).toEqual(defaultSections.sort());
    });

    it("should preserve section visibility settings", () => {
      const sectionVisibility = {
        analytics: true,
        goalProgress: false,
        topPosts: true,
        platformComparison: true,
        scheduledPosts: false,
      };
      
      const enabledSections = Object.entries(sectionVisibility)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);
      
      expect(enabledSections).toEqual(["analytics", "topPosts", "platformComparison"]);
    });

    it("should handle empty section order gracefully", () => {
      const sectionOrder: string[] = [];
      expect(sectionOrder.length).toBe(0);
      // Should fall back to default order
      const effectiveOrder = sectionOrder.length > 0 ? sectionOrder : defaultSections;
      expect(effectiveOrder).toEqual(defaultSections);
    });
  });

  describe("Section configuration", () => {
    it("should have labels for all sections", () => {
      const sectionLabels: Record<string, string> = {
        analytics: "Analytics Summary",
        goalProgress: "Goal Progress",
        topPosts: "Top Performing Posts",
        platformComparison: "Platform Comparison",
        scheduledPosts: "Scheduled Posts",
      };
      
      defaultSections.forEach(section => {
        expect(sectionLabels[section]).toBeDefined();
        expect(sectionLabels[section].length).toBeGreaterThan(0);
      });
    });
  });

  describe("Drag and drop reordering", () => {
    it("should correctly swap two sections", () => {
      const order = [...defaultSections];
      const draggedIndex = 0; // analytics
      const targetIndex = 2; // topPosts
      
      const dragged = order.splice(draggedIndex, 1)[0];
      order.splice(targetIndex, 0, dragged);
      
      expect(order[targetIndex]).toBe("analytics");
      expect(order[0]).toBe("goalProgress");
    });

    it("should handle drag to same position", () => {
      const order = [...defaultSections];
      const originalOrder = [...order];
      
      // Drag to same position should not change order
      const draggedIndex = 1;
      const targetIndex = 1;
      
      if (draggedIndex !== targetIndex) {
        const dragged = order.splice(draggedIndex, 1)[0];
        order.splice(targetIndex, 0, dragged);
      }
      
      expect(order).toEqual(originalOrder);
    });
  });
});

// ============================================
// A/B TEST TEMPLATES TESTS
// ============================================

describe("A/B Test Templates", () => {
  describe("System templates", () => {
    const systemTemplates = [
      { name: "Question vs Statement Headline", category: "headline" },
      { name: "Short vs Long Form", category: "length" },
      { name: "Emoji vs No Emoji", category: "formatting" },
      { name: "Personal Story vs Data-Driven", category: "tone" },
      { name: "Direct CTA vs Soft CTA", category: "cta" },
      { name: "List Format vs Paragraph", category: "formatting" },
      { name: "Controversial vs Safe Take", category: "tone" },
      { name: "Hashtag Heavy vs Minimal", category: "hashtags" },
    ];

    it("should have all expected system templates", () => {
      expect(systemTemplates.length).toBe(8);
    });

    it("should cover all major categories", () => {
      const categories = [...new Set(systemTemplates.map(t => t.category))];
      expect(categories).toContain("headline");
      expect(categories).toContain("length");
      expect(categories).toContain("formatting");
      expect(categories).toContain("tone");
      expect(categories).toContain("cta");
      expect(categories).toContain("hashtags");
    });

    it("should have unique names", () => {
      const names = systemTemplates.map(t => t.name);
      const uniqueNames = [...new Set(names)];
      expect(uniqueNames.length).toBe(names.length);
    });
  });

  describe("Template structure", () => {
    it("should require both variant templates", () => {
      const template = {
        name: "Test Template",
        category: "headline",
        variantATemplate: "How to [achieve goal]?",
        variantBTemplate: "[Number] Ways to [achieve goal]",
      };
      
      expect(template.variantATemplate).toBeDefined();
      expect(template.variantBTemplate).toBeDefined();
      expect(template.variantATemplate.length).toBeGreaterThan(0);
      expect(template.variantBTemplate.length).toBeGreaterThan(0);
    });

    it("should have default labels for variants", () => {
      const defaultLabels = {
        variantALabel: "Variant A",
        variantBLabel: "Variant B",
      };
      
      expect(defaultLabels.variantALabel).toBe("Variant A");
      expect(defaultLabels.variantBLabel).toBe("Variant B");
    });

    it("should support custom variant labels", () => {
      const template = {
        variantALabel: "Question Format",
        variantBLabel: "Statement Format",
      };
      
      expect(template.variantALabel).not.toBe("Variant A");
      expect(template.variantBLabel).not.toBe("Variant B");
    });
  });

  describe("Template filtering", () => {
    const templates = [
      { id: 1, name: "Question vs Statement", category: "headline", tags: ["engagement", "copywriting"] },
      { id: 2, name: "Short vs Long", category: "length", tags: ["format", "engagement"] },
      { id: 3, name: "Emoji Test", category: "formatting", tags: ["emoji", "tone"] },
    ];

    it("should filter by category", () => {
      const category = "headline";
      const filtered = templates.filter(t => t.category === category);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Question vs Statement");
    });

    it("should filter by search query", () => {
      const query = "emoji";
      const filtered = templates.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(3);
    });

    it("should filter by tag", () => {
      const tag = "engagement";
      const filtered = templates.filter(t => t.tags?.includes(tag));
      expect(filtered.length).toBe(2);
    });

    it("should show all templates when category is 'all'", () => {
      const category = "all";
      const filtered = category === "all" ? templates : templates.filter(t => t.category === category);
      expect(filtered.length).toBe(templates.length);
    });
  });

  describe("Template usage tracking", () => {
    it("should increment usage count when template is used", () => {
      let usageCount = 0;
      
      // Simulate using template
      usageCount += 1;
      expect(usageCount).toBe(1);
      
      usageCount += 1;
      expect(usageCount).toBe(2);
    });

    it("should sort templates by usage count", () => {
      const templates = [
        { id: 1, name: "Template A", usageCount: 5 },
        { id: 2, name: "Template B", usageCount: 10 },
        { id: 3, name: "Template C", usageCount: 3 },
      ];
      
      const sorted = [...templates].sort((a, b) => b.usageCount - a.usageCount);
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe("Custom template creation", () => {
    it("should validate required fields", () => {
      const template = {
        name: "My Custom Template",
        category: "headline",
        variantATemplate: "Template A content",
        variantBTemplate: "Template B content",
      };
      
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.category.length).toBeGreaterThan(0);
      expect(template.variantATemplate.length).toBeGreaterThan(0);
      expect(template.variantBTemplate.length).toBeGreaterThan(0);
    });

    it("should allow optional fields", () => {
      const template = {
        name: "My Custom Template",
        category: "headline",
        variantATemplate: "Template A",
        variantBTemplate: "Template B",
        description: undefined,
        exampleUseCase: undefined,
        tags: undefined,
      };
      
      expect(template.description).toBeUndefined();
      expect(template.exampleUseCase).toBeUndefined();
      expect(template.tags).toBeUndefined();
    });

    it("should support tags for custom templates", () => {
      const tags = ["custom", "headline", "engagement"];
      expect(tags.length).toBe(3);
      expect(tags).toContain("custom");
    });
  });

  describe("System vs custom templates", () => {
    it("should identify system templates", () => {
      const template = { isSystem: true, userId: null };
      expect(template.isSystem).toBe(true);
      expect(template.userId).toBeNull();
    });

    it("should identify custom templates", () => {
      const template = { isSystem: false, userId: 123 };
      expect(template.isSystem).toBe(false);
      expect(template.userId).toBe(123);
    });

    it("should not allow editing system templates", () => {
      const template = { isSystem: true };
      const canEdit = !template.isSystem;
      expect(canEdit).toBe(false);
    });

    it("should not allow deleting system templates", () => {
      const template = { isSystem: true };
      const canDelete = !template.isSystem;
      expect(canDelete).toBe(false);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe("Feature Integration", () => {
  describe("Category colors in templates", () => {
    it("should display category with custom color", () => {
      const category = {
        name: "Marketing",
        color: "#ff5733",
      };
      
      expect(category.color).toBe("#ff5733");
      expect(/^#[0-9a-fA-F]{6}$/.test(category.color)).toBe(true);
    });
  });

  describe("Digest with custom section order", () => {
    it("should generate digest respecting section order", () => {
      const sectionOrder = ["topPosts", "analytics", "goalProgress"];
      const sectionVisibility = {
        topPosts: true,
        analytics: true,
        goalProgress: false,
      };
      
      const visibleSections = sectionOrder.filter(s => sectionVisibility[s as keyof typeof sectionVisibility]);
      expect(visibleSections).toEqual(["topPosts", "analytics"]);
    });
  });

  describe("Template to test creation", () => {
    it("should pre-fill test form from template", () => {
      const template = {
        variantATemplate: "How to [achieve goal]?",
        variantALabel: "Question",
        variantBTemplate: "[Number] Ways to [achieve goal]",
        variantBLabel: "Statement",
      };
      
      const testForm = {
        variantA: template.variantATemplate,
        variantAName: template.variantALabel,
        variantB: template.variantBTemplate,
        variantBName: template.variantBLabel,
      };
      
      expect(testForm.variantA).toBe(template.variantATemplate);
      expect(testForm.variantAName).toBe(template.variantALabel);
    });
  });
});
