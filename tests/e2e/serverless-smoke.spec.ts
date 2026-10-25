import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke test for a deployed instance. On Cloudflare (project containers
 * available) it runs a preview and deploys/rolls back a Codexa-hosted site;
 * on a host without a runtime it checks that previews and deploys say so
 * plainly. Run against any deployment:
 *   E2E_NO_SERVER=1 E2E_BASE_URL=https://<app> E2E_D1=remote npx playwright test tests/e2e/serverless-smoke.spec.ts --project=desktop
 * E2E_D1 (local | remote) selects which D1 database `npm run user:admin` updates
 * to mark the new test user as verified and admin (needed without an email provider).
 */

const d1Target = process.env.E2E_D1 === "remote" ? "remote" : process.env.E2E_D1 === "local" ? "local" : null;
const email = `smoke-${Date.now().toString(36)}@example.com`;

function userAdmin(command: "verify" | "make-admin") {
  execFileSync("npx", ["tsx", "scripts/user-admin.ts", command, email, ...(d1Target === "remote" ? ["--remote"] : [])], { stdio: "pipe" });
}

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe.configure({ mode: "serial" });

test("public pages, docs and API reference render from the deployed bundle", async ({ page }) => {
  for (const path of ["/", "/pricing", "/docs/ai-agent", "/blog", "/changelog", "/templates", "/integrations", "/status"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
  }
  await page.goto("/docs/ai-agent");
  await expect(page.locator("main")).toContainText(/repair/i);
  await page.goto("/api/reference");
  await expect(page.getByText("Implemented").first()).toBeVisible();
  await page.goto("/status");
  await expect(page.locator("main")).toContainText(/Operational|Not configured/);
});

test("sign up, create a project, edit in Monaco, snapshot, and see honest states", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await collectErrors(page);

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Smoke Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/onboarding/);

  const ws = await (await page.request.get("/api/v1/workspaces")).json();
  const workspaceId = ws.workspaces[0].workspace.id as string;
  const created = await page.request.post("/api/v1/projects", { data: { workspaceId, name: "Smoke app", templateId: "vite-react-starter" } });
  expect(created.status()).toBe(201);
  const { project } = await created.json();

  await page.goto(`/projects/${project.id}`);
  await expect(page.getByTestId("workspace")).toBeVisible();
  await page.getByTestId("file-explorer").getByText("App.tsx").click();
  const editor = page.locator(".monaco-editor").first();
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await editor.click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.type("// smoke edit\n");
  await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 20_000 });

  const file = await (await page.request.get(`/api/v1/projects/${project.id}/files/content?path=src%2FApp.tsx`)).json();
  expect(file.content).toContain("// smoke edit");

  const snap = await page.request.post(`/api/v1/projects/${project.id}/snapshots`, { data: { name: "Smoke checkpoint" } });
  expect(snap.status()).toBe(201);

  const runtime = await (await page.request.get(`/api/v1/projects/${project.id}/runtime`)).json();
  if (runtime.runnerConfigured) {
    // Cloudflare: the project's container starts and serves the Vite dev server.
    expect(runtime.runnerAvailable).toBe(true);
    const start = await page.request.post(`/api/v1/projects/${project.id}/runtime/start`, { timeout: 180_000 });
    expect(start.status(), await start.text()).toBeLessThan(300);
    let session: { status: string; previewUrl: string | null } | null = null;
    await expect
      .poll(
        async () => {
          session = (await (await page.request.get(`/api/v1/projects/${project.id}/runtime`)).json()).session;
          return session?.status;
        },
        { timeout: 150_000, intervals: [2000] },
      )
      .toBe("running");
    const preview = await page.context().newPage();
    const res = await preview.goto(session!.previewUrl!);
    expect(res?.status()).toBe(200);
    await expect(preview.locator("#root")).not.toBeEmpty({ timeout: 30_000 });
    await preview.close();
    const stop = await page.request.post(`/api/v1/projects/${project.id}/runtime/stop`);
    expect(stop.status()).toBe(200);
  } else {
    // No runtime on this host: the preview says so plainly.
    expect(runtime.runnerAvailable).toBe(false);
    await expect(page.getByText("Previews are not available on this deployment")).toBeVisible();
  }

  // AI status is honest when no provider key is set.
  const ai = await (await page.request.get(`/api/v1/projects/${project.id}/ai/status`)).json();
  expect(typeof ai.configured).toBe("boolean");

  expect(errors, errors.join("\n")).toEqual([]);
});

test("verified users reach settings and admin; Codexa hosting deploys and rolls back (or explains why not)", async ({ page }) => {
  test.skip(!d1Target, "E2E_D1 not set");
  test.setTimeout(900_000);
  userAdmin("verify");
  userAdmin("make-admin");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard|\/onboarding/);

  for (const path of ["/dashboard", "/projects", "/settings/billing", "/settings/members", "/admin"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
  await page.goto("/settings/billing");
  await expect(page.locator("main")).toContainText(/not configured/i);

  const ws = await (await page.request.get("/api/v1/workspaces")).json();
  const projects = await (await page.request.get(`/api/v1/projects?workspaceId=${ws.workspaces[0].workspace.id}`)).json();
  const id = projects.projects[0].id as string;
  const runtime = await (await page.request.get(`/api/v1/projects/${id}/runtime`)).json();
  if (!runtime.runnerConfigured) {
    const dep = await page.request.post(`/api/v1/projects/${id}/deployments`, { data: { provider: "codexa" } });
    expect(dep.status()).toBeGreaterThanOrEqual(400);
    expect((await dep.json()).error.message).toMatch(/runner|not configured/i);
    return;
  }

  // Two deployments with different content, then roll back to the first.
  type Dep = { id: string; status: string; url: string | null; buildLog?: string };
  const deploy = async (version: string): Promise<Dep> => {
    const put = await page.request.put(`/api/v1/projects/${id}/files/content`, { data: { path: "public/version.txt", content: version } });
    expect(put.status()).toBe(200);
    const res = await page.request.post(`/api/v1/projects/${id}/deployments`, { data: { provider: "codexa", wait: true }, timeout: 600_000 });
    const { deployment } = (await res.json()) as { deployment: Dep };
    expect(deployment.status, deployment.buildLog).toBe("live");
    return deployment;
  };
  const servedVersion = async (url: string) => {
    const site = await page.context().newPage();
    const res = await site.goto(new URL("/version.txt", url).toString());
    const text = res?.status() === 200 ? (await res.text()).trim() : `HTTP ${res?.status()}`;
    await site.close();
    return text;
  };

  const first = await deploy("v1");
  expect(await servedVersion(first.url!)).toBe("v1");
  const second = await deploy("v2");
  await expect.poll(() => servedVersion(second.url!), { timeout: 30_000 }).toBe("v2");

  const rb = await page.request.post(`/api/v1/projects/${id}/deployments/${first.id}/rollback`);
  expect(rb.status()).toBe(200);
  expect((await rb.json()).deployment.status).toBe("live");
  // The Worker caches the live-deployment lookup for up to 15 seconds.
  await expect.poll(() => servedVersion(first.url!), { timeout: 40_000, intervals: [2000] }).toBe("v1");

  const spa = await page.context().newPage();
  const res = await spa.goto(new URL("/some/client/route", first.url!).toString());
  expect(res?.status()).toBe(200);
  await spa.close();
});
