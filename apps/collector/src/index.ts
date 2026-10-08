import { ClashApiClient, ClashApiError } from "./clash-api/client";
import { loadConfig } from "./config";
import { createServiceRoleClient } from "./db/client";
import { getRegisteredClans, markClanCollected } from "./db/registered-clans";
import { runClanCollection } from "./run-clan";

async function main() {
  const config = loadConfig();
  const supabase = createServiceRoleClient(config);
  const clashApi = new ClashApiClient({ baseUrl: config.CLASH_API_BASE_URL, token: config.CLASH_API_TOKEN });

  const clans = await getRegisteredClans(supabase, config.MAX_CLANS_PER_RUN);
  console.log(`Collector run: ${clans.length} registered clan(s), cap ${config.MAX_CLANS_PER_RUN}.`);

  let failures = 0;
  for (const clan of clans) {
    try {
      const result = await runClanCollection(clashApi, supabase, clan);
      await markClanCollected(supabase, clan.id);
      console.log(
        `  ${result.clanTag}: ${result.memberCount} members, +${result.joined}/-${result.left}, ${result.activityDetected} active.`,
      );
    } catch (error) {
      failures += 1;
      if (error instanceof ClashApiError) {
        console.error(`  ${clan.tag}: Clash API error ${error.status} — ${error.message}`);
      } else {
        console.error(`  ${clan.tag}: ${error instanceof Error ? error.message : String(error)}`);
      }
      // One clan failing (bad tag, API hiccup) must not stop the rest.
    }
  }

  if (failures > 0) {
    console.warn(`Collector run finished with ${failures} failing clan(s) out of ${clans.length}.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
