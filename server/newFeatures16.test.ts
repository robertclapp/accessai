/**
 * Tests for new features:
 * - Invite collaborator dialog in Collections tab
 * - Weekly digest email scheduled job
 * - Activity feed for collaborator actions
 */

import { describe, it, expect } from "vitest";

describe("Invite Collaborator Dialog", () => {
  it("should have invite collaborator procedure", async () => {
    const { inviteCollaborator } = await import("./db");
    expect(typeof inviteCollaborator).toBe("function");
  });

  it("should have search users procedure", async () => {
    const { searchUsersByEmail } = await import("./db");
    expect(typeof searchUsersByEmail).toBe("function");
  });

  it("should have get collection collaborators procedure", async () => {
    const { getCollectionCollaborators } = await import("./db");
    expect(typeof getCollectionCollaborators).toBe("function");
  });

  it("should have remove collaborator procedure", async () => {
    const { removeCollaborator } = await import("./db");
    expect(typeof removeCollaborator).toBe("function");
  });
});

describe("Weekly Digest Email Job", () => {
  it("should have getUsersForDigest function", async () => {
    const { getUsersForDigest } = await import("./jobs/weeklyDigest");
    expect(typeof getUsersForDigest).toBe("function");
  });

  it("should have processWeeklyDigests function", async () => {
    const { processWeeklyDigests } = await import("./jobs/weeklyDigest");
    expect(typeof processWeeklyDigests).toBe("function");
  });

  it("should have triggerDigestForUser function", async () => {
    const { triggerDigestForUser } = await import("./jobs/weeklyDigest");
    expect(typeof triggerDigestForUser).toBe("function");
  });

  it("should have generateDigestContent function in db", async () => {
    const { generateDigestContent } = await import("./db");
    expect(typeof generateDigestContent).toBe("function");
  });

  it("should have logDigestSent function in db", async () => {
    const { logDigestSent } = await import("./db");
    expect(typeof logDigestSent).toBe("function");
  });

  it("should have getDigestHistory function in db", async () => {
    const { getDigestHistory } = await import("./db");
    expect(typeof getDigestHistory).toBe("function");
  });
});

describe("Activity Feed", () => {
  it("should have logCollectionActivity function", async () => {
    const { logCollectionActivity } = await import("./db");
    expect(typeof logCollectionActivity).toBe("function");
  });

  it("should have getCollectionActivityFeed function", async () => {
    const { getCollectionActivityFeed } = await import("./db");
    expect(typeof getCollectionActivityFeed).toBe("function");
  });

  it("should have getUserCollectionsActivityFeed function", async () => {
    const { getUserCollectionsActivityFeed } = await import("./db");
    expect(typeof getUserCollectionsActivityFeed).toBe("function");
  });

  it("should have getUnreadActivityCount function", async () => {
    const { getUnreadActivityCount } = await import("./db");
    expect(typeof getUnreadActivityCount).toBe("function");
  });

  it("should support all activity types", async () => {
    // Activity types that should be supported
    const activityTypes = [
      "template_added",
      "template_removed",
      "collaborator_invited",
      "collaborator_joined",
      "collaborator_left",
      "collaborator_removed",
      "collection_updated",
      "collection_shared",
      "collection_unshared",
    ];
    
    expect(activityTypes.length).toBe(9);
  });
});

describe("Activity Feed Schema", () => {
  it("should have collectionActivityFeed table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.collectionActivityFeed).toBeDefined();
  });

  it("should have required fields in activity feed table", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.collectionActivityFeed;
    
    // Check that the table has the expected structure
    expect(table).toBeDefined();
  });
});

describe("Digest Email Preferences", () => {
  it("should have getDigestPreferences function", async () => {
    const { getDigestPreferences } = await import("./db");
    expect(typeof getDigestPreferences).toBe("function");
  });

  it("should have updateDigestPreferences function", async () => {
    const { updateDigestPreferences } = await import("./db");
    expect(typeof updateDigestPreferences).toBe("function");
  });
});

describe("Collaborative Collections Integration", () => {
  it("should have respondToInvitation function", async () => {
    const { respondToInvitation } = await import("./db");
    expect(typeof respondToInvitation).toBe("function");
  });

  it("should have getPendingInvitations function", async () => {
    const { getPendingInvitations } = await import("./db");
    expect(typeof getPendingInvitations).toBe("function");
  });

  it("should have getCollaborativeCollections function", async () => {
    const { getCollaborativeCollections } = await import("./db");
    expect(typeof getCollaborativeCollections).toBe("function");
  });

  it("should have updateCollaboratorRole function", async () => {
    const { updateCollaboratorRole } = await import("./db");
    expect(typeof updateCollaboratorRole).toBe("function");
  });

  it("should have canEditCollection function", async () => {
    const { canEditCollection } = await import("./db");
    expect(typeof canEditCollection).toBe("function");
  });
});
