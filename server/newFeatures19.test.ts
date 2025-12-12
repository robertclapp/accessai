import { describe, it, expect } from 'vitest';
import { digestEmailTemplate, activityNotificationTemplate, welcomeEmailTemplate, generateUnsubscribeToken, parseUnsubscribeToken } from './services/emailTemplates';
import { getSchedulerStatus } from './jobs/cronScheduler';
import { getNotificationAnalyticsStats } from './db';

describe('Branded HTML Email Templates', () => {
  it('should export digestEmailTemplate function', () => {
    expect(typeof digestEmailTemplate).toBe('function');
  });

  it('should export activityNotificationTemplate function', () => {
    expect(typeof activityNotificationTemplate).toBe('function');
  });

  it('should export welcomeEmailTemplate function', () => {
    expect(typeof welcomeEmailTemplate).toBe('function');
  });

  it('should export generateUnsubscribeToken function', () => {
    expect(typeof generateUnsubscribeToken).toBe('function');
    const token = generateUnsubscribeToken(123, 'test@example.com');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('should export parseUnsubscribeToken function', () => {
    expect(typeof parseUnsubscribeToken).toBe('function');
  });
});

describe('Cron Scheduler', () => {
  it('should return scheduler status', () => {
    const status = getSchedulerStatus();
    expect(status).toHaveProperty('running');
    expect(status).toHaveProperty('jobCount');
  });

  it('should export getSchedulerStatus function', () => {
    expect(typeof getSchedulerStatus).toBe('function');
  });
});

describe('Notification Analytics', () => {
  it('should return analytics stats structure', async () => {
    const stats = await getNotificationAnalyticsStats({});
    expect(stats).toHaveProperty('totalSent');
    expect(stats).toHaveProperty('totalOpened');
    expect(stats).toHaveProperty('totalClicked');
    expect(stats).toHaveProperty('openRate');
    expect(stats).toHaveProperty('clickRate');
    expect(stats).toHaveProperty('byType');
    expect(typeof stats.openRate).toBe('number');
    expect(typeof stats.clickRate).toBe('number');
  });
});
