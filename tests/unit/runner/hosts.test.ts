import { describe, expect, it } from "vitest";
import { routeHost, stripPort } from "../../../services/runner/lib/hosts";
import { contentTypeFor, isImmutableAsset } from "../../../services/runner/proxy";

describe("host routing", () => {
  const P = "preview.localhost";
  const D = "sites.localhost";

  it("routes preview tokens and site slugs, ignoring the port and case", () => {
    expect(routeHost("abc123.preview.localhost:4100", P, D)).toEqual({ kind: "preview", token: "abc123" });
    expect(routeHost("ABC123.Preview.Localhost", P, D)).toEqual({ kind: "preview", token: "abc123" });
    expect(routeHost("my-site.sites.localhost:4100", P, D)).toEqual({ kind: "site", slug: "my-site" });
  });

  it("rejects everything else with an unknown route", () => {
    expect(routeHost(undefined, P, D).kind).toBe("unknown");
    expect(routeHost("", P, D).kind).toBe("unknown");
    expect(routeHost("preview.localhost", P, D).kind).toBe("unknown"); // bare host
    expect(routeHost("a.b.preview.localhost", P, D).kind).toBe("unknown"); // nested label
    expect(routeHost("-bad.preview.localhost", P, D).kind).toBe("unknown"); // invalid label
    expect(routeHost("bad-.preview.localhost", P, D).kind).toBe("unknown");
    expect(routeHost("evilpreview.localhost", P, D).kind).toBe("unknown"); // missing dot
    expect(routeHost("x.preview.localhost.evil.com", P, D).kind).toBe("unknown");
    expect(routeHost("[::1]:4100", P, D).kind).toBe("unknown");
    expect(routeHost("a_b.sites.localhost", P, D).kind).toBe("unknown");
  });

  it("works with real public hosts", () => {
    expect(routeHost("tok.preview.codexa.app", "preview.codexa.app", "codexa.site")).toEqual({ kind: "preview", token: "tok" });
    expect(routeHost("acme-shop.codexa.site", "preview.codexa.app", "codexa.site")).toEqual({ kind: "site", slug: "acme-shop" });
  });

  it("stripPort", () => {
    expect(stripPort("Host:1234")).toBe("host");
    expect(stripPort("[::1]:1")).toBe("[::1]:1");
  });
});

describe("static site headers", () => {
  it("detects content-hashed assets for immutable caching", () => {
    expect(isImmutableAsset("/assets/index-7rrAqaCh.js")).toBe(true);
    expect(isImmutableAsset("/assets/index-BxT4Q2p9.css")).toBe(true);
    expect(isImmutableAsset("/static/app.3f9a8c2b1d.js")).toBe(true);
    expect(isImmutableAsset("/index.html")).toBe(false);
    expect(isImmutableAsset("/assets/logo.svg")).toBe(false);
    expect(isImmutableAsset("/")).toBe(false);
  });

  it("maps extensions to content types with a safe default", () => {
    expect(contentTypeFor("a/index.html")).toBe("text/html; charset=utf-8");
    expect(contentTypeFor("x.JS")).toBe("text/javascript; charset=utf-8");
    expect(contentTypeFor("f.woff2")).toBe("font/woff2");
    expect(contentTypeFor("weird.bin")).toBe("application/octet-stream");
  });
});
