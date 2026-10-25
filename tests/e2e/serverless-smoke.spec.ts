import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke test for a serverless deployment (e.g. Vercel) where the runner and
 * realtime services are not configured. Run against any deployment:
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
  await expect(page.locator("main")).toContainText(/not configured/i);
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

  // Runner is not configured on serverless hosts: the preview says so plainly.
  const runtime = await (await page.request.get(`/api/v1/projects/${project.id}/runtime`)).json();
  expect(runtime.runnerAvailable).toBe(false);
  expect(runtime.runnerConfigured).toBe(false);
  await expect(page.getByText("Previews are not available on this deployment")).toBeVisible();

  // AI status is honest when no provider key is set.
  const ai = await (await page.request.get(`/api/v1/projects/${project.id}/ai/status`)).json();
  expect(typeof ai.configured).toBe("boolean");

  expect(errors, errors.join("\n")).toEqual([]);
});

test("verified users reach settings and admin; deployments explain the missing runner", async ({ page }) => {
  test.skip(!d1Target, "E2E_D1 not set");
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
  const dep = await page.request.post(`/api/v1/projects/${id}/deployments`, { data: { provider: "codexa" } });
  expect(dep.status()).toBeGreaterThanOrEqual(400);
  expect((await dep.json()).error.message).toMatch(/runner|not configured/i);
});
