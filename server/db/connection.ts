/**
 * Database Connection Module
 *
 * Provides a singleton database connection using Drizzle ORM.
 * This module is the foundation for all database operations.
 */

import { drizzle } from "drizzle-orm/mysql2";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Get the database connection instance.
 * Uses lazy initialization to connect only when needed.
 * Returns null if DATABASE_URL is not configured.
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Reset the database connection.
 * Useful for testing or when reconnection is needed.
 */
export function resetDbConnection() {
  _db = null;
}
