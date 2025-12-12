import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('Analytics Dashboard', () => {
  it('should have AdminNotificationAnalytics page component', async () => {
    const fs = await import('fs');
    // Use relative path from project root instead of hardcoded absolute path
    const projectRoot = path.resolve(__dirname, '..');
    const filePath = path.join(projectRoot, 'client/src/pages/AdminNotificationAnalytics.tsx');
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
  });

  it('should have notification analytics stats endpoint', async () => {
    const { getNotificationAnalyticsStats } = await import('./db');
    expect(typeof getNotificationAnalyticsStats).toBe('function');
  });

  it('should have recent notification analytics endpoint', async () => {
    const { getRecentNotificationAnalytics } = await import('./db');
    expect(typeof getRecentNotificationAnalytics).toBe('function');
  });
});

describe('Email Subject A/B Testing', () => {
  it('should have createEmailSubjectTest function', async () => {
    const { createEmailSubjectTest } = await import('./db');
    expect(typeof createEmailSubjectTest).toBe('function');
  });

  it('should have addSubjectVariant function', async () => {
    const { addSubjectVariant } = await import('./db');
    expect(typeof addSubjectVariant).toBe('function');
  });

  it('should have getEmailSubjectTest function', async () => {
    const { getEmailSubjectTest } = await import('./db');
    expect(typeof getEmailSubjectTest).toBe('function');
  });

  it('should have getAllSubjectTests function', async () => {
    const { getAllSubjectTests } = await import('./db');
    expect(typeof getAllSubjectTests).toBe('function');
  });

  it('should have startSubjectTest function', async () => {
    const { startSubjectTest } = await import('./db');
    expect(typeof startSubjectTest).toBe('function');
  });

  it('should have selectRandomVariant function', async () => {
    const { selectRandomVariant } = await import('./db');
    expect(typeof selectRandomVariant).toBe('function');
  });

  it('should have recordVariantOpen function', async () => {
    const { recordVariantOpen } = await import('./db');
    expect(typeof recordVariantOpen).toBe('function');
  });

  it('should have checkAndCompleteSubjectTest function', async () => {
    const { checkAndCompleteSubjectTest } = await import('./db');
    expect(typeof checkAndCompleteSubjectTest).toBe('function');
  });
});

describe('Email Bounce Handling', () => {
  it('should have recordBounce function', async () => {
    const { recordBounce } = await import('./db');
    expect(typeof recordBounce).toBe('function');
  });

  it('should have addToSuppressionList function', async () => {
    const { addToSuppressionList } = await import('./db');
    expect(typeof addToSuppressionList).toBe('function');
  });

  it('should have isEmailSuppressed function', async () => {
    const { isEmailSuppressed } = await import('./db');
    expect(typeof isEmailSuppressed).toBe('function');
  });

  it('should have removeFromSuppressionList function', async () => {
    const { removeFromSuppressionList } = await import('./db');
    expect(typeof removeFromSuppressionList).toBe('function');
  });

  it('should have getSuppressionList function', async () => {
    const { getSuppressionList } = await import('./db');
    expect(typeof getSuppressionList).toBe('function');
  });

  it('should have getBounceStats function', async () => {
    const { getBounceStats } = await import('./db');
    expect(typeof getBounceStats).toBe('function');
  });

  it('should have getRecentBounces function', async () => {
    const { getRecentBounces } = await import('./db');
    expect(typeof getRecentBounces).toBe('function');
  });
});

describe('Schema Tables', () => {
  it('should have email_subject_tests table', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.emailSubjectTests).toBeDefined();
  });

  it('should have email_subject_variants table', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.emailSubjectVariants).toBeDefined();
  });

  it('should have email_bounces table', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.emailBounces).toBeDefined();
  });

  it('should have email_suppression_list table', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.emailSuppressionList).toBeDefined();
  });
});
