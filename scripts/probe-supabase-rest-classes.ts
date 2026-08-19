import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

const ROUNDS = 10;

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

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  console.log(`GET ${url.replace(/\/$/, "")}/rest/v1/classes?select=id&limit=1`);
  console.log("service-role, same client/headers as the old-project probe\n");

  const client = createSeedAdminClient();
  const jsSamples: number[] = [];
  console.log("supabase-js from(\"classes\").select(\"id\").limit(1):");
  for (let i = 1; i <= ROUNDS; i += 1) {
    const start = performance.now();
    const { data, error } = await client.from("classes").select("id").limit(1);
    const ms = performance.now() - start;
    jsSamples.push(ms);
    console.log(
      `  #${String(i).padStart(2, "0")}  ${ms.toFixed(0)}ms  rows=${data?.length ?? 0}${error ? `  error=${error.message}` : ""}`
    );
  }
  summarize("supabase-js classes", jsSamples);

  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/classes?select=id&limit=1`;
  const restSamples: number[] = [];
  console.log("\nraw fetch GET (no supabase-js):");
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
    restSamples.push(ms);
    console.log(
      `  #${String(i).padStart(2, "0")}  ${ms.toFixed(0)}ms  status=${response.status}`
    );
  }
  summarize("raw REST classes", restSamples);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
