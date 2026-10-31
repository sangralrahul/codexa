import { describe, expect, it } from "vitest";
import { weekDelta } from "@/components/projects/sparkline";
import { railTimings } from "@/components/ai/message-parts";

describe("weekDelta", () => {
  it("sums the last seven points against the seven before them", () => {
    const values = [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2];
    expect(weekDelta(values)).toEqual({ thisWeek: 14, lastWeek: 7, delta: 7 });
  });
  it("treats a short series as having no previous week", () => {
    expect(weekDelta([3, 4])).toEqual({ thisWeek: 7, lastWeek: 0, delta: 7 });
    expect(weekDelta([])).toEqual({ thisWeek: 0, lastWeek: 0, delta: 0 });
  });
});

describe("railTimings", () => {
  it("returns null without timed stages", () => {
    expect(railTimings(undefined, null, false, 0)).toBeNull();
    expect(railTimings({ queued: 1 }, null, false, 0)).toBeNull();
  });
  it("measures each segment until the next one starts, the last until the run finished", () => {
    const t = { loading_context: 1000, planning: 1500, working: 2500, validating: 6000, done: 6400 };
    expect(railTimings(t, 6400, false, 9999)).toEqual([500, 1000, 3500, 400, null, 0]);
  });
  it("keeps the active segment running against the clock", () => {
    const t = { loading_context: 1000, working: 2000 };
    expect(railTimings(t, null, true, 5000)).toEqual([1000, null, 3000, null, null, null]);
  });
});
