import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { generateImage } from "./_core/imageGeneration";
import { notifyOwner } from "./_core/notification";
// Storage helpers available if needed
// import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as db from "./db";
import type { InsertPost } from "../drizzle/schema";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const platformSchema = z.enum(["linkedin", "twitter", "facebook", "instagram", "all"]);
const postStatusSchema = z.enum(["draft", "scheduled", "published", "failed"]);
const knowledgeBaseTypeSchema = z.enum(["brand_guideline", "swipe_file", "ai_instruction", "testimonial", "faq", "other"]);
const teamRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);
const accessibilityIssueTypeSchema = z.enum(["navigation", "screen_reader", "keyboard", "visual", "cognitive", "other"]);

// ============================================
// AI CONTENT GENERATION HELPERS
// ============================================

/**
 * Builds the AI context from user's knowledge base and writing style
 */
async function buildAiContext(userId: number) {
  const knowledgeItems = await db.getAiContextItems(userId);
  const user = await db.getUserById(userId);
  
  let context = "";
  
  // Add writing style profile
  if (user?.writingStyleProfile) {
    const style = user.writingStyleProfile;
    context += `Writing Style Guidelines:\n`;
    if (style.tone) context += `- Tone: ${style.tone}\n`;
    if (style.formality) context += `- Formality: ${style.formality}\n`;
    if (style.industry) context += `- Industry: ${style.industry}\n`;
    if (style.targetAudience) context += `- Target Audience: ${style.targetAudience}\n`;
    if (style.sampleContent?.length) {
      context += `- Sample Content Style:\n${style.sampleContent.slice(0, 3).join('\n---\n')}\n`;
    }
    context += "\n";
  }
  
  // Add knowledge base items
  if (knowledgeItems.length > 0) {
    context += "Brand Knowledge Base:\n";
    knowledgeItems.forEach(item => {
      context += `[${item.type.toUpperCase()}] ${item.title}:\n${item.content}\n\n`;
    });
  }
  
  return context;
}

/**
 * Checks content for accessibility issues and returns a score with suggestions
 */
async function checkAccessibility(postContent: string, platform: string) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an accessibility expert specializing in social media content. Analyze the given content for accessibility issues based on WCAG guidelines and social media best practices.

Check for:
1. Use of ALL CAPS (hard to read for screen readers)
2. Excessive emoji usage (screen readers read each one)
3. Missing alt text indicators for images
4. Complex language (aim for 8th grade reading level)
5. Hashtag accessibility (CamelCase for multi-word hashtags)
6. Color contrast mentions without alternatives
7. Link text clarity (avoid "click here")
8. Abbreviations without explanations
9. Content structure and readability

Return a JSON response with:
- score: 0-100 accessibility score
- issues: array of {type, message, severity, suggestion}
- summary: brief accessibility summary`
      },
      {
        role: "user",
        content: `Platform: ${platform}\n\nContent to analyze:\n${postContent}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "accessibility_check",
        strict: true,
        schema: {
          type: "object",
          properties: {
            score: { type: "integer", description: "Accessibility score from 0-100" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                  severity: { type: "string", enum: ["error", "warning", "info"] },
                  suggestion: { type: "string" }
                },
                required: ["type", "message", "severity", "suggestion"],
                additionalProperties: false
              }
            },
            summary: { type: "string" }
          },
          required: ["score", "issues", "summary"],
          additionalProperties: false
        }
      }
    }
  });
  
  const accessContent = response.choices[0].message.content;
  const accessContentStr = typeof accessContent === 'string' ? accessContent : JSON.stringify(accessContent);
  return JSON.parse(accessContentStr || "{}");
}

/**
 * Platform-specific content formatting
 */
const platformLimits: Record<string, { chars: number; hashtags: number; tips: string }> = {
  linkedin: {
    chars: 3000,
    hashtags: 5,
    tips: "Professional tone, storytelling works well, use line breaks for readability"
  },
  twitter: {
    chars: 280,
    hashtags: 2,
    tips: "Concise, punchy, conversation starters work well"
  },
  facebook: {
    chars: 63206,
    hashtags: 3,
    tips: "Personal, engaging, questions drive comments"
  },
  instagram: {
    chars: 2200,
    hashtags: 30,
    tips: "Visual-first, storytelling captions, hashtags at end"
  }
};

// ============================================
// ROUTERS
// ============================================

