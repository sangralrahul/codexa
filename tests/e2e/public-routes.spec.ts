import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "../../src/config/routes";

/**
 * Every indexable public route must respond 200 with a title, a meta
 * description and exactly one h1. Data-driven from PUBLIC_ROUTES so new
 * routes are covered automatically. Routes owned by teams that have not
 * shipped yet will fail here until their pages exist.
 */
const routes = PUBLIC_ROUTES.filter((r) => !r.noindex);

for (const route of routes) {
  test(`${route.path} renders with title, description and one h1`, async ({ page }) => {
    const res = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(res, `no response for ${route.path}`).not.toBeNull();
    expect(res!.status(), `${route.path} status`).toBe(200);
    await expect(page).toHaveTitle(/.+/);
    const description = page.locator('head meta[name="description"]');
    await expect(description).toHaveAttribute("content", /.+/);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}
