import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

const ROUNDS = 10;

type RpcClient = {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  console.log(
    `rpc latency_probe  n=${sorted.length}  min=${sorted[0].toFixed(0)}ms  median=${median.toFixed(0)}ms  max=${sorted[sorted.length - 1].toFixed(0)}ms  avg=${(sum / sorted.length).toFixed(0)}ms`
  );
}

async function main() {
  const client = createSeedAdminClient() as unknown as RpcClient;
  const samples: number[] = [];

  console.log('adminClient.rpc("latency_probe")  (same service-role client as REST)\n');

  for (let i = 1; i <= ROUNDS; i += 1) {
    const start = performance.now();
    const { data, error } = await client.rpc("latency_probe");
    const ms = performance.now() - start;
    samples.push(ms);
    console.log(
      `#${String(i).padStart(2, "0")}  ${ms.toFixed(0)}ms  data=${JSON.stringify(data)}${error ? `  error=${error.message}` : ""}`
    );
    if (error) {
      throw new Error(error.message);
    }
  }

  console.log("");
  summarize(samples);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
