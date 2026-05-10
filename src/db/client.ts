import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for CMS operations.");
  }

  if (!dbInstance) {
    const pool = new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 5000
    });
    dbInstance = drizzle(pool, { schema });
  }

  return dbInstance;
}
