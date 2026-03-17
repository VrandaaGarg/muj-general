import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";
import * as schema from "@/db/schema";

declare global {
  var __mujGeneralPool: Pool | undefined;
}

const pool =
  global.__mujGeneralPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === "production" ? 20 : 5,
  });

if (env.NODE_ENV !== "production") {
  global.__mujGeneralPool = pool;
}

export const db = drizzle(pool, { schema });

export { pool };
