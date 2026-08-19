import { Client } from "pg";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

async function main() {
  loadEnvLocal();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12_000,
  });

  const connectStart = performance.now();
  await client.connect();
  console.log(`connect: ${(performance.now() - connectStart).toFixed(0)}ms`);

  await client.query(`
    create or replace function public.latency_probe()
    returns integer
    language sql
    as $$
      select 1;
    $$;
  `);
  console.log("created public.latency_probe()");

  const start = performance.now();
  const result = await client.query("select public.latency_probe() as n");
  console.log(
    `direct sql latency_probe: ${(performance.now() - start).toFixed(0)}ms  n=${result.rows[0]?.n}`
  );

  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
