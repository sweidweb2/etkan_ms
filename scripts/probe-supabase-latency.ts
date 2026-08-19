import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

const ROUNDS = 10;

type TableName = "profiles" | "classes" | "student_profiles";

async function timeOnce(
  client: ReturnType<typeof createSeedAdminClient>,
  table: TableName
): Promise<{ ms: number; error: string | null; rows: number }> {
  const start = performance.now();
  const { data, error } = await client.from(table).select("id").limit(1);
  return {
    ms: performance.now() - start,
    error: error?.message ?? null,
    rows: data?.length ?? 0,
  };
}

function summarize(label: string, samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  console.log(
    `${label}  n=${sorted.length}  min=${sorted[0].toFixed(0)}ms  median=${median.toFixed(0)}ms  max=${sorted[sorted.length - 1].toFixed(0)}ms  avg=${(sum / sorted.length).toFixed(0)}ms`
  );
}

async function probeHttpOrigin(url: string, anonKey: string) {
  const samples: number[] = [];
  for (let i = 0; i < ROUNDS; i += 1) {
    const start = performance.now();
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    samples.push(performance.now() - start);
    if (i === 0) {
      console.log(
        `  rest/v1 HEAD status=${response.status} first=${samples[0].toFixed(0)}ms`
      );
    }
  }
  summarize("HTTP origin (HEAD /rest/v1/)", samples);
}

async function probeTable(
  client: ReturnType<typeof createSeedAdminClient>,
  table: TableName
) {
  const samples: number[] = [];
  for (let i = 1; i <= ROUNDS; i += 1) {
    const result = await timeOnce(client, table);
    samples.push(result.ms);
    console.log(
      `  ${table} #${String(i).padStart(2, "0")}  ${result.ms.toFixed(0)}ms  rows=${result.rows}${result.error ? `  error=${result.error}` : ""}`
    );
  }
  summarize(table, samples);
}

async function probeRawRest(
  url: string,
  serviceRoleKey: string,
  table: TableName
) {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/${table}?select=id&limit=1`;
  const samples: number[] = [];
  for (let i = 1; i <= ROUNDS; i += 1) {
    const start = performance.now();
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    await response.text();
    const ms = performance.now() - start;
    samples.push(ms);
    console.log(
      `  rest ${table} #${String(i).padStart(2, "0")}  ${ms.toFixed(0)}ms  status=${response.status}`
    );
  }
  summarize(`raw REST ${table}`, samples);
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  console.log(`Supabase URL: ${url}`);
  console.log("Client: service-role admin (same as manager pages)\n");

  if (anonKey) {
    console.log("Network floor (no SQL):");
    await probeHttpOrigin(url, anonKey);
    console.log("");
  }

  const client = createSeedAdminClient();
  console.log("Trivial PostgREST selects (id limit 1), same client reused:");
  await probeTable(client, "profiles");
  console.log("");
  await probeTable(client, "classes");
  console.log("");
  await probeTable(client, "student_profiles");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    console.log("\nSame query via raw fetch (no supabase-js):");
    await probeRawRest(url, serviceRoleKey, "classes");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
