/**
 * E2B driver boundary. E2B provides hosted Firecracker micro-VMs; wiring it
 * up requires the E2B SDK and an API key. This module exists so the driver
 * selection is explicit and the failure mode is a clear message rather than
 * a half-working sandbox.
 */
import type { SandboxDriver, SandboxSpec, SpawnOptions, ExecOptions } from "./types";

export class E2bDriver implements SandboxDriver {
  readonly name = "e2b" as const;
  constructor(private readonly apiKey: string | undefined) {}

  async init() {
    if (!this.apiKey) throw new Error("RUNNER_SANDBOX_DRIVER=e2b requires E2B_API_KEY");
    throw new Error("The E2B driver is an integration boundary only: install the e2b SDK and implement spawn/exec/destroy before enabling it");
  }
  describe() {
    return { driver: "e2b", configured: Boolean(this.apiKey), implemented: false };
  }
  async prepare(_spec: SandboxSpec) {
    throw new Error("E2B driver not implemented");
  }
  async spawn(_spec: SandboxSpec, _opts: SpawnOptions): Promise<never> {
    throw new Error("E2B driver not implemented");
  }
  async exec(_spec: SandboxSpec, _opts: ExecOptions): Promise<never> {
    throw new Error("E2B driver not implemented");
  }
  async destroy(_spec: SandboxSpec) {
    /* nothing to release */
  }
}
