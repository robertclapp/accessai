import { describe, it, expect } from 'vitest';
import { digestEmailTemplate, activityNotificationTemplate, welcomeEmailTemplate } from './services/emailTemplates';

describe('Branded HTML Email Templates', () => {
  describe('digestEmailTemplate', () => {
    it('should generate HTML with user name', () => {
      const html = digestEmailTemplate({
        userName: 'John Doe',
        period: 'weekly',
        sections: [],
        unsubscribeToken: 'test-token',
      });
      
      expect(html).toContain('John Doe');
      expect(html).toContain('weekly');
    });
    
    it('should include unsubscribe link', () => {
      const html = digestEmailTemplate({
        userName: 'Jane',
        period: 'daily',
        sections: [],
        unsubscribeToken: 'unsubscribe-123',
      });
      
      expect(html).toContain('unsubscribe-123');
      expect(html).toContain('Unsubscribe');
    });
    
    it('should render sections with items', () => {
      const html = digestEmailTemplate({
        userName: 'User',
        period: 'weekly',
        sections: [
          {
            title: 'Marketing Templates',
            icon: '📝',
            items: [
              { name: 'Template 1', description: 'A great template' },
            ],
          },
        ],
        unsubscribeToken: 'test-token',
      });
      
      expect(html).toContain('Marketing Templates');
      expect(html).toContain('Template 1');
    });
    
    it('should render stats when provided', () => {
      const html = digestEmailTemplate({
        userName: 'User',
        period: 'monthly',
        sections: [],
        stats: {
          newTemplates: 5,
          totalCollections: 10,
          activeTests: 3,
        },
        unsubscribeToken: 'test-token',
      });
      
      expect(html).toContain('5');
      expect(html).toContain('New Templates');
    });
  });
  
  describe('activityNotificationTemplate', () => {
    it('should generate activity notification HTML', () => {
      const html = activityNotificationTemplate({
        userName: 'Alice',
        activities: [
          {
            type: 'template_added',
            message: 'Bob added a template',
            collectionName: 'My Collection',
            actorName: 'Bob',
            timestamp: new Date('2024-01-01'),
          },
        ],
        unsubscribeToken: 'test-token',
      });
      
      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
      expect(html).toContain('My Collection');
    });
  });
  
  describe('welcomeEmailTemplate', () => {
    it('should generate welcome email HTML', () => {
      const html = welcomeEmailTemplate({
        userName: 'New User',
        loginUrl: 'https://example.com/login',
      });
      
      expect(html).toContain('New User');
      expect(html).toContain('Welcome');
    });
  });
});

describe('Admin Scheduler Dashboard', () => {
  it('should have job history tracking in db', async () => {
    const { logJobExecution, getJobHistory, getJobStats } = await import('./db');
    
    expect(typeof logJobExecution).toBe('function');
    expect(typeof getJobHistory).toBe('function');
    expect(typeof getJobStats).toBe('function');
  });
  
  it('should have scheduler status functions', async () => {
    const { getSchedulerStatus, getJobs, runJobManually, setJobEnabled } = await import('./jobs/cronScheduler');
    
    expect(typeof getSchedulerStatus).toBe('function');
    expect(typeof getJobs).toBe('function');
    expect(typeof runJobManually).toBe('function');
    expect(typeof setJobEnabled).toBe('function');
  });
});

describe('Push Notifications', () => {
  it('should have push subscription functions in db', async () => {
    const { 
      savePushSubscription, 
      removePushSubscription, 
      getUserPushSubscriptions,
      getPushNotificationPreferences,
      updatePushNotificationPreferences,
    } = await import('./db');
    
    expect(typeof savePushSubscription).toBe('function');
    expect(typeof removePushSubscription).toBe('function');
    expect(typeof getUserPushSubscriptions).toBe('function');
    expect(typeof getPushNotificationPreferences).toBe('function');
    expect(typeof updatePushNotificationPreferences).toBe('function');
  });
});
