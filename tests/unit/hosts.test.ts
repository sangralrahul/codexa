import { describe, expect, it } from "vitest";
import { hostBase, hostFor, labelFor } from "@/lib/hosts";

describe("preview and site addresses", () => {
  it("attaches labels as a subdomain by default", () => {
    expect(hostFor("abc123", "preview.example.com")).toBe("abc123.preview.example.com");
    expect(labelFor("abc123.preview.example.com", "preview.example.com")).toBe("abc123");
  });

  it("attaches labels directly when the base starts with a dash (one level, free certificate)", () => {
    expect(hostFor("abc123", "-preview.example.com")).toBe("abc123-preview.example.com");
    expect(hostFor("my-app", "-sites.example.com:8787")).toBe("my-app-sites.example.com:8787");
    expect(labelFor("abc123-preview.example.com", "-preview.example.com")).toBe("abc123");
    expect(labelFor("my-app-sites.example.com", "-sites.example.com")).toBe("my-app");
  });

  it("rejects hosts that are not exactly one label under the base", () => {
    expect(labelFor("codexa.example.com", "-preview.example.com")).toBeNull();
    expect(labelFor("a.b-preview.example.com", "-preview.example.com")).toBeNull();
    expect(labelFor("-preview.example.com", "-preview.example.com")).toBeNull();
    expect(labelFor("x.y.preview.example.com", "preview.example.com")).toBeNull();
    expect(labelFor("abc.preview.example.com", null)).toBeNull();
  });

  it("normalizes configured bases", () => {
    expect(hostBase("https://Preview.Example.com:8787/")).toBe("preview.example.com");
    expect(hostBase("-preview.example.com")).toBe("-preview.example.com");
    expect(hostBase("")).toBeNull();
  });
});
