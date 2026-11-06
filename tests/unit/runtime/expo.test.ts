import { describe, expect, it } from "vitest";
import { EXPO_GO_STORE_LINKS, expoGoUrl, phoneReachability } from "@/lib/runtime/expo";

describe("expoGoUrl", () => {
  it("uses exps:// for https previews and keeps non-default ports", () => {
    expect(expoGoUrl("https://abc123.preview.example.com/")).toBe("exps://abc123.preview.example.com");
    expect(expoGoUrl("https://abc123.preview.example.com:8443/path")).toBe("exps://abc123.preview.example.com:8443");
  });

  it("uses exp:// for http previews", () => {
    expect(expoGoUrl("http://abc123.preview.localhost:4100/")).toBe("exp://abc123.preview.localhost:4100");
    expect(expoGoUrl("http://192.168.1.20/")).toBe("exp://192.168.1.20");
  });

  it("returns null for missing or non-http URLs", () => {
    expect(expoGoUrl(null)).toBeNull();
    expect(expoGoUrl("")).toBeNull();
    expect(expoGoUrl("not a url")).toBeNull();
    expect(expoGoUrl("ftp://x.example.com")).toBeNull();
  });
});

describe("phoneReachability", () => {
  it("accepts public hosts", () => {
    expect(phoneReachability("https://abc.preview.example.com/")).toEqual({ reachable: true });
  });

  it("explains why localhost and private addresses do not work from a phone", () => {
    for (const url of ["http://abc.preview.localhost:4100/", "http://localhost:3000", "http://127.0.0.1:4100", "http://[::1]:4100"]) {
      const r = phoneReachability(url);
      expect(r.reachable, url).toBe(false);
      if (!r.reachable) expect(r.reason).toMatch(/only this computer can open/);
    }
    for (const url of ["http://10.0.0.5", "http://192.168.1.4:8081", "http://172.20.1.1", "http://mybox.local"]) {
      const r = phoneReachability(url);
      expect(r.reachable, url).toBe(false);
      if (!r.reachable) expect(r.reason).toMatch(/private address/);
    }
    expect(phoneReachability("http://172.32.0.1").reachable).toBe(true);
    expect(phoneReachability(null).reachable).toBe(false);
  });

  it("links to the official Expo Go store listings", () => {
    expect(EXPO_GO_STORE_LINKS.ios).toBe("https://apps.apple.com/app/expo-go/id982107779");
    expect(EXPO_GO_STORE_LINKS.android).toBe("https://play.google.com/store/apps/details?id=host.exp.exponent");
  });
});
