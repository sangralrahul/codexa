import { describe, expect, it } from "vitest";
import { colorForUser, issueRealtimeToken, REALTIME_TOKEN_TTL_MS, signPayload, verifyRealtimeToken } from "@/lib/integrations/realtime-token";
import { sign } from "@/lib/crypto";

const SECRET = "unit-test-session-secret-0123456789";

describe("realtime tokens", () => {
  it("round-trips a signed payload", () => {
    const now = 1_700_000_000_000;
    const token = issueRealtimeToken({ projectId: "p1", userId: "u1", name: "Ada", color: "#000" }, SECRET, now);
    const [encoded, sig] = token.split(".");
    expect(JSON.parse(Buffer.from(encoded, "base64url").toString())).toEqual({ projectId: "p1", userId: "u1", name: "Ada", color: "#000", exp: now + REALTIME_TOKEN_TTL_MS });
    expect(sig).toBe(signPayload(encoded, SECRET));
    expect(verifyRealtimeToken(token, SECRET, now + 1000)).toMatchObject({ projectId: "p1", userId: "u1" });
  });
  it("signs the same way as src/lib/crypto sign() with SESSION_SECRET", () => {
    const prev = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = SECRET;
    try {
      expect(signPayload("abc", SECRET)).toBe(sign("abc"));
    } finally {
      process.env.SESSION_SECRET = prev;
    }
  });
  it("rejects expired, tampered and wrong-secret tokens", () => {
    const now = 1_700_000_000_000;
    const token = issueRealtimeToken({ projectId: "p1", userId: "u1", name: "Ada", color: "#000" }, SECRET, now);
    expect(verifyRealtimeToken(token, SECRET, now + REALTIME_TOKEN_TTL_MS + 1)).toBeNull();
    expect(verifyRealtimeToken(token, "another-secret-that-is-long-enough", now)).toBeNull();
    const [encoded, sig] = token.split(".");
    const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(encoded, "base64url").toString()), projectId: "p2" })).toString("base64url");
    expect(verifyRealtimeToken(`${tampered}.${sig}`, SECRET, now)).toBeNull();
    expect(verifyRealtimeToken("garbage", SECRET, now)).toBeNull();
    expect(verifyRealtimeToken("", SECRET, now)).toBeNull();
  });
  it("gives users a stable colour", () => {
    expect(colorForUser("user-a")).toBe(colorForUser("user-a"));
    expect(colorForUser("user-a")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
