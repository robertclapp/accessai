/**
 * Create Post Page
 * 
 * Main content creation interface with voice input, AI assistance, and accessibility checking.
 * Fully accessible with keyboard navigation and screen reader support.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic, 
  Sparkles, 
  Send, 
  Save, 
  Calendar,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Copy,
  RotateCcw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import VoiceRecorder from "@/components/VoiceRecorder";
import AccessibilityChecker from "@/components/AccessibilityChecker";

type Platform = "linkedin" | "twitter" | "facebook" | "instagram" | "threads";

const PLATFORMS: Array<{ id: Platform; name: string; maxChars: number }> = [
  { id: "linkedin", name: "LinkedIn", maxChars: 3000 },
  { id: "twitter", name: "X (Twitter)", maxChars: 280 },
  { id: "facebook", name: "Facebook", maxChars: 63206 },
  { id: "instagram", name: "Instagram", maxChars: 2200 },
  { id: "threads", name: "Threads", maxChars: 500 }
];

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Check URL params for voice mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("voice") === "true") {
      setShowVoiceInput(true);
    }
  }, []);
  
  // AI Content Generation
  const generateMutation = trpc.ai.generatePost.useMutation({
    onSuccess: (data) => {
      setContent(data.content);
      if (data.hashtags) {
        setHashtags(data.hashtags);
      }
      toast.success("Content generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate content", { description: String(error) });
    }
  });
  
  // AI Ideas Generation
  const ideasMutation = trpc.ai.generateIdeas.useMutation({
    onSuccess: (data) => {
      toast.success("Ideas generated!", { 
        description: `${data.ideas.length} ideas ready for you` 
      });
    },
    onError: (error) => {
      toast.error("Failed to generate ideas", { description: String(error) });
    }
  });
  
  // Image Generation
  const imageMutation = trpc.ai.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      toast.success("Image generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate image", { description: String(error) });
    }
  });
  
  // Save Post
  const saveMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      toast.success("Post saved successfully!");
      setLocation(`/posts/${data.postId}`);
    },
    onError: (error) => {
      toast.error("Failed to save post", { description: String(error) });
    }
  });
  
  const handleVoiceTranscription = (text: string) => {
    setContent(prev => prev ? `${prev}\n\n${text}` : text);
    toast.success("Voice transcription added!");
  };
  
  const handleGenerateContent = () => {
    if (!title.trim()) {
      toast.error("Please enter a topic or title first");
      return;
    }
    generateMutation.mutate({
      idea: title,
      platform,
      tone: "professional"
    });
  };
  
  const handleGenerateIdeas = () => {
    ideasMutation.mutate({
      platform,
      topic: title || "content creation",
      count: 5
    });
  };
  
  const handleGenerateImage = () => {
    if (!content.trim()) {
      toast.error("Please add some content first");
      return;
    }
    imageMutation.mutate({
      prompt: `Create a professional social media graphic for: ${content.slice(0, 200)}`
    });
  };
  
  const handleSave = (status: "draft" | "published" | "scheduled") => {
    if (!content.trim()) {
      toast.error("Please add some content first");
      return;
    }
    saveMutation.mutate({
      title: title || undefined,
      content,
      platform,
      hashtags,
      status
    });
  };
  
  const handleCopyContent = () => {
    const fullContent = hashtags.length > 0 
      ? `${content}\n\n${hashtags.map(h => `#${h}`).join(" ")}`
      : content;
    navigator.clipboard.writeText(fullContent);
    toast.success("Content copied to clipboard!");
  };
  
  const currentPlatform = PLATFORMS.find(p => p.id === platform);
  const charCount = content.length;
  const isOverLimit = currentPlatform && charCount > currentPlatform.maxChars;

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Editor */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Create Post</h1>
            <p className="text-muted-foreground mt-1">
              Create accessible content with AI assistance
            </p>
          </div>
          
          {/* Platform Selection */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="title">Topic / Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your post about?"
              />
            </div>
          </div>
          
          {/* Voice Input Toggle */}
          <div className="flex items-center gap-4">
            <Button
              variant={showVoiceInput ? "default" : "outline"}
              onClick={() => setShowVoiceInput(!showVoiceInput)}
              aria-pressed={showVoiceInput}
            >
              <Mic className="h-4 w-4 mr-2" />
              {showVoiceInput ? "Hide Voice Input" : "Use Voice Input"}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleGenerateIdeas}
              disabled={ideasMutation.isPending}
            >
              {ideasMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
              )}
              Get Ideas
            </Button>
          </div>
          
          {/* Voice Recorder */}
          {showVoiceInput && (
            <VoiceRecorder onTranscription={handleVoiceTranscription} />
          )}
          
          {/* Ideas Display */}
          {ideasMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Ideas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ideasMutation.data.ideas.map((idea: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTitle(idea)}
                        className="shrink-0"
                      >
                        Use
                      </Button>
                      <span className="text-sm">{idea}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          
          {/* Content Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}>
                  {charCount} / {currentPlatform?.maxChars || "∞"}
                </span>
                {isOverLimit && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your content here or use voice input..."
              className="min-h-[300px] resize-y"
              aria-describedby="content-help"
            />
            <p id="content-help" className="text-sm text-muted-foreground">
              Write accessible content. Use CamelCase for hashtags (e.g., #AccessibleContent).
            </p>
          </div>
          
          {/* AI Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGenerateContent}
              disabled={generateMutation.isPending || !title.trim()}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate with AI
            </Button>
            
            <Button
              variant="outline"
              onClick={handleGenerateImage}
              disabled={imageMutation.isPending || !content.trim()}
            >
              {imageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4 mr-2" />
              )}
              Generate Image
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCopyContent}
              disabled={!content.trim()}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => {
                setContent("");
                setHashtags([]);
                setGeneratedImage(null);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
          
          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Label className="w-full">Suggested Hashtags:</Label>
              {hashtags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                >
                  #{tag} ×
                </Badge>
              ))}
            </div>
          )}
          
          {/* Generated Image */}
          {generatedImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generated Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={generatedImage} 
                  alt="AI generated social media graphic" 
                  className="rounded-lg max-w-full h-auto"
                />
              </CardContent>
            </Card>
          )}
          
          {/* Save Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              onClick={() => handleSave("draft")}
              variant="outline"
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            
            <Button
              onClick={() => handleSave("scheduled")}
              variant="outline"
              disabled={saveMutation.isPending}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            
            <Button
              onClick={() => handleSave("published")}
              disabled={saveMutation.isPending || isOverLimit}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publish Now
            </Button>
          </div>
        </div>
        
        {/* Sidebar - Accessibility Checker */}
        <div className="lg:w-[350px] space-y-6">
          <div data-tour="accessibility-checker">
            <AccessibilityChecker content={content} platform={platform} />
          </div>
          
          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Accessibility Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Use CamelCase for hashtags so screen readers pronounce each word</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Add alt text descriptions for any images you share</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Avoid using special characters or symbols as decoration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>Keep sentences short and use plain language</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
