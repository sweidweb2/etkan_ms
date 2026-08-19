import { spawnSync } from "node:child_process";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

const ROUNDS = 10;

function secToMs(value: string): number {
  return Number(value) * 1000;
}

function runCurl(url: string, serviceRoleKey: string): {
  status: string;
  dns: number;
  connect: number;
  tls: number;
  ttfb: number;
  total: number;
} {
  const result = spawnSync(
    "curl.exe",
    [
      "-s",
      "-o",
      "NUL",
      "-w",
      "status=%{http_code} dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}",
      "-H",
      `apikey: ${serviceRoleKey}`,
      "-H",
      `Authorization: Bearer ${serviceRoleKey}`,
      `${url.replace(/\/$/, "")}/rest/v1/classes?select=id&limit=1`,
    ],
    { encoding: "utf8" }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `curl exited ${result.status}`);
  }

  const parsed: Record<string, string> = {};
  for (const part of result.stdout.trim().split(/\s+/)) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      parsed[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }

  return {
    status: parsed.status ?? "?",
    dns: secToMs(parsed.dns ?? "0"),
    connect: secToMs(parsed.connect ?? "0"),
    tls: secToMs(parsed.tls ?? "0"),
    ttfb: secToMs(parsed.ttfb ?? "0"),
    total: secToMs(parsed.total ?? "0"),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  console.log("curl.exe REST timing (classes?select=id&limit=1)");
  console.log("Same machine as Node. Fresh TCP+TLS each round.\n");

  const wait: number[] = [];
  const totals: number[] = [];

  for (let i = 1; i <= ROUNDS; i += 1) {
    const row = runCurl(url, serviceRoleKey);
    const serverWait = row.ttfb - row.tls;
    wait.push(serverWait);
    totals.push(row.total);
    console.log(
      `#${String(i).padStart(2, "0")} status=${row.status}  DNS=${row.dns.toFixed(0)}ms  Connect=${row.connect.toFixed(0)}ms  TLS=${row.tls.toFixed(0)}ms  TTFB=${row.ttfb.toFixed(0)}ms  Total=${row.total.toFixed(0)}ms  (TTFB-TLS=${serverWait.toFixed(0)}ms)`
    );
  }

  console.log(
    `\nmedian Total=${median(totals).toFixed(0)}ms  median wait after TLS=${median(wait).toFixed(0)}ms`
  );
}

main();
