/**
 * A/B Test Insights PDF Export Service
 * 
 * Generates PDF reports from A/B test history insights
 * for sharing and archival purposes.
 */

import { generateTestHistoryInsights, type TestHistoryInsights } from "./abTestInsights";

// ============================================
// TYPES
// ============================================

export interface PdfExportOptions {
  includeRecommendations?: boolean;
  includePlatformBreakdown?: boolean;
  includeContentLearnings?: boolean;
  includeTimeAnalysis?: boolean;
}

// ============================================
// HTML TEMPLATE GENERATION
// ============================================

/**
 * Generate HTML for the PDF report
 */
export function generateInsightsHtml(
  insights: TestHistoryInsights,
  options: PdfExportOptions = {}
): string {
  const {
    includeRecommendations = true,
    includePlatformBreakdown = true,
    includeContentLearnings = true,
    includeTimeAnalysis = true,
  } = options;

  const generatedDate = new Date(insights.generatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A/B Test History Insights Report - AccessAI</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    
    .header h1 {
      font-size: 28px;
      color: #2563eb;
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section h2 {
      font-size: 20px;
      color: #1a1a1a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
    }
    
    .summary-card .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .platform-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    
    .platform-table th,
    .platform-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .platform-table th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
    }
    
    .platform-table td {
      font-size: 14px;
    }
    
    .recommendation-card {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    
    .recommendation-card h4 {
      font-size: 14px;
      color: #0369a1;
      margin-bottom: 4px;
    }
    
    .recommendation-card p {
      font-size: 13px;
      color: #0c4a6e;
    }
    
    .recommendation-card .priority {
      display: inline-block;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      text-transform: uppercase;
      font-weight: 600;
    }
    
    .recommendation-card .priority.high {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .recommendation-card .priority.medium {
      background: #fef3c7;
      color: #92400e;
    }
    
    .recommendation-card .priority.low {
      background: #dcfce7;
      color: #166534;
    }
    
    .learning-list {
      list-style: none;
    }
    
    .learning-list li {
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .learning-list .element {
      font-weight: 500;
    }
    
    .learning-list .frequency {
      font-size: 12px;
      color: #666;
      background: #f3f4f6;
      padding: 2px 8px;
      border-radius: 4px;
    }
    
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    
    .column h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .winning {
      color: #16a34a;
    }
    
    .losing {
      color: #dc2626;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    .time-analysis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    
    .time-card {
      background: #fafafa;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .time-card .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .time-card .value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>A/B Test History Insights</h1>
    <p class="subtitle">Generated on ${generatedDate} • AccessAI</p>
  </div>
  
  <div class="section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${insights.summary.totalTests}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="summary-card">
        <div class="value">${insights.summary.completedTests}</div>
        <div class="label">Completed</div>
      </div>
      <div class="summary-card">
        <div class="value">${insights.summary.avgConfidenceLevel.toFixed(0)}%</div>
        <div class="label">Avg Confidence</div>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${insights.summary.avgEngagementLift > 0 ? "+" : ""}${insights.summary.avgEngagementLift.toFixed(1)}%</div>
        <div class="label">Avg Engagement Lift</div>
      </div>
      <div class="summary-card">
        <div class="value" style="font-size: 16px; text-transform: capitalize;">${insights.summary.mostTestedPlatform || "N/A"}</div>
        <div class="label">Most Tested Platform</div>
      </div>
      <div class="summary-card">
        <div class="value" style="font-size: 16px; text-transform: capitalize;">${insights.summary.bestPerformingPlatform || "N/A"}</div>
        <div class="label">Best Performing</div>
      </div>
    </div>
  </div>
`;

  // Platform Breakdown
  if (includePlatformBreakdown && insights.platformBreakdown.length > 0) {
    html += `
  <div class="section">
    <h2>Platform Performance</h2>
    <table class="platform-table">
      <thead>
        <tr>
          <th>Platform</th>
          <th>Tests Completed</th>
          <th>Avg Confidence</th>
          <th>Avg Engagement Lift</th>
        </tr>
      </thead>
      <tbody>
`;
    for (const platform of insights.platformBreakdown) {
      html += `
        <tr>
          <td style="text-transform: capitalize; font-weight: 500;">${platform.platform}</td>
          <td>${platform.testsCompleted}</td>
          <td>${platform.avgConfidence.toFixed(0)}%</td>
          <td>${platform.avgEngagementLift > 0 ? "+" : ""}${platform.avgEngagementLift.toFixed(1)}%</td>
        </tr>
`;
    }
    html += `
      </tbody>
    </table>
  </div>
`;
  }

  // Content Learnings
  if (includeContentLearnings && (insights.contentLearnings.winningElements.length > 0 || insights.contentLearnings.losingElements.length > 0)) {
    html += `
  <div class="section">
    <h2>Content Learnings</h2>
    <div class="two-column">
      <div class="column">
        <h3 class="winning">✓ Winning Elements</h3>
        <ul class="learning-list">
`;
    for (const element of insights.contentLearnings.winningElements.slice(0, 8)) {
      html += `
          <li>
            <span class="element">${element.element}</span>
            <span class="frequency">${element.frequency}x</span>
          </li>
`;
    }
    if (insights.contentLearnings.winningElements.length === 0) {
      html += `<li><span class="element" style="color: #666;">No data yet</span></li>`;
    }
    html += `
        </ul>
      </div>
      <div class="column">
        <h3 class="losing">✗ Losing Elements</h3>
        <ul class="learning-list">
`;
    for (const element of insights.contentLearnings.losingElements.slice(0, 8)) {
      html += `
          <li>
            <span class="element">${element.element}</span>
            <span class="frequency">${element.frequency}x</span>
          </li>
`;
    }
    if (insights.contentLearnings.losingElements.length === 0) {
      html += `<li><span class="element" style="color: #666;">No data yet</span></li>`;
    }
    html += `
        </ul>
      </div>
    </div>
  </div>
`;
  }

  // Time Analysis
  if (includeTimeAnalysis) {
    html += `
  <div class="section">
    <h2>Time Analysis</h2>
    <div class="time-analysis">
      <div class="time-card">
        <div class="label">Best Day of Week</div>
        <div class="value">${insights.timeAnalysis.bestDayOfWeek || "N/A"}</div>
      </div>
      <div class="time-card">
        <div class="label">Best Time of Day</div>
        <div class="value">${insights.timeAnalysis.bestTimeOfDay || "N/A"}</div>
      </div>
      <div class="time-card">
        <div class="label">Test Frequency</div>
        <div class="value">${insights.timeAnalysis.testFrequency || "N/A"}</div>
      </div>
    </div>
  </div>
`;
  }

  // Recommendations
  if (includeRecommendations && insights.recommendations.length > 0) {
    html += `
  <div class="section">
    <h2>Recommendations</h2>
`;
    for (const rec of insights.recommendations.slice(0, 5)) {
      html += `
    <div class="recommendation-card">
      <span class="priority ${rec.priority}">${rec.priority} Priority</span>
      <h4>${rec.title}</h4>
      <p>${rec.description}</p>
    </div>
`;
    }
    html += `
  </div>
`;
  }

  // Footer
  html += `
  <div class="footer">
    <p>Generated by AccessAI • ${generatedDate}</p>
    <p>This report is based on your A/B testing history and may not reflect future performance.</p>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Generate PDF-ready HTML for A/B test insights
 */
export async function generateInsightsPdfHtml(
  userId: number,
  options: PdfExportOptions = {}
): Promise<{ html: string; insights: TestHistoryInsights }> {
  const insights = await generateTestHistoryInsights(userId);
  const html = generateInsightsHtml(insights, options);
  
  return { html, insights };
}
