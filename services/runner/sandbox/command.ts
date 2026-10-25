/**
 * Pure builders for the command lines the local driver executes. Kept free
 * of side effects so the privilege-dropping chain can be unit tested.
 *
 * Chain (outermost first):
 *   sh -c  'echo $$ > <cgroup>/cgroup.procs (memory + pids) ;
 *           exec prlimit --cpu --fsize --nofile --
 *           setpriv --reuid=UID --regid=GID --clear-groups --inh-caps=-all --no-new-privs --
 *           unshare -rmp --fork --kill-child --mount-proc --
 *           sh /<bin>/sandbox-init.sh sh -c <command>'
 *
 * sandbox-init.sh (running as the mapped root of a fresh user namespace)
 * builds a minimal root from read-only binds, pivot_roots into it, drops the
 * mapping back to UID with a nested user namespace and execs the command.
 * The network namespace is intentionally NOT unshared: previews must be
 * reachable from the host proxy (see docs/RUNTIME.md).
 */
import { shellQuote } from "../lib/allowlist";
import type { SandboxLimits, SandboxSpec } from "./types";

export type CgroupPaths = { memory: string | null; pids: string | null };

export type LocalCommand = { file: string; args: string[]; script: string };

export function cgroupProcsLines(cg: CgroupPaths): string {
  const parts: string[] = [];
  for (const p of [cg.memory, cg.pids]) {
    if (p) parts.push(`echo $$ > ${shellQuote(p + "/cgroup.procs")} 2>/dev/null || true;`);
  }
  return parts.join(" ");
}

export function prlimitArgs(limits: Pick<SandboxLimits, "cpuSeconds" | "fsizeBytes" | "nofile">): string[] {
  return ["prlimit", `--cpu=${Math.max(1, Math.floor(limits.cpuSeconds))}`, `--fsize=${Math.max(1, Math.floor(limits.fsizeBytes))}`, `--nofile=${Math.max(64, Math.floor(limits.nofile))}`, "--"];
}

export function setprivArgs(uid: number, gid: number): string[] {
  return ["setpriv", `--reuid=${uid}`, `--regid=${gid}`, "--clear-groups", "--inh-caps=-all", "--no-new-privs", "--"];
}

/** User + mount + pid namespaces. No `-n`: the network namespace is shared on purpose. */
export function unshareArgs(): string[] {
  return ["unshare", "-r", "-m", "-p", "--fork", "--kill-child", "--mount-proc", "--"];
}

export function buildLocalCommand(input: { spec: SandboxSpec; initScript: string; command: string; cgroups: CgroupPaths }): LocalCommand {
  const { spec, initScript, command, cgroups } = input;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{3,63}$/.test(spec.id)) throw new Error("Unsafe sandbox id");
  if (!initScript.startsWith("/")) throw new Error("init script must be an absolute path");
  const chain = [...prlimitArgs(spec.limits), ...setprivArgs(spec.uid, spec.gid), ...unshareArgs(), "sh", initScript, "sh", "-c", command];
  const script = `${cgroupProcsLines(cgroups)} exec ${chain.map(shellQuote).join(" ")}`;
  return { file: "sh", args: ["-c", script], script };
}

/**
 * The init script executed inside the fresh namespaces. Receives the host
 * paths to bind through environment variables set by the driver.
 */
export const SANDBOX_INIT_SCRIPT = `#!/bin/sh
# Codexa sandbox init. Runs as the mapped root of an unprivileged user namespace.
set -e
R=/mnt
: "\${CODEXA_PROJECT_DIR:?}" "\${CODEXA_BASE_DIR:?}" "\${CODEXA_BIN_DIR:?}" "\${CODEXA_NODE_DIR:?}"
mount -t tmpfs -o mode=0755 tmpfs "$R"
mkdir -p "$R/usr" "$R/lib" "$R/lib64" "$R/bin" "$R/sbin" "$R/etc" "$R/tmp" "$R/dev" "$R/proc" "$R/work/project" "$R/work/base" "$R/work/bin" "$R/oldroot"
mkdir -p "$R$CODEXA_NODE_DIR"
for d in usr lib lib64 bin sbin etc; do
  if [ -d "/$d" ]; then mount --rbind "/$d" "$R/$d" && mount -o remount,bind,ro "$R/$d"; fi
done
mount --rbind "$CODEXA_NODE_DIR" "$R$CODEXA_NODE_DIR" && mount -o remount,bind,ro "$R$CODEXA_NODE_DIR"
mount --bind "$CODEXA_BASE_DIR" "$R/work/base" && mount -o remount,bind,ro "$R/work/base"
mount --bind "$CODEXA_BIN_DIR" "$R/work/bin" && mount -o remount,bind,ro "$R/work/bin"
mount --bind "$CODEXA_PROJECT_DIR" "$R/work/project"
mount -t tmpfs -o mode=1777 tmpfs "$R/tmp"
mount -t tmpfs -o mode=0755 tmpfs "$R/dev"
for f in null zero urandom random tty; do : > "$R/dev/$f"; mount --bind "/dev/$f" "$R/dev/$f"; done
mkdir -p "$R/dev/shm" && mount -t tmpfs -o mode=1777 tmpfs "$R/dev/shm"
cd "$R"
pivot_root . oldroot
cd /
mount -t proc proc /proc
umount -l /oldroot
rmdir /oldroot 2>/dev/null || true
unset CODEXA_PROJECT_DIR CODEXA_BASE_DIR CODEXA_BIN_DIR
export HOME=/tmp TMPDIR=/tmp
export PATH="/work/project/node_modules/.bin:$CODEXA_NODE_DIR/bin:/usr/local/bin:/usr/bin:/bin"
unset CODEXA_NODE_DIR
U="\${CODEXA_SANDBOX_UID:-65534}"; G="\${CODEXA_SANDBOX_GID:-65534}"
unset CODEXA_SANDBOX_UID CODEXA_SANDBOX_GID
cd /work/project
# Drop back to the sandbox uid inside a nested user namespace so the command
# does not run as the (unprivileged) namespace root.
exec unshare -U "--map-user=$U" "--map-group=$G" -- "$@"
`;
