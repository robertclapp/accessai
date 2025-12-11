/**
 * Tests for Featured Collections, Collection Following, and Template Recommendations
 */

import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Featured Collections', () => {
  it('should have getFeaturedCollections function', () => {
    expect(typeof db.getFeaturedCollections).toBe('function');
  });

  it('should have getTopPublicCollections function', () => {
    expect(typeof db.getTopPublicCollections).toBe('function');
  });

  it('getFeaturedCollections should accept limit parameter', async () => {
    // Function should not throw when called
    const result = await db.getFeaturedCollections(5);
    expect(Array.isArray(result)).toBe(true);
  });

  it('getTopPublicCollections should accept sortBy and limit parameters', async () => {
    const result = await db.getTopPublicCollections('followers', 10);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Collection Following', () => {
  it('should have followCollection function', () => {
    expect(typeof db.followCollection).toBe('function');
  });

  it('should have unfollowCollection function', () => {
    expect(typeof db.unfollowCollection).toBe('function');
  });

  it('should have getFollowedCollections function', () => {
    expect(typeof db.getFollowedCollections).toBe('function');
  });

  it('should have isFollowingCollection function', () => {
    expect(typeof db.isFollowingCollection).toBe('function');
  });

  it('should have toggleCollectionNotifications function', () => {
    expect(typeof db.toggleCollectionNotifications).toBe('function');
  });

  it('should have notifyCollectionFollowers function', () => {
    expect(typeof db.notifyCollectionFollowers).toBe('function');
  });

  it('getFollowedCollections should return array', async () => {
    const result = await db.getFollowedCollections(999999);
    expect(Array.isArray(result)).toBe(true);
  });

  it('isFollowingCollection should return boolean', async () => {
    const result = await db.isFollowingCollection(999999, 999999);
    expect(typeof result).toBe('boolean');
  });
});

describe('Template Recommendations', () => {
  it('should have generateRecommendations function', () => {
    expect(typeof db.generateRecommendations).toBe('function');
  });

  it('should have getRecommendations function', () => {
    expect(typeof db.getRecommendations).toBe('function');
  });

  it('should have markRecommendationSeen function', () => {
    expect(typeof db.markRecommendationSeen).toBe('function');
  });

  it('should have dismissRecommendation function', () => {
    expect(typeof db.dismissRecommendation).toBe('function');
  });

  it('should have getRecommendationReasonText function', () => {
    expect(typeof db.getRecommendationReasonText).toBe('function');
  });

  it('getRecommendationReasonText should return correct text for similar_category', () => {
    const result = db.getRecommendationReasonText('similar_category');
    expect(result).toBe('Based on your category preferences');
  });

  it('getRecommendationReasonText should return correct text for popular', () => {
    const result = db.getRecommendationReasonText('popular');
    expect(result).toBe('Popular in the community');
  });

  it('getRecommendationReasonText should return correct text for highly_rated', () => {
    const result = db.getRecommendationReasonText('highly_rated');
    expect(result).toBe('Highly rated by users');
  });

  it('getRecommendationReasonText should return default text for unknown reason', () => {
    const result = db.getRecommendationReasonText('unknown');
    expect(result).toBe('Recommended for you');
  });

  it('getRecommendations should return array', async () => {
    const result = await db.getRecommendations(999999, 10);
    expect(Array.isArray(result)).toBe(true);
  });

  it('generateRecommendations should return object with generated count', async () => {
    const result = await db.generateRecommendations(999999);
    expect(typeof result).toBe('object');
    expect(typeof result.generated).toBe('number');
  });
});

describe('Recommendation Engine Logic', () => {
  it('should handle users with no usage history', async () => {
    const result = await db.generateRecommendations(999999);
    expect(result.generated).toBeGreaterThanOrEqual(0);
  });

  it('should not crash when dismissing non-existent recommendation', async () => {
    const result = await db.dismissRecommendation(999999, 999999);
    expect(result.success).toBeDefined();
  });

  it('should not crash when marking non-existent recommendation as seen', async () => {
    const result = await db.markRecommendationSeen(999999, 999999);
    expect(result.success).toBeDefined();
  });
});
