/**
 * Email Bounce Webhook Routes
 * 
 * Express routes for handling bounce notifications from various email providers.
 * Includes signature verification for security.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  processSendGridWebhook,
  processSESWebhook,
  processMailgunWebhook,
  processPostmarkWebhook,
  parseSNSMessage,
} from './emailBounce';
import {
  verifySendGridSignature,
  verifyMailgunSignature,
  verifySNSSignature,
  verifyPostmarkSignature,
  validateWebhookTimestamp,
  getWebhookSecret,
} from './signatureVerification';

const router = Router();

/**
 * Middleware to capture raw body for signature verification
 * Note: This should be applied before JSON parsing in the main server
 */
declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

/**
 * SendGrid signature verification middleware
 */
async function verifySendGridMiddleware(req: Request, res: Response, next: NextFunction) {
  const publicKey = getWebhookSecret('SENDGRID_WEBHOOK_PUBLIC_KEY');
  
  // Skip verification if no public key is configured (development mode)
  if (!publicKey) {
    console.warn('SendGrid webhook signature verification skipped: No public key configured');
    return next();
  }

  const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!signature || !timestamp) {
    console.error('SendGrid webhook: Missing signature headers');
    return res.status(401).json({ error: 'Missing signature headers' });
  }

  // Validate timestamp to prevent replay attacks
  const timestampResult = validateWebhookTimestamp(timestamp);
  if (!timestampResult.valid) {
    console.error('SendGrid webhook: Invalid timestamp', timestampResult.error);
    return res.status(401).json({ error: 'Invalid timestamp' });
  }

  // Verify signature
  const result = verifySendGridSignature(publicKey, rawBody, signature, timestamp);
  if (!result.valid) {
    console.error('SendGrid webhook: Invalid signature', result.error);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

/**
 * Mailgun signature verification middleware
 */
async function verifyMailgunMiddleware(req: Request, res: Response, next: NextFunction) {
  const signingKey = getWebhookSecret('MAILGUN_WEBHOOK_SIGNING_KEY');
  
  // Skip verification if no signing key is configured (development mode)
  if (!signingKey) {
    console.warn('Mailgun webhook signature verification skipped: No signing key configured');
    return next();
  }

  // Mailgun includes signature data in the request body
  const signatureData = req.body.signature || {};
  const { timestamp, token, signature } = signatureData;

  if (!timestamp || !token || !signature) {
    console.error('Mailgun webhook: Missing signature data');
    return res.status(401).json({ error: 'Missing signature data' });
  }

  // Validate timestamp to prevent replay attacks
  const timestampResult = validateWebhookTimestamp(timestamp);
  if (!timestampResult.valid) {
    console.error('Mailgun webhook: Invalid timestamp', timestampResult.error);
    return res.status(401).json({ error: 'Invalid timestamp' });
  }

  // Verify signature
  const result = verifyMailgunSignature(signingKey, timestamp, token, signature);
  if (!result.valid) {
    console.error('Mailgun webhook: Invalid signature', result.error);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

/**
 * AWS SNS signature verification middleware
 */
async function verifySNSMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // SNS subscription confirmation doesn't need verification for initial setup
    if (body.Type === 'SubscriptionConfirmation') {
      console.log('SNS Subscription confirmation received');
      return next();
    }

    // Verify the SNS message signature
    if (body.Signature && body.SigningCertURL) {
      const result = await verifySNSSignature(body);
      if (!result.valid) {
        console.error('SNS webhook: Invalid signature', result.error);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('SNS webhook: No signature present, skipping verification');
    }

    next();
  } catch (error) {
    console.error('SNS signature verification error:', error);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
}

/**
 * Postmark signature verification middleware
 */
async function verifyPostmarkMiddleware(req: Request, res: Response, next: NextFunction) {
  const webhookToken = getWebhookSecret('POSTMARK_WEBHOOK_TOKEN');
  
  // Skip verification if no webhook token is configured (development mode)
  if (!webhookToken) {
    console.warn('Postmark webhook signature verification skipped: No webhook token configured');
    return next();
  }

  const signature = req.headers['x-postmark-signature'] as string;
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!signature) {
    console.error('Postmark webhook: Missing signature header');
    return res.status(401).json({ error: 'Missing signature header' });
  }

  // Verify signature
  const result = verifyPostmarkSignature(webhookToken, rawBody, signature);
  if (!result.valid) {
    console.error('Postmark webhook: Invalid signature', result.error);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

/**
 * SendGrid Webhook Endpoint
 * 
 * Receives bounce, spam report, and unsubscribe events from SendGrid.
 * SendGrid sends an array of events in each request.
 * 
 * POST /api/webhooks/sendgrid
 */
router.post('/api/webhooks/sendgrid', verifySendGridMiddleware, async (req, res) => {
  try {
    const events = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Expected array of events' });
    }

    const result = await processSendGridWebhook(events);
    
    console.log(`SendGrid webhook: processed ${result.processed} events`);
    if (result.errors.length > 0) {
      console.error('SendGrid webhook errors:', result.errors);
    }

    return res.status(200).json({
      success: true,
      processed: result.processed,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error('SendGrid webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Amazon SES Webhook Endpoint (via SNS)
 * 
 * Receives bounce and complaint notifications from Amazon SES via SNS.
 * Handles both subscription confirmations and actual notifications.
 * 
 * POST /api/webhooks/ses
 */
router.post('/api/webhooks/ses', verifySNSMiddleware, async (req, res) => {
  try {
    // SNS sends content-type as text/plain
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const notification = parseSNSMessage(body);
    
    if (!notification) {
      // Subscription confirmation or invalid message
      return res.status(200).json({ success: true, message: 'Acknowledged' });
    }

    const result = await processSESWebhook(notification);
    
    console.log(`SES webhook: processed ${result.processed} events`);
    if (result.errors.length > 0) {
      console.error('SES webhook errors:', result.errors);
    }

    return res.status(200).json({
      success: true,
      processed: result.processed,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error('SES webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mailgun Webhook Endpoint
 * 
 * Receives bounce, complaint, and unsubscribe events from Mailgun.
 * 
 * POST /api/webhooks/mailgun
 */
router.post('/api/webhooks/mailgun', verifyMailgunMiddleware, async (req, res) => {
  try {
    // Mailgun wraps events in event-data
    const eventData = req.body['event-data'] || req.body;
    
    if (!eventData || !eventData.event) {
      return res.status(400).json({ error: 'Invalid event data' });
    }

    const result = await processMailgunWebhook(eventData);
    
    console.log(`Mailgun webhook: processed ${result.processed} events`);
    if (result.errors.length > 0) {
      console.error('Mailgun webhook errors:', result.errors);
    }

    return res.status(200).json({
      success: true,
      processed: result.processed,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error('Mailgun webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Postmark Webhook Endpoint
 * 
 * Receives bounce notifications from Postmark.
 * 
 * POST /api/webhooks/postmark
 */
router.post('/api/webhooks/postmark', verifyPostmarkMiddleware, async (req, res) => {
  try {
    const bounce = req.body;
    
    if (!bounce || !bounce.Email) {
      return res.status(400).json({ error: 'Invalid bounce data' });
    }

    const result = await processPostmarkWebhook(bounce);
    
    console.log(`Postmark webhook: processed ${result.processed} events`);
    if (result.errors.length > 0) {
      console.error('Postmark webhook errors:', result.errors);
    }

    return res.status(200).json({
      success: true,
      processed: result.processed,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error('Postmark webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generic Webhook Endpoint
 * 
 * A fallback endpoint that attempts to detect the provider from the payload.
 * Note: Signature verification is skipped for this endpoint as provider is unknown.
 * 
 * POST /api/webhooks/email-bounce
 */
router.post('/api/webhooks/email-bounce', async (req, res) => {
  try {
    const body = req.body;
    
    // Detect provider from payload structure
    if (Array.isArray(body) && body[0]?.sg_event_id) {
      // SendGrid
      const result = await processSendGridWebhook(body);
      return res.status(200).json({ provider: 'sendgrid', ...result });
    }
    
    if (body.Type === 'Notification' || body.notificationType) {
      // SES
      const notification = body.Message ? parseSNSMessage(JSON.stringify(body)) : body;
      if (notification) {
        const result = await processSESWebhook(notification);
        return res.status(200).json({ provider: 'ses', ...result });
      }
    }
    
    if (body['event-data'] || body.event === 'failed' || body.event === 'complained') {
      // Mailgun
      const eventData = body['event-data'] || body;
      const result = await processMailgunWebhook(eventData);
      return res.status(200).json({ provider: 'mailgun', ...result });
    }
    
    if (body.TypeCode !== undefined || body.BouncedAt) {
      // Postmark
      const result = await processPostmarkWebhook(body);
      return res.status(200).json({ provider: 'postmark', ...result });
    }
    
    return res.status(400).json({ error: 'Unknown provider format' });
  } catch (error) {
    console.error('Generic webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint for webhooks
 * 
 * GET /api/webhooks/health
 */
router.get('/api/webhooks/health', (req, res) => {
  // Check which providers have signature verification configured
  const signatureStatus = {
    sendgrid: !!getWebhookSecret('SENDGRID_WEBHOOK_PUBLIC_KEY'),
    mailgun: !!getWebhookSecret('MAILGUN_WEBHOOK_SIGNING_KEY'),
    postmark: !!getWebhookSecret('POSTMARK_WEBHOOK_TOKEN'),
    ses: true, // SNS uses certificate-based verification, always available
  };

  res.status(200).json({
    status: 'ok',
    endpoints: [
      '/api/webhooks/sendgrid',
      '/api/webhooks/ses',
      '/api/webhooks/mailgun',
      '/api/webhooks/postmark',
      '/api/webhooks/email-bounce',
    ],
    signatureVerification: signatureStatus,
  });
});

export default router;
