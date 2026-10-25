/**
 * The privilege-dropping chain the local driver executes and the docker
 * arguments must never contain privilege-escalating flags, and must always
 * drop to the sandbox uid with no-new-privs. These builders are pure.
 */
import { describe, expect, it } from "vitest";
import { buildLocalCommand, cgroupProcsLines, prlimitArgs, setprivArgs, unshareArgs, SANDBOX_INIT_SCRIPT } from "../../../services/runner/sandbox/command";
import { dockerRunArgs, containerName } from "../../../services/runner/sandbox/docker";
import { sanitizeEnv } from "../../../services/runner/sessions";
import type { SandboxSpec } from "../../../services/runner/sandbox/types";

const spec: SandboxSpec = {
  id: "s0123456789abcdef",
  dir: "/var/codexa/sandboxes/s0123456789abcdef",
  projectDir: "/var/codexa/sandboxes/s0123456789abcdef/project",
  baseDir: "/var/codexa/base",
  binDir: "/var/codexa/bin",
  uid: 65534,
  gid: 65534,
  limits: { memoryBytes: 1024 * 1024 * 1024, pidsMax: 256, cpuSeconds: 3600, fsizeBytes: 256 * 1024 * 1024, nofile: 4096 },
  ports: [20000],
};

describe("local sandbox command builder", () => {
  it("drops privileges and never escalates", () => {
    const cmd = buildLocalCommand({ spec, initScript: "/var/codexa/bin/sandbox-init.sh", command: "npm run dev", cgroups: { memory: null, pids: null } });
    expect(cmd.file).toBe("sh");
    expect(cmd.args[0]).toBe("-c");
    const s = cmd.script;
    expect(s).toContain("exec 'prlimit'");
    expect(s).toContain("'setpriv' '--reuid=65534' '--regid=65534' '--clear-groups' '--inh-caps=-all' '--no-new-privs'");
    expect(s).toContain("'unshare' '-r' '-m' '-p' '--fork' '--kill-child' '--mount-proc'");
    expect(s).not.toMatch(/--privileged|--ambient-caps|--bounding-set=\+|sudo|--reuid=0|--regid=0/);
    // The user command is the last argument, single-quoted, inside the init script invocation.
    expect(s.endsWith("'sh' '/var/codexa/bin/sandbox-init.sh' 'sh' '-c' 'npm run dev'")).toBe(true);
  });

  it("quotes hostile commands so they cannot break out of the sh -c argument", () => {
    const hostile = `echo hi'; rm -rf / #`;
    const cmd = buildLocalCommand({ spec, initScript: "/x/init.sh", command: hostile, cgroups: { memory: null, pids: null } });
    expect(cmd.script.endsWith(`'sh' '-c' 'echo hi'\\''; rm -rf / #'`)).toBe(true);
  });

  it("writes the shell pid into each cgroup before exec", () => {
    const lines = cgroupProcsLines({ memory: "/sys/fs/cgroup/memory/codexa/s1", pids: "/sys/fs/cgroup/pids/codexa/s1" });
    expect(lines).toContain("echo $$ > '/sys/fs/cgroup/memory/codexa/s1/cgroup.procs'");
    expect(lines).toContain("echo $$ > '/sys/fs/cgroup/pids/codexa/s1/cgroup.procs'");
    expect(cgroupProcsLines({ memory: null, pids: null })).toBe("");
  });

  it("rejects unsafe sandbox ids and relative init scripts", () => {
    expect(() => buildLocalCommand({ spec: { ...spec, id: "../etc" }, initScript: "/x", command: "true", cgroups: { memory: null, pids: null } })).toThrow(/Unsafe sandbox id/);
    expect(() => buildLocalCommand({ spec, initScript: "init.sh", command: "true", cgroups: { memory: null, pids: null } })).toThrow(/absolute/);
  });

  it("never unshares the network namespace (previews must be reachable from the host)", () => {
    expect(unshareArgs()).not.toContain("-n");
    expect(unshareArgs()).not.toContain("--net");
  });

  it("applies rlimits with sane floors", () => {
    expect(prlimitArgs({ cpuSeconds: 0, fsizeBytes: 0, nofile: 1 })).toEqual(["prlimit", "--cpu=1", "--fsize=1", "--nofile=64", "--"]);
    expect(setprivArgs(1000, 1000)).toContain("--no-new-privs");
  });

  it("init script pivots into a minimal read-only root and drops the uid mapping", () => {
    expect(SANDBOX_INIT_SCRIPT).toContain("pivot_root . oldroot");
    expect(SANDBOX_INIT_SCRIPT).toContain("remount,bind,ro");
    expect(SANDBOX_INIT_SCRIPT).toContain('exec unshare -U "--map-user=$U" "--map-group=$G"');
    expect(SANDBOX_INIT_SCRIPT).not.toContain("/home");
    expect(SANDBOX_INIT_SCRIPT).toContain("export HOME=/tmp");
  });
});

describe("docker run arguments", () => {
  const args = dockerRunArgs(spec, { image: "node:22-bookworm-slim", cpus: 2, command: "npm run dev", env: { FOO: "bar", "bad key": "x" }, detach: false });

  it("hardens the container and binds only loopback ports", () => {
    expect(args[0]).toBe("run");
    expect(args).toContain("--rm");
    expect(args).toContain("--cap-drop=ALL");
    expect(args).toContain("--security-opt=no-new-privileges");
    expect(args).toContain("--read-only");
    expect(args).toContain("--user=65534:65534");
    expect(args).toContain(`--memory=${spec.limits.memoryBytes}`);
    expect(args).toContain(`--pids-limit=${spec.limits.pidsMax}`);
    expect(args).toContain("--network=bridge");
    expect(args).not.toContain("--privileged");
    expect(args.join(" ")).not.toMatch(/--network=host|docker\.sock|--cap-add/);
    expect(args).toContain("-p");
    expect(args[args.indexOf("-p") + 1]).toBe("127.0.0.1:20000:20000");
  });

  it("mounts the base set and helpers read-only and the project read-write", () => {
    const mounts = args.filter((_a, i) => args[i - 1] === "-v");
    expect(mounts).toContain(`${spec.projectDir}:/work/project:rw`);
    expect(mounts).toContain(`${spec.baseDir}:/work/base:ro`);
    expect(mounts).toContain(`${spec.binDir}:/work/bin:ro`);
  });

  it("drops env keys that are not valid identifiers and ends with the command", () => {
    const envs = args.filter((_a, i) => args[i - 1] === "-e");
    expect(envs).toContain("FOO=bar");
    expect(envs.some((e) => e.startsWith("bad key"))).toBe(false);
    expect(args.slice(-3)).toEqual(["sh", "-c", "npm run dev"]);
    expect(containerName("abc")).toBe("codexa-sbx-abc");
  });
});

describe("sanitizeEnv", () => {
  it("keeps only POSIX keys with string values and blocks runner-controlled names", () => {
    const out = sanitizeEnv({ API_KEY: "x", PATH: "/evil", HOME: "/root", PORT: "1", LD_PRELOAD: "x.so", NODE_OPTIONS: "--require evil", CODEXA_PREVIEW_URL: "x", "1bad": "x", OBJ: { a: 1 }, LONG: "x".repeat(20_000) });
    expect(out).toEqual({ API_KEY: "x" });
    expect(sanitizeEnv(null)).toEqual({});
    expect(sanitizeEnv("nope")).toEqual({});
  });
});
