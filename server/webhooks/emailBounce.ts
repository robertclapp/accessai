/**
 * Email Bounce Webhook Handlers
 * 
 * Handles bounce notifications from various email providers:
 * - SendGrid
 * - Amazon SES
 * - Mailgun
 * - Postmark
 */

import { recordBounce } from '../db';

// SendGrid Event Types
interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'bounce' | 'dropped' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe';
  type?: string; // 'bounce' or 'blocked'
  reason?: string;
  status?: string;
  sg_event_id?: string;
  sg_message_id?: string;
}

// Amazon SES Notification Types
interface SESBounceRecipient {
  emailAddress: string;
  action?: string;
  status?: string;
  diagnosticCode?: string;
}

interface SESNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  bounce?: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bounceSubType: string;
    bouncedRecipients: SESBounceRecipient[];
    timestamp: string;
    feedbackId: string;
  };
  complaint?: {
    complainedRecipients: { emailAddress: string }[];
    timestamp: string;
    feedbackId: string;
    complaintFeedbackType?: string;
  };
  mail: {
    messageId: string;
    source: string;
    timestamp: string;
  };
}

// Mailgun Event Types
interface MailgunEvent {
  event: 'failed' | 'complained' | 'unsubscribed';
  recipient: string;
  timestamp: number;
  severity?: 'permanent' | 'temporary';
  reason?: string;
  'delivery-status'?: {
    code?: number;
    message?: string;
    description?: string;
  };
  message?: {
    headers?: {
      'message-id'?: string;
    };
  };
}

// Postmark Bounce Types
interface PostmarkBounce {
  ID: number;
  Type: string;
  TypeCode: number;
  Name: string;
  Tag?: string;
  MessageID: string;
  ServerID: number;
  Description: string;
  Details: string;
  Email: string;
  From: string;
  BouncedAt: string;
  DumpAvailable: boolean;
  Inactive: boolean;
  CanActivate: boolean;
  Subject: string;
}

/**
 * Process SendGrid webhook events
 */
export async function processSendGridWebhook(events: SendGridEvent[]): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  for (const event of events) {
    try {
      let bounceType: 'soft' | 'hard' | 'complaint' | 'unsubscribe';
      
      switch (event.event) {
        case 'bounce':
          bounceType = event.type === 'blocked' ? 'soft' : 'hard';
          break;
        case 'dropped':
          bounceType = 'hard';
          break;
        case 'spamreport':
          bounceType = 'complaint';
          break;
        case 'unsubscribe':
        case 'group_unsubscribe':
          bounceType = 'unsubscribe';
          break;
        default:
          continue; // Skip unknown events
      }

      await recordBounce({
        email: event.email,
        bounceType,
        bounceSubType: event.type || event.event,
        diagnosticCode: event.reason || event.status,
        notificationId: event.sg_event_id || event.sg_message_id,
      });
      
      processed++;
    } catch (error) {
      errors.push(`Failed to process event for ${event.email}: ${error}`);
    }
  }

  return { processed, errors };
}

/**
 * Process Amazon SES webhook notifications
 */
export async function processSESWebhook(notification: SESNotification): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  try {
    if (notification.notificationType === 'Bounce' && notification.bounce) {
      const bounceType = notification.bounce.bounceType === 'Permanent' ? 'hard' : 'soft';
      
      for (const recipient of notification.bounce.bouncedRecipients) {
        try {
          await recordBounce({
            email: recipient.emailAddress,
            bounceType,
            bounceSubType: notification.bounce.bounceSubType,
            diagnosticCode: recipient.diagnosticCode,
            notificationId: notification.bounce.feedbackId,
          });
          processed++;
        } catch (error) {
          errors.push(`Failed to process bounce for ${recipient.emailAddress}: ${error}`);
        }
      }
    } else if (notification.notificationType === 'Complaint' && notification.complaint) {
      for (const recipient of notification.complaint.complainedRecipients) {
        try {
          await recordBounce({
            email: recipient.emailAddress,
            bounceType: 'complaint',
            bounceSubType: notification.complaint.complaintFeedbackType || 'complaint',
            notificationId: notification.complaint.feedbackId,
          });
          processed++;
        } catch (error) {
          errors.push(`Failed to process complaint for ${recipient.emailAddress}: ${error}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Failed to process SES notification: ${error}`);
  }

  return { processed, errors };
}

/**
 * Process Mailgun webhook events
 */
export async function processMailgunWebhook(event: MailgunEvent): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  try {
    let bounceType: 'soft' | 'hard' | 'complaint' | 'unsubscribe';
    
    switch (event.event) {
      case 'failed':
        bounceType = event.severity === 'permanent' ? 'hard' : 'soft';
        break;
      case 'complained':
        bounceType = 'complaint';
        break;
      case 'unsubscribed':
        bounceType = 'unsubscribe';
        break;
      default:
        return { processed: 0, errors: ['Unknown event type'] };
    }

    const diagnosticCode = event['delivery-status']?.message || 
                          event['delivery-status']?.description || 
                          event.reason;

    await recordBounce({
      email: event.recipient,
      bounceType,
      bounceSubType: event.severity || event.event,
      diagnosticCode,
      notificationId: event.message?.headers?.['message-id'],
    });
    
    processed++;
  } catch (error) {
    errors.push(`Failed to process Mailgun event for ${event.recipient}: ${error}`);
  }

  return { processed, errors };
}

/**
 * Process Postmark webhook bounces
 */
export async function processPostmarkWebhook(bounce: PostmarkBounce): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Postmark TypeCodes: 1 = HardBounce, 2 = Transient, 512 = SpamComplaint
    let bounceType: 'soft' | 'hard' | 'complaint' | 'unsubscribe';
    
    if (bounce.TypeCode === 512) {
      bounceType = 'complaint';
    } else if (bounce.TypeCode === 1 || bounce.Type === 'HardBounce') {
      bounceType = 'hard';
    } else {
      bounceType = 'soft';
    }

    await recordBounce({
      email: bounce.Email,
      bounceType,
      bounceSubType: bounce.Name || bounce.Type,
      diagnosticCode: bounce.Description || bounce.Details,
      notificationId: bounce.MessageID,
    });
    
    processed++;
  } catch (error) {
    errors.push(`Failed to process Postmark bounce for ${bounce.Email}: ${error}`);
  }

  return { processed, errors };
}

/**
 * Verify SendGrid webhook signature
 */
export function verifySendGridSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  // In production, implement proper signature verification
  // using crypto.verify with the public key
  return true; // Placeholder
}

/**
 * Verify Mailgun webhook signature
 */
export function verifyMailgunSignature(
  apiKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  // In production, implement HMAC-SHA256 verification
  // const crypto = require('crypto');
  // const encodedToken = crypto.createHmac('sha256', apiKey)
  //   .update(timestamp + token)
  //   .digest('hex');
  // return encodedToken === signature;
  return true; // Placeholder
}

/**
 * Parse SNS message for SES notifications
 */
export function parseSNSMessage(body: string): SESNotification | null {
  try {
    const snsMessage = JSON.parse(body);
    
    // Handle SNS subscription confirmation
    if (snsMessage.Type === 'SubscriptionConfirmation') {
      console.log('SNS Subscription confirmation URL:', snsMessage.SubscribeURL);
      return null;
    }
    
    // Parse the actual notification
    if (snsMessage.Type === 'Notification') {
      return JSON.parse(snsMessage.Message) as SESNotification;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse SNS message:', error);
    return null;
  }
}
