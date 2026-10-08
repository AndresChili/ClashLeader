import { loadConfig } from "./config";

async function main() {
  const config = loadConfig();
  console.log(
    `ClashLeader collector configured (proxy: ${config.CLASH_API_BASE_URL}, max clans per run: ${config.MAX_CLANS_PER_RUN}).`,
  );
  // Fetching and persisting snapshots lands in phase 2.
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
