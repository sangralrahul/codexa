import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * The initial end-to-end milestone:
 * Sign up → create project → generate (mock AI) → edit → run preview → fix/revert → save → deploy.
 * Requires: dev server on :3000 with AI_MOCK=1, the runner service (npm run runner:dev).
 */

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function apiJson<T>(request: APIRequestContext, method: "get" | "post" | "put", url: string, data?: unknown): Promise<T> {
  const res = await request[method](url, data !== undefined ? { data } : undefined);
  expect(res.ok(), `${method.toUpperCase()} ${url} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as T;
}

async function signUp(page: Page) {
  const email = `journey-${unique()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Journey User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/onboarding|\/dashboard/);
  return email;
}

test.describe.configure({ mode: "serial" });

test("sign up, create, generate, edit, preview, deploy", async ({ page, request, context }) => {
  test.setTimeout(240_000);
  await signUp(page);

  // Share the browser session with the API client.
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "codexa_session");
  expect(session).toBeTruthy();
  const api = await page.request.storageState().then(() => page.request);

  const { workspaces } = await apiJson<{ workspaces: { workspace: { id: string } }[] }>(api, "get", "/api/v1/workspaces");
  const workspaceId = workspaces[0].workspace.id;

  const { project } = await apiJson<{ project: { id: string; slug: string } }>(api, "post", "/api/v1/projects", {
    workspaceId,
    name: "Journey app",
    templateId: "vite-react-starter",
  });

  // Workspace opens with the template files.
  await page.goto(`/projects/${project.id}`);
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("file-explorer")).toContainText("App.tsx");

  // AI generation (mock provider) must change real files and snapshot first.
  const status = await apiJson<{ configured: boolean; mock: boolean }>(api, "get", `/api/v1/projects/${project.id}/ai/status`);
  expect(status.configured, "AI_MOCK=1 must be set on the dev server for this test").toBeTruthy();
  const gen = await api.post(`/api/v1/projects/${project.id}/ai/generate`, { data: { prompt: "Add a counter feature", mode: "build" } });
  expect(gen.status()).toBe(200);
  const body = await gen.text();
  expect(body).toContain("event: done");
  expect(body).toMatch(/"status":"succeeded"/);
  const feature = await apiJson<{ content: string }>(api, "get", `/api/v1/projects/${project.id}/files/content?path=${encodeURIComponent("src/components/Feature.tsx")}`);
  expect(feature.content.length).toBeGreaterThan(0);
  const snaps = await apiJson<{ snapshots: { id: string; kind: string }[] }>(api, "get", `/api/v1/projects/${project.id}/snapshots`);
  expect(snaps.snapshots.some((s) => s.kind === "ai")).toBeTruthy();

  // Edit a file and confirm it persisted.
  const app = await apiJson<{ content: string }>(api, "get", `/api/v1/projects/${project.id}/files/content?path=src%2FApp.tsx`);
  const edited = app.content.replace("export default function App", "// edited by journey test\nexport default function App");
  await apiJson(api, "put", `/api/v1/projects/${project.id}/files/content`, { path: "src/App.tsx", content: edited });
  const again = await apiJson<{ content: string }>(api, "get", `/api/v1/projects/${project.id}/files/content?path=src%2FApp.tsx`);
  expect(again.content).toContain("edited by journey test");

  // Run the preview from the UI and see the real application output.
  await page.reload();
  await page.getByRole("button", { name: "Run preview" }).click();
  const frame = page.locator('iframe[src*="preview.localhost"]');
  await expect(frame).toBeVisible({ timeout: 90_000 });
  const previewUrl = await frame.getAttribute("src");
  expect(previewUrl).toMatch(/^http:\/\/[a-z0-9-]+\.preview\.localhost:4100/);
  const previewPage = await context.newPage();
  await previewPage.goto(previewUrl!);
  await expect(previewPage.locator("body")).toContainText(/Codexa|Counter|Hello/i, { timeout: 60_000 });
  await previewPage.close();

  // Revert the AI run via its snapshot (fix/undo path) and restore the edit.
  const aiSnap = snaps.snapshots.find((s) => s.kind === "ai")!;
  await apiJson(api, "post", `/api/v1/projects/${project.id}/snapshots/${aiSnap.id}/restore`);
  const afterRestore = await api.get(`/api/v1/projects/${project.id}/files/content?path=${encodeURIComponent("src/components/Feature.tsx")}`);
  expect(afterRestore.status()).toBe(404);

  // Publishing requires a verified email: pick the verification link from the dev outbox.
  const mailbox = await page.goto("/dev/mailbox");
  expect(mailbox?.status()).toBe(200);
  const verifyHref = await page.locator('a[href*="/verify-email?token="]').first().getAttribute("href");
  expect(verifyHref, "verification email in outbox").toBeTruthy();
  const token = new URL(verifyHref!, "http://localhost:3000").searchParams.get("token")!;
  await apiJson(api, "post", "/api/auth/verify-email", { token });

  // Deploy to Codexa hosting and load the live site in the browser.
  const dep = await apiJson<{ deployment: { id: string; status: string; url: string | null } }>(api, "post", `/api/v1/projects/${project.id}/deployments`, { provider: "codexa", wait: true });
  expect(dep.deployment.status).toBe("live");
  expect(dep.deployment.url).toMatch(/sites\.localhost:4100/);
  const live = await context.newPage();
  const res = await live.goto(dep.deployment.url!);
  expect(res?.status()).toBe(200);
  await expect(live.locator("#root")).toBeAttached();
  await live.close();

  // Stop the runtime to free resources.
  await api.post(`/api/v1/projects/${project.id}/runtime/stop`);
});
