import { neon } from "@neondatabase/serverless";

/** Neon tagged template returns a row array by default */
export type SqlRows = Record<string, any>[];

type SqlFn = {
  (strings: TemplateStringsArray, ...values: any[]): Promise<SqlRows>;
};

let cached: SqlFn | null = null;

function getSql(): SqlFn {
  if (cached) return cached;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Cast: default neon() returns array of rows; union types break .length checks under strict TS
  cached = neon(databaseUrl) as unknown as SqlFn;
  return cached;
}

export const sql: SqlFn = ((strings: TemplateStringsArray, ...values: any[]) => {
  return getSql()(strings, ...values);
}) as SqlFn;
