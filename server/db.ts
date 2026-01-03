import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

// Lazy initialization to avoid blocking module load
let _pool: pg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// For backward compatibility - these are getters that lazily initialize
export const pool = new Proxy({} as pg.Pool, {
  get(_, prop) {
    return (getPool() as any)[prop];
  }
});

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});
