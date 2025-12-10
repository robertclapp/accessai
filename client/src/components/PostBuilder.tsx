/**
 * PostBuilder Component
 * 
 * The main content creation interface for AccessAI.
 * Supports multi-platform content creation with AI assistance,
 * voice input, accessibility checking, and image generation.
 * 
 * Accessibility features:
 * - Full keyboard navigation
 * - ARIA labels and live regions
 * - High contrast mode support
 * - Screen reader optimized
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  Send, 
  Save, 
  Calendar,
  Loader2,
  Copy,
  RefreshCw,
  Wand2,
  Hash,
  AtSign,
  Link as LinkIcon,
  Type,
  Lightbulb
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { VoiceRecorder } from "./VoiceRecorder";
import { AccessibilityChecker } from "./AccessibilityChecker";
import { PLATFORM_LIMITS, type Platform } from "@shared/types";

// Platform icons and colors
const platformConfig: Record<string, { icon: string; color: string; label: string }> = {
  linkedin: { icon: "in", color: "bg-blue-600", label: "LinkedIn" },
  twitter: { icon: "𝕏", color: "bg-black", label: "X (Twitter)" },
  facebook: { icon: "f", color: "bg-blue-500", label: "Facebook" },
  instagram: { icon: "📷", color: "bg-gradient-to-r from-purple-500 to-pink-500", label: "Instagram" },
  threads: { icon: "@", color: "bg-black", label: "Threads" },
  bluesky: { icon: "🦋", color: "bg-sky-500", label: "Bluesky" },
  mastodon: { icon: "🐘", color: "bg-purple-600", label: "Mastodon" }
};

interface PostBuilderProps {
  onPostCreated?: (postId: number) => void;
  initialContent?: string;
  initialPlatform?: Platform;
  templateId?: number;
  className?: string;
}

export function PostBuilder({
  onPostCreated,
  initialContent = "",
  initialPlatform = "linkedin",
  templateId,
  className = ""
}: PostBuilderProps) {
  // Content state
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [contentWarning, setContentWarning] = useState(""); // Mastodon CW/spoiler text
  
  // UI state
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [includeEmoji, setIncludeEmoji] = useState(false);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  
  // Generated content
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedAltText, setGeneratedAltText] = useState<string>("");
  const [accessibilityScore, setAccessibilityScore] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // API mutations
  const generatePostMutation = trpc.ai.generatePost.useMutation({
    onSuccess: (data) => {
      setContent(data.content);
      if (data.hashtags) {
        setHashtags(data.hashtags);
      }
      if (data.accessibility) {
        setAccessibilityScore(data.accessibility.score);
      }
      toast.success("Content generated!", {
        description: `Accessibility score: ${data.accessibility?.score || "N/A"}/100`
      });
    },
    onError: (error) => {
      toast.error("Failed to generate content", {
        description: error.message
      });
    }
  });
  
  const generateIdeasMutation = trpc.ai.generateIdeas.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.ideas.length} content ideas!`);
    }
  });
  
  const rewriteMutation = trpc.ai.rewriteContent.useMutation({
    onSuccess: (data) => {
      setContent(data.content);
      if (data.accessibility) {
        setAccessibilityScore(data.accessibility.score);
      }
      toast.success("Content rewritten!");
    }
  });
  
  const generateImageMutation = trpc.ai.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImageUrl(data.imageUrl);
      setGeneratedAltText(data.altText);
      toast.success("Image generated!");
    },
    onError: (error) => {
      toast.error("Failed to generate image", {
        description: error.message
      });
    }
  });
  
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      toast.success("Post saved as draft!");
      onPostCreated?.(data.postId);
    }
  });

  // Character count and limit
  const platformInfo = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.linkedin;
  const charCount = content.length;
  const charLimit = platformInfo.chars;
  const isOverLimit = charCount > charLimit;

  // Handle voice transcription
  const handleTranscription = useCallback((text: string) => {
    setContent(prev => prev ? `${prev}\n\n${text}` : text);
    setShowVoiceInput(false);
    textareaRef.current?.focus();
  }, []);

  // Handle hashtag addition
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      // Convert to CamelCase for accessibility
      const camelCaseTag = tag.split(/\s+/).map((word, i) => 
        i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join("");
      setHashtags([...hashtags, camelCaseTag]);
      setHashtagInput("");
    }
  };

  // Handle hashtag removal
  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  // Generate content from idea
  const handleGenerate = (idea: string) => {
    generatePostMutation.mutate({
      idea,
      platform,
      includeHashtags,
      includeEmoji,
      templateId
    });
  };

  // Rewrite content
  const handleRewrite = (instruction: string) => {
    if (!content.trim()) {
      toast.error("No content to rewrite");
      return;
    }
    rewriteMutation.mutate({
      content,
      instruction,
      platform
    });
  };

  // Generate image
  const handleGenerateImage = () => {
    const prompt = content.trim() || "Professional social media graphic";
    generateImageMutation.mutate({ prompt });
  };

  // Save as draft
  const handleSaveDraft = () => {
    if (!content.trim()) {
      toast.error("Please add some content first");
      return;
    }
    
    createPostMutation.mutate({
      title: title || undefined,
      content,
      platform,
      status: "draft",
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mediaUrls: generatedImageUrl ? [generatedImageUrl] : undefined,
      altTexts: generatedImageUrl && generatedAltText 
        ? { [generatedImageUrl]: generatedAltText } 
        : undefined,
      templateId,
      contentWarning: platform === "mastodon" && contentWarning.trim() ? contentWarning.trim() : undefined
    });
  };

  // Copy content to clipboard
  const handleCopy = async () => {
    const fullContent = hashtags.length > 0 
      ? `${content}\n\n${hashtags.map(t => `#${t}`).join(" ")}`
      : content;
    
    await navigator.clipboard.writeText(fullContent);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Create Post</CardTitle>
                <CardDescription>
                  Write accessible content for {platformConfig[platform]?.label || platform}
                </CardDescription>
              </div>
              
              {/* Platform Selector */}
              <Select 
                value={platform} 
                onValueChange={(v) => setPlatform(v as Platform)}
              >
                <SelectTrigger className="w-40" aria-label="Select platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(platformConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${config.color}`}>
                          {config.icon}
                        </span>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Title (optional) */}
            <div>
              <Label htmlFor="post-title" className="sr-only">Post title (optional)</Label>
              <Input
                id="post-title"
                placeholder="Post title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-describedby="title-hint"
              />
              <p id="title-hint" className="text-xs text-muted-foreground mt-1">
                For your reference only - not included in the post
              </p>
            </div>
            
            {/* Content Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="post-content">Content</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVoiceInput(!showVoiceInput)}
                    aria-label={showVoiceInput ? "Hide voice input" : "Show voice input"}
                    aria-pressed={showVoiceInput}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <span 
                    className={`text-sm ${isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}
                    aria-live="polite"
                  >
                    {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Voice Input */}
              {showVoiceInput && (
                <div className="mb-4">
                  <VoiceRecorder
                    onTranscription={handleTranscription}
                    onRecordingStart={() => {}}
                    onRecordingStop={() => {}}
                  />
                </div>
              )}
              
              <Textarea
                ref={textareaRef}
                id="post-content"
                placeholder={`Write your ${platformConfig[platform]?.label || platform} post here...\n\nTip: ${platformInfo.tips}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-y"
                aria-invalid={isOverLimit}
                aria-describedby="content-hint"
              />
              
              {isOverLimit && (
                <p id="content-hint" className="text-sm text-destructive mt-1" role="alert">
                  Content exceeds {platformConfig[platform]?.label || platform} character limit
                </p>
              )}
            </div>
            
            {/* Hashtags */}
            <div>
              <Label htmlFor="hashtag-input">Hashtags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="hashtag-input"
                  placeholder="Add hashtag (CamelCase recommended)"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHashtag();
                    }
                  }}
                  aria-describedby="hashtag-hint"
                />
                <Button 
                  variant="outline" 
                  onClick={addHashtag}
                  aria-label="Add hashtag"
                >
                  <Hash className="h-4 w-4" />
                </Button>
              </div>
              <p id="hashtag-hint" className="text-xs text-muted-foreground mt-1">
                Use CamelCase for multi-word hashtags (e.g., #AccessibleDesign) for screen reader compatibility
              </p>
              
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Added hashtags">
                  {hashtags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeHashtag(tag)}
                      role="listitem"
                      aria-label={`Remove hashtag ${tag}`}
                    >
                      #{tag}
                      <span aria-hidden="true">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Content Warning (Mastodon only) */}
            {platform === "mastodon" && (
              <CWPresetSelector
                contentWarning={contentWarning}
                setContentWarning={setContentWarning}
              />
            )}
            
            {/* Options */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-emoji"
                  checked={includeEmoji}
                  onCheckedChange={setIncludeEmoji}
                />
                <Label htmlFor="include-emoji" className="text-sm">
                  Include emoji
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="include-hashtags"
                  checked={includeHashtags}
                  onCheckedChange={setIncludeHashtags}
                />
                <Label htmlFor="include-hashtags" className="text-sm">
                  AI-generated hashtags
                </Label>
              </div>
            </div>
            
            <Separator />
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                disabled={!content.trim()}
                aria-label="Copy content to clipboard"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                disabled={!content.trim() || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>
              
              <Button
                onClick={() => setShowImageGenerator(!showImageGenerator)}
                variant="outline"
                aria-pressed={showImageGenerator}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate Image
              </Button>
            </div>
            
            {/* Image Generator */}
            {showImageGenerator && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Generate a custom image based on your post content
                    </p>
                    
                    <Button
                      onClick={handleGenerateImage}
                      disabled={generateImageMutation.isPending}
                      className="w-full"
                    >
                      {generateImageMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate Image
                        </>
                      )}
                    </Button>
                    
                    {generatedImageUrl && (
                      <div className="space-y-2">
                        <img
                          src={generatedImageUrl}
                          alt={generatedAltText}
                          className="w-full rounded-lg"
                        />
                        <div>
                          <Label htmlFor="alt-text">Alt Text</Label>
                          <Textarea
                            id="alt-text"
                            value={generatedAltText}
                            onChange={(e) => setGeneratedAltText(e.target.value)}
                            placeholder="Describe this image for screen readers"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Sidebar */}
      <div className="space-y-4">
        {/* Accessibility Checker */}
        <AccessibilityChecker
          content={content}
          platform={platform}
          onCheck={(result) => setAccessibilityScore(result.score)}
        />
        
        {/* AI Assistant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="generate">
              <TabsList className="w-full">
                <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
                <TabsTrigger value="rewrite" className="flex-1">Rewrite</TabsTrigger>
              </TabsList>
              
              <TabsContent value="generate" className="space-y-3 mt-4">
                <div>
                  <Label htmlFor="idea-input">Content idea</Label>
                  <Textarea
                    id="idea-input"
                    placeholder="Describe what you want to post about..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => {
                    const input = document.getElementById("idea-input") as HTMLTextAreaElement;
                    if (input?.value.trim()) {
                      handleGenerate(input.value);
                    }
                  }}
                  disabled={generatePostMutation.isPending}
                  className="w-full"
                >
                  {generatePostMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Post
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="rewrite" className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  Rewrite your content with a specific instruction
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRewrite("Make it more professional")}
                    disabled={rewriteMutation.isPending || !content.trim()}
                  >
                    Professional
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRewrite("Make it more casual and friendly")}
                    disabled={rewriteMutation.isPending || !content.trim()}
                  >
                    Casual
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRewrite("Make it shorter and more concise")}
                    disabled={rewriteMutation.isPending || !content.trim()}
                  >
                    Shorter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRewrite("Expand with more details")}
                    disabled={rewriteMutation.isPending || !content.trim()}
                  >
                    Longer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRewrite("Make it more accessible and easier to read")}
                    disabled={rewriteMutation.isPending || !content.trim()}
                    className="col-span-2"
                  >
                    More Accessible
                  </Button>
                </div>
                {rewriteMutation.isPending && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Rewriting...</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Platform Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Platform Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {platformInfo.tips}
            </p>
            <div className="mt-3 space-y-1 text-sm">
              <p><strong>Character limit:</strong> {charLimit.toLocaleString()}</p>
              <p><strong>Recommended hashtags:</strong> {platformInfo.hashtags}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Content Warning Preset Selector Component
 * Allows users to select from saved CW presets or create custom ones
 */
function CWPresetSelector({ 
  contentWarning, 
  setContentWarning 
}: { 
  contentWarning: string; 
  setContentWarning: (value: string) => void;
}) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  
  const utils = trpc.useUtils();
  const { data: presets } = trpc.cwPresets.list.useQuery();
  
  const createPreset = trpc.cwPresets.create.useMutation({
    onSuccess: () => {
      toast.success("CW preset saved");
      setShowSaveDialog(false);
      setNewPresetName("");
      utils.cwPresets.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const usePreset = trpc.cwPresets.use.useMutation();
  
  const handleSelectPreset = (preset: { id: number; text: string }) => {
    setContentWarning(preset.text);
    usePreset.mutate({ presetId: preset.id });
  };
  
  const handleSaveAsPreset = () => {
    if (!contentWarning.trim() || !newPresetName.trim()) return;
    createPreset.mutate({
      name: newPresetName,
      text: contentWarning,
    });
  };
  
  return (
    <div className="space-y-2">
      <Label htmlFor="content-warning">Content Warning (CW)</Label>
      <div className="flex gap-2">
        <Input
          id="content-warning"
          placeholder="Add a content warning / spoiler tag (optional)"
          value={contentWarning}
          onChange={(e) => setContentWarning(e.target.value)}
          maxLength={500}
          className="flex-1"
          aria-describedby="cw-hint"
        />
        {contentWarning.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            title="Save as preset"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Preset Quick Select */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.slice(0, 8).map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleSelectPreset(preset)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      )}
      
      <p id="cw-hint" className="text-xs text-muted-foreground">
        Content warnings hide your post behind a clickable warning. Click a preset above or type your own.
      </p>
      
      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
          <Label htmlFor="preset-name">Save as Preset</Label>
          <div className="flex gap-2">
            <Input
              id="preset-name"
              placeholder="Preset name (e.g., 'Spoiler')"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              maxLength={100}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAsPreset}
              disabled={!newPresetName.trim() || createPreset.isPending}
            >
              {createPreset.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostBuilder;
