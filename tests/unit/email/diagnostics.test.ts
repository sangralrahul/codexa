import { describe, expect, it } from "vitest";
import { explainEmailError } from "@/lib/email/diagnostics";

describe("explainEmailError", () => {
  it("points at the key type and region for auth failures", () => {
    expect(explainEmailError("Unauthorized")).toMatch(/App API key/);
    expect(explainEmailError("Customer.io error 401")).toMatch(/CUSTOMERIO_REGION/);
  });
  it("points at sending-domain verification for sender errors", () => {
    expect(explainEmailError("from address domain is not verified")).toMatch(/Sending domains/);
  });
  it("returns null for nothing or unknown errors", () => {
    expect(explainEmailError(null)).toBeNull();
    expect(explainEmailError("something odd")).toBeNull();
  });
});
