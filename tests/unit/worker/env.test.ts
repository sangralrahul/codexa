import { describe, expect, it } from "vitest";
import { hmac, hostOnly, labelUnder, timingSafeEqualStr } from "../../../worker/env";
import { sign } from "@/lib/crypto";
import { issueRealtimeToken } from "@/lib/integrations/realtime-token";

describe("worker host routing", () => {
  it("normalises configured hosts", () => {
    expect(hostOnly("preview.example.com")).toBe("preview.example.com");
    expect(hostOnly("https://Preview.Example.com:8443/x")).toBe("preview.example.com");
    expect(hostOnly(undefined)).toBeNull();
  });

  it("extracts exactly one DNS label under the base host", () => {
    expect(labelUnder("abc123.preview.example.com", "preview.example.com")).toBe("abc123");
    expect(labelUnder("a.b.preview.example.com", "preview.example.com")).toBeNull();
    expect(labelUnder("preview.example.com", "preview.example.com")).toBeNull();
    expect(labelUnder("evil-preview.example.com", "preview.example.com")).toBeNull();
    expect(labelUnder("UPPER.preview.example.com".toLowerCase(), "preview.example.com")).toBe("upper");
    expect(labelUnder("-bad.preview.example.com", "preview.example.com")).toBeNull();
    expect(labelUnder("x.sites.example.com", null)).toBeNull();
  });
});

describe("worker signatures match the app's", () => {
  it("produces the same HMAC as sign() for the cron call", async () => {
    expect(await hmac(process.env.SESSION_SECRET!, "codexa-cron")).toBe(sign("codexa-cron"));
  });

  it("verifies realtime tokens issued by the app", async () => {
    const token = issueRealtimeToken({ projectId: "p1", userId: "u1", name: "A", color: "#000" }, process.env.SESSION_SECRET!);
    const dot = token.lastIndexOf(".");
    const expected = await hmac(process.env.SESSION_SECRET!, token.slice(0, dot));
    expect(timingSafeEqualStr(expected, token.slice(dot + 1))).toBe(true);
    expect(timingSafeEqualStr(expected, token.slice(dot + 1).replace(/.$/, "x"))).toBe(false);
  });
});
