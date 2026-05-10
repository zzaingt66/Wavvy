import { Pool } from "pg";

const connectionString = process.env.SUPABASE_URL ?? "";

if (!connectionString) {
  console.warn("SUPABASE_URL is not set. Dashboard will use mock data.");
}

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 6,
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 5_000
    })
  : null;

export async function runQuery<T>(query: string, values: unknown[] = []): Promise<T[]> {
  if (!pool) {
    return [];
  }
  const result = await pool.query<T>(query, values
  return result.rows;
}
