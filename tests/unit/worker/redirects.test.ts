import { describe, expect, it } from "vitest";
import { legacyRedirect, type RedirectEnv } from "../../../worker/redirects";

const env = {
  CANONICAL_HOST: "codexa.host",
  LEGACY_APP_HOSTS: "codexa.creditvault.tech",
  LEGACY_DEPLOY_HOST: "-sites.creditvault.tech",
  DEPLOY_HOST: "-sites.codexa.host",
};
const go = (u: string, e: RedirectEnv = env) => legacyRedirect(new URL(u), e);

describe("domain move redirects", () => {
  it("sends the old app address to the new one, keeping path and query", () => {
    expect(go("https://codexa.creditvault.tech/dashboard?tab=live")).toBe("https://codexa.host/dashboard?tab=live");
    expect(go("https://codexa.creditvault.tech/")).toBe("https://codexa.host/");
    expect(go("https://www.codexa.creditvault.tech/pricing")).toBe("https://codexa.host/pricing");
  });

  it("sends www to the bare new address", () => {
    expect(go("https://www.codexa.host/login")).toBe("https://codexa.host/login");
  });

  it("serves the new address itself", () => {
    expect(go("https://codexa.host/dashboard")).toBeNull();
  });

  it("moves published sites to the new sites host", () => {
    expect(go("https://candle-store-sites.creditvault.tech/menu?x=1")).toBe("https://candle-store-sites.codexa.host/menu?x=1");
    expect(go("https://candle-store-sites.codexa.host/")).toBeNull();
  });

  it("leaves previews and unrelated hosts alone", () => {
    expect(go("https://abc123-preview.creditvault.tech/")).toBeNull();
    expect(go("https://abc123-preview.codexa.host/")).toBeNull();
    expect(go("https://example.com/")).toBeNull();
  });

  it("never loops when the canonical host is also listed as legacy", () => {
    expect(go("https://codexa.host/", { ...env, LEGACY_APP_HOSTS: "codexa.host,codexa.creditvault.tech" })).toBeNull();
  });

  it("does nothing when not configured", () => {
    expect(go("https://codexa.creditvault.tech/", {})).toBeNull();
  });
});
