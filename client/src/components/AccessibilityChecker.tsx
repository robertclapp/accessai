/**
 * AccessibilityChecker Component
 * 
 * Provides real-time accessibility feedback for social media content.
 * Displays WCAG compliance score and actionable suggestions.
 * 
 * Accessibility features:
 * - Color-coded severity indicators with text labels
 * - Screen reader friendly announcements
 * - Keyboard navigable issue list
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  RefreshCw,
  Loader2,
  Lightbulb
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Platform } from "@shared/types";

interface AccessibilityIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

interface AccessibilityResult {
  score: number;
  issues: AccessibilityIssue[];
  summary: string;
}

interface AccessibilityCheckerProps {
  content: string;
  platform: Platform;
  onCheck?: (result: AccessibilityResult) => void;
  autoCheck?: boolean;
  debounceMs?: number;
  className?: string;
}

export function AccessibilityChecker({
  content,
  platform,
  onCheck,
  autoCheck = true,
  debounceMs = 1000,
  className = ""
}: AccessibilityCheckerProps) {
  const [result, setResult] = useState<AccessibilityResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const checkMutation = trpc.ai.checkAccessibility.useMutation({
    onSuccess: (data) => {
      setResult(data);
      onCheck?.(data);
    }
  });

  // Auto-check with debounce
  useEffect(() => {
    if (!autoCheck || !content.trim()) {
      setResult(null);
      return;
    }
    
    const timer = setTimeout(() => {
      checkMutation.mutate({ content, platform });
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [content, platform, autoCheck, debounceMs]);

  const handleManualCheck = () => {
    if (content.trim()) {
      checkMutation.mutate({ content, platform });
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 60) return "Needs Improvement";
    if (score >= 40) return "Poor";
    return "Critical Issues";
  };

  const getProgressColor = (score: number): string => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSeverityIcon = (severity: AccessibilityIssue["severity"]) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    }
  };

  const getSeverityLabel = (severity: AccessibilityIssue["severity"]): string => {
    switch (severity) {
      case "error": return "Error";
      case "warning": return "Warning";
      case "info": return "Info";
    }
  };

  const errorCount = result?.issues.filter(i => i.severity === "error").length || 0;
  const warningCount = result?.issues.filter(i => i.severity === "warning").length || 0;
  const infoCount = result?.issues.filter(i => i.severity === "info").length || 0;

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            Accessibility Check
          </CardTitle>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualCheck}
            disabled={checkMutation.isPending || !content.trim()}
            aria-label="Recheck accessibility"
          >
            {checkMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {checkMutation.isPending && !result ? (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Analyzing content...</span>
          </div>
        ) : result ? (
          <div className="space-y-4">
            {/* Score display */}
            <div className="flex items-center gap-4">
              <div 
                className={`text-4xl font-bold ${getScoreColor(result.score)}`}
                aria-label={`Accessibility score: ${result.score} out of 100`}
              >
                {result.score}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                    {getScoreLabel(result.score)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${getProgressColor(result.score)}`}
                    style={{ width: `${result.score}%` }}
                    role="progressbar"
                    aria-valuenow={result.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
            
            {/* Issue counts */}
            <div className="flex gap-2 flex-wrap">
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errorCount} {errorCount === 1 ? "Error" : "Errors"}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {warningCount} {warningCount === 1 ? "Warning" : "Warnings"}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Info className="h-3 w-3" aria-hidden="true" />
                  {infoCount} {infoCount === 1 ? "Suggestion" : "Suggestions"}
                </Badge>
              )}
              {result.issues.length === 0 && (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  No issues found
                </Badge>
              )}
            </div>
            
            {/* Summary */}
            <p className="text-sm text-muted-foreground">{result.summary}</p>
            
            {/* Issues list */}
            {result.issues.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full justify-between"
                  aria-expanded={isExpanded}
                  aria-controls="accessibility-issues-list"
                >
                  <span>View Details</span>
                  <span className="text-xs text-muted-foreground">
                    {isExpanded ? "Hide" : "Show"} {result.issues.length} issues
                  </span>
                </Button>
                
                {isExpanded && (
                  <ul 
                    id="accessibility-issues-list"
                    className="mt-2 space-y-2"
                    role="list"
                    aria-label="Accessibility issues"
                  >
                    {result.issues.map((issue, index) => (
                      <li 
                        key={index}
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                {issue.type}
                              </span>
                              <span className="sr-only">
                                Severity: {getSeverityLabel(issue.severity)}
                              </span>
                            </div>
                            <p className="text-sm">{issue.message}</p>
                            {issue.suggestion && (
                              <div className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
                                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                <span>{issue.suggestion}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {content.trim() 
              ? "Click refresh to check accessibility"
              : "Start typing to see accessibility feedback"
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AccessibilityChecker;
