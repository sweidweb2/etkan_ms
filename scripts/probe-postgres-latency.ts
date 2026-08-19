import { Client } from "pg";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

const ROUNDS = 5;

async function main() {
  loadEnvLocal();
  const raw = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? null;

  if (!raw) {
    throw new Error(
      "Missing DATABASE_URL. Use the Session pooler URI from Supabase → Database → Connection string (IPv4). Direct db.<project>.supabase.co is IPv6-only and this machine cannot reach it."
    );
  }

  const connectionString = raw.replace(/[?&]sslmode=[^&]*/g, "");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });

  const connectStart = performance.now();
  await client.connect();
  console.log(`connect: ${(performance.now() - connectStart).toFixed(2)}ms`);
  console.log("SELECT id FROM classes LIMIT 1  (same TCP session)\n");

  for (let i = 0; i < ROUNDS; i += 1) {
    const start = performance.now();
    const result = await client.query("SELECT id FROM classes LIMIT 1");
    console.log(
      `${i + 1}: ${(performance.now() - start).toFixed(2)}ms  rows=${result.rowCount ?? 0}`
    );
  }

  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
