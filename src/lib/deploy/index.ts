import "server-only";
import { codexaProvider } from "./codexa";
import { vercelProvider } from "./vercel";
import type { DeployProvider, DeployProviderId } from "./types";

export { DeployError } from "./types";
export type { DeployProvider, DeployProviderId, DeployRequest, DeployOutcome } from "./types";

const providers: Record<DeployProviderId, DeployProvider> = { codexa: codexaProvider, vercel: vercelProvider };

export function getDeployProvider(id: DeployProviderId): DeployProvider {
  return providers[id];
}

export async function listDeployProviders() {
  return Promise.all(
    (Object.keys(providers) as DeployProviderId[]).map(async (id) => {
      const p = providers[id];
      const a = await p.availability();
      return { id, name: p.name, available: a.available, reason: a.reason };
    }),
  );
}
