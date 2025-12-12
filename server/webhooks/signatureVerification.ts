/**
 * Webhook Signature Verification
 * 
 * Implements cryptographic verification for webhook signatures from various email providers.
 * This ensures that incoming webhook requests are authentic and haven't been tampered with.
 */

import crypto from 'crypto';

/**
 * Verification result type
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * SendGrid Webhook Signature Verification
 * 
 * SendGrid uses ECDSA with SHA-256 for webhook signatures.
 * The signature is created using the webhook's public key.
 * 
 * @param publicKey - The ECDSA public key from SendGrid (in PEM format)
 * @param payload - The raw request body as a string
 * @param signature - The X-Twilio-Email-Event-Webhook-Signature header
 * @param timestamp - The X-Twilio-Email-Event-Webhook-Timestamp header
 * @returns VerificationResult indicating if the signature is valid
 */
export function verifySendGridSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): VerificationResult {
  try {
    if (!publicKey || !payload || !signature || !timestamp) {
      return { valid: false, error: 'Missing required parameters' };
    }

    // SendGrid concatenates timestamp + payload for signing
    const payloadToVerify = timestamp + payload;
    
    // Decode the base64 signature
    const signatureBuffer = Buffer.from(signature, 'base64');
    
    // Create verifier with ECDSA SHA-256
    const verifier = crypto.createVerify('SHA256');
    verifier.update(payloadToVerify);
    verifier.end();
    
    // Verify the signature
    const isValid = verifier.verify(publicKey, signatureBuffer);
    
    return { valid: isValid };
  } catch (error) {
    return { 
      valid: false, 
      error: `SendGrid signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Mailgun Webhook Signature Verification
 * 
 * Mailgun uses HMAC-SHA256 for webhook signatures.
 * The signature is created by hashing timestamp + token with the API key.
 * 
 * @param apiKey - The Mailgun API key (webhook signing key)
 * @param timestamp - The timestamp from the webhook payload
 * @param token - The token from the webhook payload
 * @param signature - The signature from the webhook payload
 * @returns VerificationResult indicating if the signature is valid
 */
export function verifyMailgunSignature(
  apiKey: string,
  timestamp: string,
  token: string,
  signature: string
): VerificationResult {
  try {
    if (!apiKey || !timestamp || !token || !signature) {
      return { valid: false, error: 'Missing required parameters' };
    }

    // Mailgun concatenates timestamp + token for signing
    const data = timestamp + token;
    
    // Create HMAC-SHA256 hash
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(data)
      .digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    return { valid: isValid };
  } catch (error) {
    return { 
      valid: false, 
      error: `Mailgun signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * AWS SNS Message Signature Verification
 * 
 * AWS SNS uses RSA-SHA1 or RSA-SHA256 for message signatures.
 * The signature is verified using AWS's public certificate.
 * 
 * @param message - The SNS message object
 * @returns Promise<VerificationResult> indicating if the signature is valid
 */
export async function verifySNSSignature(message: {
  Type: string;
  MessageId: string;
  TopicArn?: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  Token?: string;
  SubscribeURL?: string;
}): Promise<VerificationResult> {
  try {
    if (!message.Signature || !message.SigningCertURL) {
      return { valid: false, error: 'Missing signature or certificate URL' };
    }

    // Validate the certificate URL is from AWS
    const certUrl = new URL(message.SigningCertURL);
    if (!certUrl.hostname.endsWith('.amazonaws.com')) {
      return { valid: false, error: 'Invalid certificate URL domain' };
    }
    if (certUrl.protocol !== 'https:') {
      return { valid: false, error: 'Certificate URL must use HTTPS' };
    }

    // Fetch the certificate
    const certResponse = await fetch(message.SigningCertURL);
    if (!certResponse.ok) {
      return { valid: false, error: 'Failed to fetch signing certificate' };
    }
    const certificate = await certResponse.text();

    // Build the string to sign based on message type
    let stringToSign: string;
    
    if (message.Type === 'Notification') {
      stringToSign = buildNotificationStringToSign(message);
    } else if (message.Type === 'SubscriptionConfirmation' || message.Type === 'UnsubscribeConfirmation') {
      stringToSign = buildSubscriptionStringToSign(message);
    } else {
      return { valid: false, error: `Unknown message type: ${message.Type}` };
    }

    // Decode the signature
    const signatureBuffer = Buffer.from(message.Signature, 'base64');

    // Determine the algorithm based on SignatureVersion
    const algorithm = message.SignatureVersion === '2' ? 'SHA256' : 'SHA1';

    // Verify the signature
    const verifier = crypto.createVerify(algorithm);
    verifier.update(stringToSign);
    verifier.end();

    const isValid = verifier.verify(certificate, signatureBuffer);

    return { valid: isValid };
  } catch (error) {
    return { 
      valid: false, 
      error: `SNS signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Build the string to sign for SNS Notification messages
 */
function buildNotificationStringToSign(message: {
  Message: string;
  MessageId: string;
  Subject?: string;
  Timestamp: string;
  TopicArn?: string;
  Type: string;
}): string {
  let stringToSign = '';
  stringToSign += 'Message\n' + message.Message + '\n';
  stringToSign += 'MessageId\n' + message.MessageId + '\n';
  if (message.Subject) {
    stringToSign += 'Subject\n' + message.Subject + '\n';
  }
  stringToSign += 'Timestamp\n' + message.Timestamp + '\n';
  if (message.TopicArn) {
    stringToSign += 'TopicArn\n' + message.TopicArn + '\n';
  }
  stringToSign += 'Type\n' + message.Type + '\n';
  return stringToSign;
}

/**
 * Build the string to sign for SNS Subscription messages
 */
function buildSubscriptionStringToSign(message: {
  Message: string;
  MessageId: string;
  SubscribeURL?: string;
  Timestamp: string;
  Token?: string;
  TopicArn?: string;
  Type: string;
}): string {
  let stringToSign = '';
  stringToSign += 'Message\n' + message.Message + '\n';
  stringToSign += 'MessageId\n' + message.MessageId + '\n';
  if (message.SubscribeURL) {
    stringToSign += 'SubscribeURL\n' + message.SubscribeURL + '\n';
  }
  stringToSign += 'Timestamp\n' + message.Timestamp + '\n';
  if (message.Token) {
    stringToSign += 'Token\n' + message.Token + '\n';
  }
  if (message.TopicArn) {
    stringToSign += 'TopicArn\n' + message.TopicArn + '\n';
  }
  stringToSign += 'Type\n' + message.Type + '\n';
  return stringToSign;
}

/**
 * Postmark Webhook Signature Verification
 * 
 * Postmark uses HMAC-SHA256 for webhook signatures.
 * The signature is created by hashing the raw body with the webhook token.
 * 
 * @param webhookToken - The Postmark webhook token
 * @param payload - The raw request body as a string
 * @param signature - The X-Postmark-Signature header
 * @returns VerificationResult indicating if the signature is valid
 */
export function verifyPostmarkSignature(
  webhookToken: string,
  payload: string,
  signature: string
): VerificationResult {
  try {
    if (!webhookToken || !payload || !signature) {
      return { valid: false, error: 'Missing required parameters' };
    }

    // Create HMAC-SHA256 hash of the payload
    const expectedSignature = crypto
      .createHmac('sha256', webhookToken)
      .update(payload)
      .digest('base64');

    // Use timing-safe comparison
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
      return { valid: isValid };
    } catch {
      // Buffers have different lengths, signatures don't match
      return { valid: false };
    }
  } catch (error) {
    return { 
      valid: false, 
      error: `Postmark signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Validate webhook timestamp to prevent replay attacks
 * 
 * @param timestamp - The timestamp from the webhook (Unix timestamp or ISO string)
 * @param maxAgeSeconds - Maximum age in seconds (default: 5 minutes)
 * @returns VerificationResult indicating if the timestamp is valid
 */
export function validateWebhookTimestamp(
  timestamp: string | number,
  maxAgeSeconds: number = 300
): VerificationResult {
  try {
    let webhookTime: number;
    
    if (typeof timestamp === 'number') {
      webhookTime = timestamp * 1000; // Convert Unix timestamp to milliseconds
    } else if (typeof timestamp === 'string') {
      // Try parsing as Unix timestamp first
      const parsed = parseInt(timestamp, 10);
      if (!isNaN(parsed)) {
        webhookTime = parsed * 1000;
      } else {
        // Try parsing as ISO string
        webhookTime = new Date(timestamp).getTime();
      }
    } else {
      return { valid: false, error: 'Invalid timestamp format' };
    }

    if (isNaN(webhookTime)) {
      return { valid: false, error: 'Could not parse timestamp' };
    }

    const now = Date.now();
    const age = Math.abs(now - webhookTime) / 1000;

    if (age > maxAgeSeconds) {
      return { 
        valid: false, 
        error: `Webhook timestamp is too old: ${age.toFixed(0)} seconds (max: ${maxAgeSeconds})` 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Timestamp validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Environment variable keys for webhook secrets
 */
export const WEBHOOK_SECRET_KEYS = {
  SENDGRID_WEBHOOK_PUBLIC_KEY: 'SENDGRID_WEBHOOK_PUBLIC_KEY',
  MAILGUN_WEBHOOK_SIGNING_KEY: 'MAILGUN_WEBHOOK_SIGNING_KEY',
  POSTMARK_WEBHOOK_TOKEN: 'POSTMARK_WEBHOOK_TOKEN',
} as const;

/**
 * Get webhook secret from environment
 */
export function getWebhookSecret(key: keyof typeof WEBHOOK_SECRET_KEYS): string | undefined {
  return process.env[WEBHOOK_SECRET_KEYS[key]];
}