export const appRouter = router({
  system: systemRouter,
  
  // ============================================
  // AUTH ROUTER
  // ============================================
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================
  // USER PREFERENCES ROUTER
  // ============================================
  user: router({
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return {
        accessibilityPreferences: user?.accessibilityPreferences || {},
        writingStyleProfile: user?.writingStyleProfile || {},
        subscriptionTier: user?.subscriptionTier || "free",
        monthlyPostsGenerated: user?.monthlyPostsGenerated || 0
      };
    }),
    
    updateAccessibilityPreferences: protectedProcedure
      .input(z.object({
        highContrast: z.boolean().optional(),
        dyslexiaFont: z.boolean().optional(),
        fontSize: z.enum(["small", "medium", "large", "xlarge"]).optional(),
        reduceMotion: z.boolean().optional(),
        screenReaderOptimized: z.boolean().optional(),
        voiceInputEnabled: z.boolean().optional(),
        keyboardShortcutsEnabled: z.boolean().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPreferences(ctx.user.id, {
          accessibilityPreferences: input
        });
        return { success: true };
      }),
    
    updateWritingStyle: protectedProcedure
      .input(z.object({
        tone: z.string().optional(),
        formality: z.enum(["casual", "professional", "academic"]).optional(),
        industry: z.string().optional(),
        targetAudience: z.string().optional(),
        sampleContent: z.array(z.string()).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPreferences(ctx.user.id, {
          writingStyleProfile: input
        });
        return { success: true };
      }),
  }),

  // ============================================
  // AI CONTENT GENERATION ROUTER
  // ============================================
  ai: router({
    generateIdeas: protectedProcedure
      .input(z.object({
        topic: z.string().optional(),
        platform: platformSchema,
        count: z.number().min(1).max(10).default(5)
      }))
      .mutation(async ({ ctx, input }) => {
        const aiContext = await buildAiContext(ctx.user.id);
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a creative content strategist helping generate engaging social media content ideas. Focus on accessibility and inclusivity in your suggestions.

${aiContext}

Generate content ideas that are:
1. Engaging and shareable
2. Accessible to people with disabilities
3. Appropriate for the specified platform
4. Aligned with the user's brand voice and style`
            },
            {
              role: "user",
              content: `Generate ${input.count} content ideas for ${input.platform}${input.topic ? ` about: ${input.topic}` : ""}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "content_ideas",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        hook: { type: "string" },
                        contentType: { type: "string" },
                        estimatedEngagement: { type: "string" }
                      },
                      required: ["title", "description", "hook", "contentType", "estimatedEngagement"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["ideas"],
                additionalProperties: false
              }
            }
          }
        });
        
        const ideasContent = response.choices[0].message.content;
        const ideasStr = typeof ideasContent === 'string' ? ideasContent : JSON.stringify(ideasContent);
        return JSON.parse(ideasStr || '{"ideas":[]}');
      }),
    
    generatePost: protectedProcedure
      .input(z.object({
        idea: z.string(),
        platform: platformSchema,
        tone: z.string().optional(),
        includeHashtags: z.boolean().default(true),
        includeEmoji: z.boolean().default(false),
        templateId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        // Check usage limits for free tier
        const user = await db.getUserById(ctx.user.id);
        if (user?.subscriptionTier === "free" && (user.monthlyPostsGenerated || 0) >= 10) {
          throw new Error("Monthly post limit reached. Upgrade to Creator tier for unlimited posts.");
        }
        
        const aiContext = await buildAiContext(ctx.user.id);
        const platformInfo = platformLimits[input.platform] || platformLimits.linkedin;
        
        let templateContext = "";
        if (input.templateId) {
          const template = await db.getTemplateById(input.templateId);
          if (template?.contentStructure) {
            templateContext = `\nUse this template structure:\n${JSON.stringify(template.contentStructure)}`;
            await db.incrementTemplateUsage(input.templateId);
          }
        }
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert social media content writer specializing in accessible, engaging content.

${aiContext}

Platform: ${input.platform}
Character limit: ${platformInfo.chars}
Recommended hashtags: ${platformInfo.hashtags}
Platform tips: ${platformInfo.tips}
${templateContext}

Write content that is:
1. Accessible (avoid ALL CAPS, use CamelCase hashtags, limit emojis)
2. Engaging and authentic
3. Within platform limits
4. Aligned with the user's voice and style
${input.includeEmoji ? "Include appropriate emojis sparingly" : "Avoid emojis"}
${input.includeHashtags ? "Include relevant hashtags using CamelCase" : "Do not include hashtags"}`
            },
            {
              role: "user",
              content: `Write a ${input.platform} post about: ${input.idea}${input.tone ? `\nTone: ${input.tone}` : ""}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "generated_post",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  hashtags: { type: "array", items: { type: "string" } },
                  suggestedImagePrompt: { type: "string" },
                  accessibilityNotes: { type: "string" }
                },
                required: ["content", "hashtags", "suggestedImagePrompt", "accessibilityNotes"],
                additionalProperties: false
              }
            }
          }
        });
        
        const resultContent = response.choices[0].message.content;
        const resultStr = typeof resultContent === 'string' ? resultContent : JSON.stringify(resultContent);
        const result = JSON.parse(resultStr || "{}");
        
        // Increment usage counter
        await db.incrementUserPostCount(ctx.user.id);
        
        // Run accessibility check
        const accessibilityResult = await checkAccessibility(result.content, input.platform);
        
        return {
          ...result,
          accessibility: accessibilityResult
        };
      }),
    
    rewriteContent: protectedProcedure
      .input(z.object({
        content: z.string(),
        instruction: z.string(),
        platform: platformSchema
      }))
      .mutation(async ({ ctx, input }) => {
        const aiContext = await buildAiContext(ctx.user.id);
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert content editor. Rewrite the given content according to the instruction while maintaining accessibility best practices.

${aiContext}`
            },
            {
              role: "user",
              content: `Original content:\n${input.content}\n\nInstruction: ${input.instruction}\n\nPlatform: ${input.platform}`
            }
          ]
        });
        
        const rewriteContent = response.choices[0].message.content;
        const rewrittenContent = (typeof rewriteContent === 'string' ? rewriteContent : String(rewriteContent)) || input.content;
        const accessibilityResult = await checkAccessibility(rewrittenContent, input.platform);
        
        return {
          content: rewrittenContent,
          accessibility: accessibilityResult
        };
      }),
    
    checkAccessibility: protectedProcedure
      .input(z.object({
        content: z.string(),
        platform: platformSchema
      }))
      .mutation(async ({ input }) => {
        return await checkAccessibility(input.content, input.platform);
      }),
    
    generateAltText: protectedProcedure
      .input(z.object({
        imageUrl: z.string(),
        context: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an accessibility expert. Generate descriptive, concise alt text for images that helps screen reader users understand the image content. Alt text should be 125 characters or less when possible."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Generate alt text for this image.${input.context ? ` Context: ${input.context}` : ""}`
                },
                {
                  type: "image_url",
                  image_url: { url: input.imageUrl }
                }
              ]
            }
          ]
        });
        
        const altContent = response.choices[0].message.content;
        return {
          altText: (typeof altContent === 'string' ? altContent : String(altContent)) || "Image"
        };
      }),
    
    generateImage: protectedProcedure
      .input(z.object({
        prompt: z.string(),
        postId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await generateImage({
          prompt: `Social media graphic: ${input.prompt}. Style: modern, clean, accessible with good contrast.`
        });
        
        const imageUrl = result.url || '';
        if (!imageUrl) {
          throw new Error('Image generation failed - no URL returned');
        }
        
        // Save to database
        const imageId = await db.saveGeneratedImage({
          userId: ctx.user.id,
          postId: input.postId,
          prompt: input.prompt,
          imageUrl: imageUrl,
          fileKey: `generated-${nanoid()}`
        });
        
        // Generate alt text for the image
        const altTextResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Generate concise, descriptive alt text for this AI-generated image."
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Image prompt was: ${input.prompt}` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ]
        });
        
        const altTextContent = altTextResponse.choices[0].message.content;
        const altText = (typeof altTextContent === 'string' ? altTextContent : String(altTextContent)) || input.prompt;
        
        return {
          imageUrl,
          altText,
          imageId
        };
      }),
  }),

  // ============================================
  // VOICE TRANSCRIPTION ROUTER
  // ============================================
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.string().optional(),
        postId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
          prompt: "Transcribe this voice recording for social media content creation"
        });
        
        // Check if it's an error response
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Save transcription to database
        await db.saveVoiceTranscription({
          userId: ctx.user.id,
          postId: input.postId,
          audioUrl: input.audioUrl,
          transcribedText: result.text,
          language: result.language,
          duration: result.duration ? Math.round(result.duration) : undefined
        });
        
        return {
          text: result.text,
          language: result.language,
          segments: result.segments
        };
      }),
    
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserTranscriptions(ctx.user.id, input.limit);
      }),
  }),

  // ============================================
  // POSTS ROUTER
  // ============================================
  posts: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        content: z.string(),
        platform: platformSchema,
        status: postStatusSchema.default("draft"),
        scheduledAt: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        altTexts: z.record(z.string(), z.string()).optional(),
        hashtags: z.array(z.string()).optional(),
        templateId: z.number().optional(),
        teamId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        // Run accessibility check
        const accessibilityResult = await checkAccessibility(input.content, input.platform);
        
        const postId = await db.createPost({
          userId: ctx.user.id,
          teamId: input.teamId,
          title: input.title,
          content: input.content,
          platform: input.platform,
          status: input.status,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          mediaUrls: input.mediaUrls,
          altTexts: input.altTexts as Record<string, string> | undefined,
          hashtags: input.hashtags,
          templateId: input.templateId,
          accessibilityScore: accessibilityResult.score,
          accessibilityIssues: accessibilityResult.issues
        });
        
        return { postId, accessibility: accessibilityResult };
      }),
    
    list: protectedProcedure
      .input(z.object({
        status: postStatusSchema.optional(),
        platform: platformSchema.optional(),
        limit: z.number().default(50),
        offset: z.number().default(0)
      }))
      .query(async ({ ctx, input }) => {
        return await db.getUserPosts(ctx.user.id, input);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new Error("Post not found");
        }
        return post;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        platform: platformSchema.optional(),
        status: postStatusSchema.optional(),
        scheduledAt: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        altTexts: z.record(z.string(), z.string()).optional(),
        hashtags: z.array(z.string()).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new Error("Post not found");
        }
        
        const updateData: Partial<InsertPost> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.content !== undefined) {
          updateData.content = input.content;
          // Re-run accessibility check
          const accessibilityResult = await checkAccessibility(input.content, (input.platform || post.platform) as string);
          updateData.accessibilityScore = accessibilityResult.score;
          updateData.accessibilityIssues = accessibilityResult.issues;
        }
        if (input.platform !== undefined) updateData.platform = input.platform;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.scheduledAt !== undefined) updateData.scheduledAt = new Date(input.scheduledAt);
        if (input.mediaUrls !== undefined) updateData.mediaUrls = input.mediaUrls;
        if (input.altTexts !== undefined) updateData.altTexts = input.altTexts as Record<string, string>;
        if (input.hashtags !== undefined) updateData.hashtags = input.hashtags;
        
        await db.updatePost(input.id, updateData);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new Error("Post not found");
        }
        await db.deletePost(input.id);
        return { success: true };
      }),
    
    getScheduled: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string()
      }))
      .query(async ({ ctx, input }) => {
        return await db.getScheduledPosts(
          ctx.user.id,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
  }),

  // ============================================
  // TEMPLATES ROUTER
  // ============================================
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const userTemplates = await db.getUserTemplates(ctx.user.id);
      const publicTemplates = await db.getPublicTemplates();
      return { userTemplates, publicTemplates };
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplateById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["educational", "promotional", "personal_story", "engagement", "announcement", "custom"]).default("custom"),
        contentStructure: z.object({
          sections: z.array(z.object({
            name: z.string(),
            placeholder: z.string(),
            required: z.boolean(),
            aiPrompt: z.string().optional()
          })),
          framework: z.enum(["aida", "pas", "slay", "hook_story_offer", "custom"]).optional()
        }),
        platforms: z.array(platformSchema.exclude(["all"])),
        isPublic: z.boolean().default(false)
      }))
      .mutation(async ({ ctx, input }) => {
        const templateId = await db.createTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          contentStructure: input.contentStructure,
          platforms: input.platforms,
          isPublic: input.isPublic,
          isAccessible: true
        });
        return { templateId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["educational", "promotional", "personal_story", "engagement", "announcement", "custom"]).optional(),
        contentStructure: z.object({
          sections: z.array(z.object({
            name: z.string(),
            placeholder: z.string(),
            required: z.boolean(),
            aiPrompt: z.string().optional()
          })),
          framework: z.enum(["aida", "pas", "slay", "hook_story_offer", "custom"]).optional()
        }).optional(),
        isPublic: z.boolean().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new Error("Template not found");
        }
        await db.updateTemplate(input.id, input);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new Error("Template not found");
        }
        await db.deleteTemplate(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // KNOWLEDGE BASE ROUTER
  // ============================================
  knowledgeBase: router({
    list: protectedProcedure
      .input(z.object({
        type: knowledgeBaseTypeSchema.optional()
      }))
      .query(async ({ ctx, input }) => {
        return await db.getUserKnowledgeBase(ctx.user.id, input.type);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const item = await db.getKnowledgeBaseItem(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Item not found");
        }
        return item;
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
        type: knowledgeBaseTypeSchema,
        tags: z.array(z.string()).optional(),
        includeInAiContext: z.boolean().default(true),
        priority: z.number().default(0),
        teamId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const itemId = await db.createKnowledgeBaseItem({
          userId: ctx.user.id,
          ...input
        });
        return { itemId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        type: knowledgeBaseTypeSchema.optional(),
        tags: z.array(z.string()).optional(),
        includeInAiContext: z.boolean().optional(),
        priority: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getKnowledgeBaseItem(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Item not found");
        }
        await db.updateKnowledgeBaseItem(input.id, input);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getKnowledgeBaseItem(input.id);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("Item not found");
        }
        await db.deleteKnowledgeBaseItem(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // TEAMS ROUTER
  // ============================================
  teams: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserTeams(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const team = await db.getTeamById(input.id);
        const membership = await db.getTeamMember(input.id, ctx.user.id);
        if (!team || !membership) {
          throw new Error("Team not found");
        }
        const members = await db.getTeamMembers(input.id);
        return { team, members, userRole: membership.role };
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const teamId = await db.createTeam({
          name: input.name,
          description: input.description,
          ownerId: ctx.user.id
        });
        
        // Add creator as owner
        await db.addTeamMember({
          teamId,
          userId: ctx.user.id,
          role: "owner",
          acceptedAt: new Date()
        });
        
        return { teamId };
      }),
    
    addMember: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number(),
        role: teamRoleSchema.default("viewer")
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getTeamMember(input.teamId, ctx.user.id);
        if (!membership || !["owner", "admin"].includes(membership.role)) {
          throw new Error("Not authorized to add members");
        }
        
        await db.addTeamMember({
          teamId: input.teamId,
          userId: input.userId,
          role: input.role
        });
        
        return { success: true };
      }),
    
    removeMember: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getTeamMember(input.teamId, ctx.user.id);
        if (!membership || !["owner", "admin"].includes(membership.role)) {
          throw new Error("Not authorized to remove members");
        }
        
        await db.removeTeamMember(input.teamId, input.userId);
        return { success: true };
      }),
    
    getPendingApprovals: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getTeamMember(input.teamId, ctx.user.id);
        if (!membership) {
          throw new Error("Not a team member");
        }
        return await db.getPendingApprovals(input.teamId);
      }),
  }),

  // ============================================
  // ANALYTICS ROUTER
  // ============================================
  analytics: router({
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserAnalyticsSummary(ctx.user.id);
    }),
    
    getPostAnalytics: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        const post = await db.getPostById(input.postId);
        if (!post || post.userId !== ctx.user.id) {
          throw new Error("Post not found");
        }
        return post.analytics || {};
      }),
  }),

  // ============================================
  // ACCESSIBILITY REPORTS ROUTER
  // ============================================
  accessibilityReports: router({
    create: protectedProcedure
      .input(z.object({
        issueType: accessibilityIssueTypeSchema,
        description: z.string(),
        pageUrl: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const reportId = await db.createAccessibilityReport({
          userId: ctx.user.id,
          ...input
        });
        
        // Notify owner about new accessibility report
        await notifyOwner({
          title: "New Accessibility Issue Report",
          content: `User reported a ${input.issueType} issue:\n\n${input.description}\n\nPage: ${input.pageUrl || "Not specified"}`
        });
        
        return { reportId };
      }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can see all reports
      if (ctx.user.role === "admin") {
        return await db.getOpenAccessibilityReports();
      }
      return [];
    }),
  }),

  // ============================================
  // GENERATED IMAGES ROUTER
  // ============================================
  images: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserGeneratedImages(ctx.user.id, input.limit);
      }),
  }),

  // ============================================
  // SETTINGS ROUTER
  // ============================================
  settings: router({
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().email().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, {
          name: input.name,
          email: input.email
        });
        return { success: true };
      }),
    
    updateAccessibilityPreferences: protectedProcedure
      .input(z.object({
        highContrast: z.boolean().optional(),
        dyslexiaFont: z.boolean().optional(),
        fontSize: z.enum(["small", "medium", "large", "xlarge"]).optional(),
        reduceMotion: z.boolean().optional(),
        screenReaderOptimized: z.boolean().optional(),
        voiceInputEnabled: z.boolean().optional(),
        keyboardShortcutsEnabled: z.boolean().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserAccessibilityPreferences(ctx.user.id, input);
        return { success: true };
      }),
    
    updateWritingStyle: protectedProcedure
      .input(z.object({
        tone: z.string().optional(),
        formality: z.enum(["casual", "professional", "academic"]).optional(),
        industry: z.string().optional(),
        targetAudience: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserWritingStyle(ctx.user.id, input);
        return { success: true };
      }),
    
    updateNotificationPreferences: protectedProcedure
      .input(z.object({
        emailEnabled: z.boolean().optional(),
        emailDigestFrequency: z.enum(["realtime", "daily", "weekly", "never"]).optional(),
        notifyOnPostPublished: z.boolean().optional(),
        notifyOnPostFailed: z.boolean().optional(),
        notifyOnTeamInvite: z.boolean().optional(),
        notifyOnApprovalRequest: z.boolean().optional(),
        notifyOnApprovalDecision: z.boolean().optional(),
        notifyOnNewFeatures: z.boolean().optional(),
        notifyOnAccessibilityTips: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        soundEnabled: z.boolean().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
    
    getNotificationPreferences: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getNotificationPreferences(ctx.user.id);
      }),
  }),

  // ============================================
  // SOCIAL ACCOUNTS ROUTER
  // ============================================
  social: router({
    getConnectedAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserSocialAccounts(ctx.user.id);
      }),
    
    disconnectAccount: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.disconnectSocialAccountByUser(ctx.user.id, input.accountId);
        return { success: true };
      }),
    
    getConnectionStatus: protectedProcedure
      .input(z.object({ platform: platformSchema }))
      .query(async ({ ctx, input }) => {
        const account = await db.getSocialAccountByPlatform(ctx.user.id, input.platform);
        return {
          connected: !!account,
          accountName: account?.accountName,
          tokenExpired: account?.tokenExpiresAt ? new Date(account.tokenExpiresAt) < new Date() : false
        };
      }),
    
    publishPost: protectedProcedure
      .input(z.object({
        postId: z.number(),
        platforms: z.array(platformSchema)
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getPostById(input.postId);
        if (!post || post.userId !== ctx.user.id) {
          throw new Error("Post not found");
        }
        
        const results: { platform: string; success: boolean; error?: string }[] = [];
        
        for (const platform of input.platforms) {
          const account = await db.getSocialAccountByPlatform(ctx.user.id, platform);
          if (!account) {
            results.push({ platform, success: false, error: "Account not connected" });
            continue;
          }
          
          try {
            // Platform-specific publishing logic would go here
            // For now, we'll simulate success
            results.push({ platform, success: true });
          } catch (error) {
            results.push({ platform, success: false, error: String(error) });
          }
        }
        
        // Update post status
        const allSucceeded = results.every(r => r.success);
        await db.updatePost(input.postId, {
          status: allSucceeded ? "published" : "failed",
          publishedAt: allSucceeded ? new Date() : undefined
        });
        
        return { results };
      }),
  }),

  // ============================================
  // STRIPE CHECKOUT ROUTER
  // ============================================
  stripe: router({
    createCheckoutSession: protectedProcedure
      .input(z.object({
        tierId: z.enum(["creator", "pro"]),
        billingPeriod: z.enum(["monthly", "yearly"])
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("./stripe/checkout");
        
        const checkoutUrl = await createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name || undefined,
          tierId: input.tierId,
          billingPeriod: input.billingPeriod,
          origin: ctx.req.headers.origin || "https://accessai.app"
        });
        
        return { checkoutUrl };
      }),
    
    createPortalSession: protectedProcedure
      .mutation(async ({ ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.stripeCustomerId) {
          throw new Error("No subscription found");
        }
        
        const { createCustomerPortalSession } = await import("./stripe/checkout");
        const portalUrl = await createCustomerPortalSession(
          user.stripeCustomerId,
          `${ctx.req.headers.origin || "https://accessai.app"}/settings/billing`
        );
        
        return { portalUrl };
      }),
    
    getSubscriptionStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          return { tier: "free", status: "active" };
        }
        
        return {
          tier: user.subscriptionTier || "free",
          status: user.subscriptionStatus || "active",
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: user.stripeSubscriptionId
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
