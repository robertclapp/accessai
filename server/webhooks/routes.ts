/**
 * Email Bounce Webhook Routes
 * 
 * Express routes for handling bounce notifications from various email providers.
 */

import { Router } from 'express';
import {
  processSendGridWebhook,
  processSESWebhook,
  processMailgunWebhook,
  processPostmarkWebhook,
  parseSNSMessage,
} from './emailBounce';

const router = Router();

/**
 * SendGrid Webhook Endpoint
 * 
 * Receives bounce, spam report, and unsubscribe events from SendGrid.
 * SendGrid sends an array of events in each request.
 * 
 * POST /api/webhooks/sendgrid
 */
router.post('/api/webhooks/sendgrid', async (req, res) => {
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
router.post('/api/webhooks/ses', async (req, res) => {
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
router.post('/api/webhooks/mailgun', async (req, res) => {
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
router.post('/api/webhooks/postmark', async (req, res) => {
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
  res.status(200).json({
    status: 'ok',
    endpoints: [
      '/api/webhooks/sendgrid',
      '/api/webhooks/ses',
      '/api/webhooks/mailgun',
      '/api/webhooks/postmark',
      '/api/webhooks/email-bounce',
    ],
  });
});

export default router;
