import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { linkBaseNodeModules } from "../../../services/runner/lib/files";

let tmp: string;
afterEach(async () => {
  if (tmp) await fs.rm(tmp, { recursive: true, force: true });
});

describe("linkBaseNodeModules", () => {
  it("links each package but never the lockfile or tool caches left in the base", async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "codexa-link-"));
    const baseNm = path.join(tmp, "base", "vite-react", "node_modules");
    for (const d of ["react", "vite", ".bin", ".vite", ".vite-temp", ".cache"]) await fs.mkdir(path.join(baseNm, d), { recursive: true });
    await fs.writeFile(path.join(baseNm, ".package-lock.json"), "{}");
    const project = path.join(tmp, "project");
    await fs.mkdir(project);

    const owner = { uid: process.getuid?.() ?? 0, gid: process.getgid?.() ?? 0 };
    expect(await linkBaseNodeModules(project, path.join(tmp, "base"), "vite-react", owner)).toBe(true);

    const nm = path.join(project, "node_modules");
    const names = (await fs.readdir(nm)).sort();
    expect(names).toEqual([".bin", ".codexa-linked", "react", "vite"]);
    expect(await fs.readlink(path.join(nm, "vite"))).toBe("/work/base/vite-react/node_modules/vite");
    // node_modules itself is a real, writable directory, so Vite can create .vite-temp there.
    expect((await fs.lstat(nm)).isDirectory()).toBe(true);
  });

  it("reports false when the framework has no prebuilt set", async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "codexa-link-"));
    expect(await linkBaseNodeModules(path.join(tmp, "p"), path.join(tmp, "base"), "vite-react", { uid: 0, gid: 0 })).toBe(false);
  });
});
