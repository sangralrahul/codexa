import { describe, expect, it } from "vitest";
import { KNOWN_FRAMEWORKS, PREBUILT_FRAMEWORKS, limitsFor, type RunnerConfig } from "../../../services/runner/config";
import { expoEnv } from "../../../services/runner/sessions";
import { isBundleRequest } from "../../../services/runner/proxy";

const limits = { memoryBytes: 1024, expoMemoryBytes: 2560 } as RunnerConfig["limits"];

describe("expo runner support", () => {
  it("is a known framework with a prebuilt dependency set", () => {
    expect(KNOWN_FRAMEWORKS).toContain("expo");
    expect(PREBUILT_FRAMEWORKS).toContain("expo");
  });

  it("points Expo Go manifests at the public preview URL and keeps Expo offline", () => {
    const env = expoEnv("https://abc.preview.example.com/");
    expect(env.EXPO_PACKAGER_PROXY_URL).toBe("https://abc.preview.example.com");
    expect(env).toMatchObject({ EXPO_OFFLINE: "1", EXPO_NO_TELEMETRY: "1", CODEXA_SHARED_NODE_MODULES: "/work/base/expo/node_modules" });
    expect(env.CI).toBeUndefined();
    expect(expoEnv(null).EXPO_PACKAGER_PROXY_URL).toBeUndefined();
  });

  it("gives Expo sandboxes a memory floor and leaves other frameworks alone", () => {
    expect(limitsFor(limits, "expo").memoryBytes).toBe(2560);
    expect(limitsFor({ ...limits, memoryBytes: 4096 }, "expo").memoryBytes).toBe(4096);
    expect(limitsFor(limits, "vite-react")).toBe(limits);
  });

  it("recognises Metro bundle and source map requests", () => {
    expect(isBundleRequest("/index.ts.bundle")).toBe(true);
    expect(isBundleRequest("/index.ts.map")).toBe(true);
    expect(isBundleRequest("/")).toBe(false);
    expect(isBundleRequest("/assets/logo.png")).toBe(false);
  });
});
