import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

import { appUsers, departments, tags, user } from "../src/db/schema";

const defaultDepartments = [
  {
    name: "Computer Science",
    slug: "computer-science",
    description: "Computing, software engineering, data, and AI research.",
  },
  {
    name: "Electronics and Communication",
    slug: "electronics-communication",
    description: "Electronics, communication systems, and embedded research.",
  },
  {
    name: "Mechanical Engineering",
    slug: "mechanical-engineering",
    description: "Manufacturing, design, robotics, and thermal systems research.",
  },
  {
    name: "Management Studies",
    slug: "management-studies",
    description: "Business, economics, and organizational research outputs.",
  },
];

const defaultTags = [
  { name: "Artificial Intelligence", slug: "artificial-intelligence" },
  { name: "Machine Learning", slug: "machine-learning" },
  { name: "Sustainability", slug: "sustainability" },
  { name: "Healthcare", slug: "healthcare" },
  { name: "Data Science", slug: "data-science" },
  { name: "IoT", slug: "iot" },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run the seed script.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await db.insert(departments).values(defaultDepartments).onConflictDoNothing();
    await db.insert(tags).values(defaultTags).onConflictDoNothing();

    const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();

    if (adminEmail) {
      const [existingUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, adminEmail))
        .limit(1);

      if (existingUser) {
        await db
          .update(appUsers)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(appUsers.id, existingUser.id));
        console.info(`Promoted ${adminEmail} to admin.`);
      } else {
        console.info(`No user found for ADMIN_SEED_EMAIL=${adminEmail}.`);
      }
    }

    console.info(
      `Seed complete: ${defaultDepartments.length} departments, ${defaultTags.length} tags.`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
