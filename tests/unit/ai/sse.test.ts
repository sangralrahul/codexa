import { describe, expect, it } from "vitest";
import { encodeSseComment, encodeSseEvent, SseParser } from "@/lib/ai/sse";

describe("SSE encoder", () => {
  it("formats events as event/data blocks", () => {
    expect(encodeSseEvent("stage", { stage: "planning" })).toBe('event: stage\ndata: {"stage":"planning"}\n\n');
    expect(encodeSseEvent("done", null)).toBe("event: done\ndata: null\n\n");
  });

  it("never emits raw newlines inside data (multi-line strings are escaped)", () => {
    const out = encodeSseEvent("text", { delta: "line1\nline2" });
    expect(out.split("\n").length).toBe(4); // event, data, blank, trailing
    expect(JSON.parse(out.split("\n")[1].slice("data: ".length))).toEqual({ delta: "line1\nline2" });
  });

  it("formats keep-alive comments", () => {
    expect(encodeSseComment()).toBe(": keep-alive\n\n");
  });
});

describe("SSE parser", () => {
  it("round-trips encoded events across arbitrary chunk boundaries", () => {
    const stream = [encodeSseEvent("run", { runId: "r1" }), encodeSseComment(), encodeSseEvent("text", { delta: "héllo\nwörld" }), encodeSseEvent("done", { status: "succeeded" })].join("");
    for (const size of [1, 3, 7, 50, 1000]) {
      const parser = new SseParser();
      const events: { event: string; data: string }[] = [];
      for (let i = 0; i < stream.length; i += size) events.push(...parser.push(stream.slice(i, i + size)));
      events.push(...parser.end());
      expect(events.map((e) => e.event), `chunk size ${size}`).toEqual(["run", "text", "done"]);
      expect(JSON.parse(events[1].data)).toEqual({ delta: "héllo\nwörld" });
    }
  });

  it("ignores comments and handles CRLF", () => {
    const parser = new SseParser();
    const events = parser.push(": ping\r\n\r\nevent: stage\r\ndata: {\"a\":1}\r\n\r\n");
    expect(events).toEqual([{ event: "stage", data: '{"a":1}' }]);
  });

  it("joins multi-line data fields and defaults the event name to message", () => {
    const parser = new SseParser();
    expect(parser.push("data: a\ndata: b\n\n")).toEqual([{ event: "message", data: "a\nb" }]);
  });

  it("flushes a trailing block on end()", () => {
    const parser = new SseParser();
    expect(parser.push("event: done\ndata: {}")).toEqual([]);
    expect(parser.end()).toEqual([{ event: "done", data: "{}" }]);
    expect(parser.end()).toEqual([]);
  });
});
