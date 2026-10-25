/**
 * Startup reaper for sandboxes left behind by a crashed runner, exercised
 * against a fake cgroup root (a plain directory) so it never touches the live
 * runner's cgroups. On real cgroupfs rmdir also removes the control files.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let root: string;
let child: ChildProcess;
let exited: Promise<void>;
let cgroup: typeof import("../../../services/runner/lib/cgroup");

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "codexa-fake-cgroup-"));
  process.env.RUNNER_CGROUP_ROOT = root;
  cgroup = await import("../../../services/runner/lib/cgroup");
  child = spawn("sleep", ["300"], { stdio: "ignore" });
  exited = new Promise((res) => child.once("exit", () => res()));
  for (const ctrl of ["memory", "pids"]) {
    const dir = path.join(root, ctrl, "codexa", "sorphan0001");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "cgroup.procs"), `${child.pid}\n`);
  }
});

afterAll(() => {
  try {
    child.kill("SIGKILL");
  } catch {
    /* already reaped */
  }
  fs.rmSync(root, { recursive: true, force: true });
});

describe("reapOrphanCgroups", () => {
  it("kills every pid listed in leftover codexa/* cgroups", async () => {
    const alive = () => {
      try {
        process.kill(child.pid!, 0);
        return true;
      } catch {
        return false;
      }
    };
    expect(alive()).toBe(true);
    const r = await cgroup.reapOrphanCgroups();
    expect(r.pids).toBe(2); // listed once per controller
    await exited;
    expect(alive()).toBe(false);
    expect(r.cgroups).toBeGreaterThanOrEqual(0);
  });

  it("is a no-op when the hierarchy is missing", async () => {
    fs.rmSync(path.join(root, "memory"), { recursive: true, force: true });
    fs.rmSync(path.join(root, "pids"), { recursive: true, force: true });
    expect(await cgroup.reapOrphanCgroups()).toEqual({ cgroups: 0, pids: 0 });
  });
});
