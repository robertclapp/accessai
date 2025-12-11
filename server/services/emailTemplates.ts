/**
 * Branded HTML Email Templates
 * 
 * Provides responsive, branded email templates for:
 * - Digest notifications
 * - Activity alerts
 * - System notifications
 */

// Use process.env directly for frontend URLs
const getBaseUrl = () => process.env.VITE_FRONTEND_FORGE_API_URL || 'https://accessai.app';
const getAppTitle = () => process.env.VITE_APP_TITLE || 'AccessAI';

// Brand colors
const BRAND_COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  secondary: "#10b981",
  background: "#f9fafb",
  cardBg: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

/**
 * Base email template wrapper
 */
export function baseEmailTemplate(content: string, options: {
  title: string;
  preheader?: string;
  unsubscribeToken?: string;
  unsubscribeUrl?: string;
}): string {
  const { title, preheader, unsubscribeToken, unsubscribeUrl } = options;
  const appName = getAppTitle();
  const baseUrl = getBaseUrl();
  
  const unsubscribeLink = unsubscribeToken 
    ? `${baseUrl}/unsubscribe?token=${unsubscribeToken}`
    : unsubscribeUrl || `${baseUrl}/settings`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: ${BRAND_COLORS.background};
    }
    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 10px !important;
      }
      .content {
        padding: 20px !important;
      }
      .button {
        width: 100% !important;
        display: block !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  
  <!-- Main container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%); padding: 15px 30px; border-radius: 12px;">
                    <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${appName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" class="content" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND_COLORS.cardBg}; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <tr>
                  <td style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: ${BRAND_COLORS.textMuted}; font-size: 12px; line-height: 1.5; text-align: center;">
                    <p style="margin: 0 0 10px 0;">
                      You're receiving this email because you have an account with ${appName}.
                    </p>
                    <p style="margin: 0 0 10px 0;">
                      <a href="${unsubscribeLink}" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">Unsubscribe</a>
                      &nbsp;|&nbsp;
                      <a href="${baseUrl}/settings" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">Email Preferences</a>
                    </p>
                    <p style="margin: 0; color: ${BRAND_COLORS.textMuted};">
                      © ${new Date().getFullYear()} ${appName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Digest email template
 */
export function digestEmailTemplate(data: {
  userName: string;
  period: string;
  sections: Array<{
    title: string;
    icon: string;
    items: Array<{
      name: string;
      description?: string;
      link?: string;
      badge?: string;
    }>;
  }>;
  stats?: {
    newTemplates: number;
    totalCollections: number;
    activeTests: number;
  };
  unsubscribeToken: string;
}): string {
  const { userName, period, sections, stats, unsubscribeToken } = data;
  
  const statsHtml = stats ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
      <tr>
        <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 12px; text-align: center; width: 33%;">
          <div style="font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.primary};">${stats.newTemplates}</div>
          <div style="font-size: 12px; color: ${BRAND_COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">New Templates</div>
        </td>
        <td style="width: 10px;"></td>
        <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 12px; text-align: center; width: 33%;">
          <div style="font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.secondary};">${stats.totalCollections}</div>
          <div style="font-size: 12px; color: ${BRAND_COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Collections</div>
        </td>
        <td style="width: 10px;"></td>
        <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 12px; text-align: center; width: 33%;">
          <div style="font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.warning};">${stats.activeTests}</div>
          <div style="font-size: 12px; color: ${BRAND_COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Active Tests</div>
        </td>
      </tr>
    </table>
  ` : '';
  
  const sectionsHtml = sections.map(section => `
    <div style="margin-bottom: 30px;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: ${BRAND_COLORS.text};">
        ${section.icon} ${section.title}
      </h2>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${section.items.map(item => `
          <tr>
            <td style="padding: 12px 15px; background-color: ${BRAND_COLORS.background}; border-radius: 8px; margin-bottom: 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-weight: 600; color: ${BRAND_COLORS.text}; margin-bottom: 4px;">
                      ${item.link ? `<a href="${item.link}" style="color: ${BRAND_COLORS.text}; text-decoration: none;">${item.name}</a>` : item.name}
                      ${item.badge ? `<span style="display: inline-block; padding: 2px 8px; background-color: ${BRAND_COLORS.primary}; color: #fff; font-size: 10px; border-radius: 4px; margin-left: 8px;">${item.badge}</span>` : ''}
                    </div>
                    ${item.description ? `<div style="font-size: 13px; color: ${BRAND_COLORS.textMuted};">${item.description}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
        `).join('')}
      </table>
    </div>
  `).join('');
  
  const content = `
    <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.text};">
      Your ${period} Digest
    </h1>
    <p style="margin: 0 0 30px 0; font-size: 16px; color: ${BRAND_COLORS.textMuted};">
      Hi ${userName}, here's what's new in your template collections.
    </p>
    
    ${statsHtml}
    ${sectionsHtml}
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-top: 20px;">
          <a href="${getBaseUrl()}/marketplace" 
             class="button"
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);">
            Explore Marketplace →
          </a>
        </td>
      </tr>
    </table>
  `;
  
  return baseEmailTemplate(content, {
    title: `Your ${period} Digest - AccessAI`,
    preheader: `${sections.reduce((acc, s) => acc + s.items.length, 0)} new items in your digest`,
    unsubscribeToken,
  });
}

/**
 * Activity notification email template
 */
export function activityNotificationTemplate(data: {
  userName: string;
  activities: Array<{
    type: string;
    message: string;
    collectionName: string;
    actorName: string;
    timestamp: Date;
  }>;
  unsubscribeToken: string;
}): string {
  const { userName, activities, unsubscribeToken } = data;
  
  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'template_added': return '📄';
      case 'template_removed': return '🗑️';
      case 'collaborator_invited': return '👋';
      case 'collaborator_joined': return '✅';
      case 'collaborator_left': return '👋';
      case 'collaborator_removed': return '❌';
      case 'collection_updated': return '✏️';
      case 'collection_shared': return '🔗';
      case 'collection_unshared': return '🔒';
      default: return '📌';
    }
  };
  
  const activitiesHtml = activities.map(activity => `
    <tr>
      <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 8px; margin-bottom: 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width: 40px; vertical-align: top;">
              <div style="font-size: 20px;">${getActivityIcon(activity.type)}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: ${BRAND_COLORS.text}; margin-bottom: 4px;">
                ${activity.message}
              </div>
              <div style="font-size: 13px; color: ${BRAND_COLORS.textMuted};">
                ${activity.actorName} • ${activity.collectionName} • ${formatTimeAgo(activity.timestamp)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>
  `).join('');
  
  const content = `
    <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.text};">
      New Activity in Your Collections
    </h1>
    <p style="margin: 0 0 30px 0; font-size: 16px; color: ${BRAND_COLORS.textMuted};">
      Hi ${userName}, here's what's happened in your shared collections.
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${activitiesHtml}
    </table>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-top: 20px;">
          <a href="${getBaseUrl()}/followed-collections" 
             class="button"
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);">
            View All Activity →
          </a>
        </td>
      </tr>
    </table>
  `;
  
  return baseEmailTemplate(content, {
    title: 'New Activity - AccessAI',
    preheader: `${activities.length} new activities in your collections`,
    unsubscribeToken,
  });
}

/**
 * Welcome email template
 */
export function welcomeEmailTemplate(data: {
  userName: string;
}): string {
  const { userName } = data;
  
  const content = `
    <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.text};">
      Welcome to AccessAI! 🎉
    </h1>
    <p style="margin: 0 0 30px 0; font-size: 16px; color: ${BRAND_COLORS.textMuted}; line-height: 1.6;">
      Hi ${userName}, we're thrilled to have you on board. AccessAI helps you create accessible, 
      engaging social media content with AI-powered tools.
    </p>
    
    <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: ${BRAND_COLORS.text};">
      Get Started in 3 Steps
    </h2>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width: 40px; vertical-align: top;">
                <div style="width: 28px; height: 28px; background-color: ${BRAND_COLORS.primary}; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600;">1</div>
              </td>
              <td>
                <div style="font-weight: 600; color: ${BRAND_COLORS.text};">Explore Templates</div>
                <div style="font-size: 13px; color: ${BRAND_COLORS.textMuted};">Browse our marketplace for ready-to-use A/B test templates</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 10px;"></td></tr>
      <tr>
        <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width: 40px; vertical-align: top;">
                <div style="width: 28px; height: 28px; background-color: ${BRAND_COLORS.primary}; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600;">2</div>
              </td>
              <td>
                <div style="font-weight: 600; color: ${BRAND_COLORS.text};">Create Your First Post</div>
                <div style="font-size: 13px; color: ${BRAND_COLORS.textMuted};">Use AI to generate accessible content for any platform</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 10px;"></td></tr>
      <tr>
        <td style="padding: 15px; background-color: ${BRAND_COLORS.background}; border-radius: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width: 40px; vertical-align: top;">
                <div style="width: 28px; height: 28px; background-color: ${BRAND_COLORS.primary}; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600;">3</div>
              </td>
              <td>
                <div style="font-weight: 600; color: ${BRAND_COLORS.text};">Join Collections</div>
                <div style="font-size: 13px; color: ${BRAND_COLORS.textMuted};">Follow and collaborate on template collections with your team</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-top: 30px;">
          <a href="${getBaseUrl()}" 
             class="button"
             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);">
            Get Started →
          </a>
        </td>
      </tr>
    </table>
  `;
  
  return baseEmailTemplate(content, {
    title: 'Welcome to AccessAI!',
    preheader: 'Your journey to accessible content starts here',
  });
}

/**
 * Format time ago helper
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Generate unsubscribe token
 */
export function generateUnsubscribeToken(userId: number, type: string): string {
  const payload = `${userId}:${type}:${Date.now()}`;
  // In production, use proper encryption
  return Buffer.from(payload).toString('base64url');
}

/**
 * Parse unsubscribe token
 */
export function parseUnsubscribeToken(token: string): { userId: number; type: string; timestamp: number } | null {
  try {
    const payload = Buffer.from(token, 'base64url').toString();
    const [userIdStr, type, timestampStr] = payload.split(':');
    return {
      userId: parseInt(userIdStr),
      type,
      timestamp: parseInt(timestampStr),
    };
  } catch {
    return null;
  }
}
