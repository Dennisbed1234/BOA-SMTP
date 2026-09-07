import { neon } from "@neondatabase/serverless";

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(databaseUrl);
}

// Lazy proxy so importing this module does not crash the whole process at load time
export const sql = ((...args: Parameters<ReturnType<typeof neon>>) => {
  return getSql()(...args);
}) as ReturnType<typeof neon>;
