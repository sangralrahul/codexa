import fs from "node:fs";
import path from "node:path";

/**
 * cgroup v1 helpers (the machines we target expose /sys/fs/cgroup/{memory,pids}).
 * When the hierarchy is missing or read-only the runner keeps working without
 * hard limits and reports that in /health. Production hardening: cgroup v2
 * with a delegated per-tenant subtree (see docs/RUNTIME.md).
 */
export type CgroupSet = { memory: string | null; pids: string | null; available: boolean };

const ROOT = process.env.RUNNER_CGROUP_ROOT || "/sys/fs/cgroup";
const PARENT = "codexa";

function tryWrite(file: string, value: string): boolean {
  try {
    fs.writeFileSync(file, value);
    return true;
  } catch {
    return false;
  }
}

export function cgroupsAvailable(): { memory: boolean; pids: boolean } {
  const check = (ctrl: string) => {
    try {
      fs.mkdirSync(path.join(ROOT, ctrl, PARENT), { recursive: true });
      return fs.existsSync(path.join(ROOT, ctrl, PARENT, "cgroup.procs"));
    } catch {
      return false;
    }
  };
  return { memory: check("memory"), pids: check("pids") };
}

export function createCgroup(id: string, limits: { memoryBytes: number; pidsMax: number }): CgroupSet {
  const avail = cgroupsAvailable();
  const out: CgroupSet = { memory: null, pids: null, available: false };
  if (avail.memory) {
    const dir = path.join(ROOT, "memory", PARENT, id);
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (tryWrite(path.join(dir, "memory.limit_in_bytes"), String(limits.memoryBytes))) {
        // Also cap swap so the limit is real on hosts with swap enabled.
        tryWrite(path.join(dir, "memory.memsw.limit_in_bytes"), String(limits.memoryBytes));
        out.memory = dir;
      }
    } catch {
      /* unavailable */
    }
  }
  if (avail.pids) {
    const dir = path.join(ROOT, "pids", PARENT, id);
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (tryWrite(path.join(dir, "pids.max"), String(limits.pidsMax))) out.pids = dir;
    } catch {
      /* unavailable */
    }
  }
  out.available = Boolean(out.memory || out.pids);
  return out;
}

function readPids(dir: string): number[] {
  try {
    return fs
      .readFileSync(path.join(dir, "cgroup.procs"), "utf8")
      .split("\n")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 1);
  } catch {
    return [];
  }
}

/** SIGKILL every process still in the cgroup, wait for them to vanish, then remove it. */
export async function destroyCgroup(cg: CgroupSet): Promise<void> {
  for (const dir of [cg.memory, cg.pids]) {
    if (!dir) continue;
    for (let i = 0; i < 40; i++) {
      const pids = readPids(dir);
      if (!pids.length) break;
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          /* gone */
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    try {
      fs.rmdirSync(dir);
    } catch {
      /* may still be populated for a moment; the sweeper retries on next start */
    }
  }
}

export function cgroupPids(cg: CgroupSet): number[] {
  return cg.pids ? readPids(cg.pids) : cg.memory ? readPids(cg.memory) : [];
}

/**
 * Kill and remove every per-sandbox cgroup left behind by a previous runner
 * process that did not shut down cleanly (crash, SIGKILL). Called once at
 * startup by the real service entry point; in-process test runners must not
 * call it because they share the cgroup root with the live runner.
 */
export async function reapOrphanCgroups(): Promise<{ cgroups: number; pids: number }> {
  let cgroups = 0;
  let pids = 0;
  for (const ctrl of ["memory", "pids"]) {
    const parent = path.join(ROOT, ctrl, PARENT);
    let names: string[] = [];
    try {
      names = fs.readdirSync(parent, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      continue;
    }
    for (const name of names) {
      const dir = path.join(parent, name);
      pids += readPids(dir).length;
      await destroyCgroup({ memory: ctrl === "memory" ? dir : null, pids: ctrl === "pids" ? dir : null, available: true });
      if (!fs.existsSync(dir)) cgroups++;
    }
  }
  return { cgroups, pids };
}
