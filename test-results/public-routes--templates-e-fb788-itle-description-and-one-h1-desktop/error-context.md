# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-routes.spec.ts >> /templates/ecommerce renders with title, description and one h1
- Location: tests/e2e/public-routes.spec.ts:13:7

# Error details

```
Error: /templates/ecommerce status

expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 404
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "Codexa home" [ref=e6] [cursor=pointer]:
          - /url: /
          - generic [ref=e11]: Codexa
        - navigation "Main" [ref=e12]:
          - button "Product" [ref=e14]
          - button "Solutions" [ref=e18]
          - button "Resources" [ref=e22]
          - button "Company" [ref=e26]
          - link "Pricing" [ref=e29] [cursor=pointer]:
            - /url: /pricing
          - link "Docs" [ref=e30] [cursor=pointer]:
            - /url: /docs
      - generic [ref=e31]:
        - button "Search documentation" [ref=e32]:
          - generic [ref=e33]: Search docs…
          - generic [aria-hidden] [ref=e38]: Ctrl K
        - radiogroup "Color theme" [ref=e39]:
          - radio "Light" [ref=e40]
          - radio "Dark" [ref=e47]
          - radio "System" [checked] [ref=e50]
        - link "Sign In" [ref=e53] [cursor=pointer]:
          - /url: /login
        - link "Start Building Free" [ref=e54] [cursor=pointer]:
          - /url: /signup
  - main [ref=e55]:
    - generic [ref=e56]:
      - paragraph [ref=e57]: "404"
      - heading "Page not found" [level=1] [ref=e58]
      - paragraph [ref=e59]: The page may have moved, or the link was mistyped. Try searching, or pick one of the pages below.
      - generic [ref=e60]:
        - link "Search the docs" [ref=e61] [cursor=pointer]:
          - /url: /docs
        - link "Back to homepage" [ref=e65] [cursor=pointer]:
          - /url: /
      - navigation "Popular pages" [ref=e66]:
        - paragraph [ref=e67]: Popular pages
        - list [ref=e68]:
          - listitem [ref=e69]:
            - link "Home" [ref=e70] [cursor=pointer]:
              - /url: /
          - listitem [ref=e71]:
            - link "Product" [ref=e72] [cursor=pointer]:
              - /url: /product
          - listitem [ref=e73]:
            - link "Pricing" [ref=e74] [cursor=pointer]:
              - /url: /pricing
          - listitem [ref=e75]:
            - link "Documentation" [ref=e76] [cursor=pointer]:
              - /url: /docs
          - listitem [ref=e77]:
            - link "Templates" [ref=e78] [cursor=pointer]:
              - /url: /templates
          - listitem [ref=e79]:
            - link "How it works" [ref=e80] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e81]:
            - link "Support" [ref=e82] [cursor=pointer]:
              - /url: /support
          - listitem [ref=e83]:
            - link "Status" [ref=e84] [cursor=pointer]:
              - /url: /status
  - contentinfo [ref=e85]:
    - generic [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]:
          - link "Codexa home" [ref=e89] [cursor=pointer]:
            - /url: /
            - generic [ref=e94]: Codexa
          - paragraph [ref=e95]: Turn ideas into working software. Built for developers, students, founders, and teams in India and worldwide.
          - paragraph [ref=e96]:
            - link "Status" [ref=e97] [cursor=pointer]:
              - /url: /status
            - text: ·
            - link "Changelog" [ref=e98] [cursor=pointer]:
              - /url: /changelog
            - text: ·
            - link "GitHub" [ref=e99] [cursor=pointer]:
              - /url: https://github.com/sangralrahul/codexa
        - navigation "Product" [ref=e100]:
          - heading "Product" [level=3] [ref=e101]
          - list [ref=e102]:
            - listitem [ref=e103]:
              - link "Product" [ref=e104] [cursor=pointer]:
                - /url: /product
            - listitem [ref=e105]:
              - link "Features" [ref=e106] [cursor=pointer]:
                - /url: /features
            - listitem [ref=e107]:
              - link "How it works" [ref=e108] [cursor=pointer]:
                - /url: /how-it-works
            - listitem [ref=e109]:
              - link "AI App Builder" [ref=e110] [cursor=pointer]:
                - /url: /ai-app-builder
            - listitem [ref=e111]:
              - link "AI Agent" [ref=e112] [cursor=pointer]:
                - /url: /ai-agent
            - listitem [ref=e113]:
              - link "Code editor" [ref=e114] [cursor=pointer]:
                - /url: /code-editor
            - listitem [ref=e115]:
              - link "App deployment" [ref=e116] [cursor=pointer]:
                - /url: /app-deployment
            - listitem [ref=e117]:
              - link "Integrations" [ref=e118] [cursor=pointer]:
                - /url: /integrations
            - listitem [ref=e119]:
              - link "Templates" [ref=e120] [cursor=pointer]:
                - /url: /templates
            - listitem [ref=e121]:
              - link "Pricing" [ref=e122] [cursor=pointer]:
                - /url: /pricing
        - navigation "Solutions" [ref=e123]:
          - heading "Solutions" [level=3] [ref=e124]
          - list [ref=e125]:
            - listitem [ref=e126]:
              - link "startups" [ref=e127] [cursor=pointer]:
                - /url: /solutions/startups
            - listitem [ref=e128]:
              - link "developers" [ref=e129] [cursor=pointer]:
                - /url: /solutions/developers
            - listitem [ref=e130]:
              - link "students" [ref=e131] [cursor=pointer]:
                - /url: /solutions/students
            - listitem [ref=e132]:
              - link "founders" [ref=e133] [cursor=pointer]:
                - /url: /solutions/founders
            - listitem [ref=e134]:
              - link "agencies" [ref=e135] [cursor=pointer]:
                - /url: /solutions/agencies
            - listitem [ref=e136]:
              - link "enterprise" [ref=e137] [cursor=pointer]:
                - /url: /solutions/enterprise
            - listitem [ref=e138]:
              - link "education" [ref=e139] [cursor=pointer]:
                - /url: /solutions/education
            - listitem [ref=e140]:
              - link "SaaS" [ref=e141] [cursor=pointer]:
                - /url: /solutions/saas
        - navigation "Resources" [ref=e142]:
          - heading "Resources" [level=3] [ref=e143]
          - list [ref=e144]:
            - listitem [ref=e145]:
              - link "Documentation" [ref=e146] [cursor=pointer]:
                - /url: /docs
            - listitem [ref=e147]:
              - link "Guides" [ref=e148] [cursor=pointer]:
                - /url: /guides
            - listitem [ref=e149]:
              - link "Tutorials" [ref=e150] [cursor=pointer]:
                - /url: /tutorials
            - listitem [ref=e151]:
              - link "Blog" [ref=e152] [cursor=pointer]:
                - /url: /blog
            - listitem [ref=e153]:
              - link "Glossary" [ref=e154] [cursor=pointer]:
                - /url: /glossary
            - listitem [ref=e155]:
              - link "API" [ref=e156] [cursor=pointer]:
                - /url: /api
            - listitem [ref=e157]:
              - link "Help center" [ref=e158] [cursor=pointer]:
                - /url: /help
            - listitem [ref=e159]:
              - link "FAQ" [ref=e160] [cursor=pointer]:
                - /url: /faq
            - listitem [ref=e161]:
              - link "Community" [ref=e162] [cursor=pointer]:
                - /url: /community
            - listitem [ref=e163]:
              - link "Changelog" [ref=e164] [cursor=pointer]:
                - /url: /changelog
            - listitem [ref=e165]:
              - link "Roadmap" [ref=e166] [cursor=pointer]:
                - /url: /roadmap
            - listitem [ref=e167]:
              - link "Status" [ref=e168] [cursor=pointer]:
                - /url: /status
        - navigation "Company" [ref=e169]:
          - heading "Company" [level=3] [ref=e170]
          - list [ref=e171]:
            - listitem [ref=e172]:
              - link "About" [ref=e173] [cursor=pointer]:
                - /url: /about
            - listitem [ref=e174]:
              - link "Mission" [ref=e175] [cursor=pointer]:
                - /url: /mission
            - listitem [ref=e176]:
              - link "Careers" [ref=e177] [cursor=pointer]:
                - /url: /careers
            - listitem [ref=e178]:
              - link "Press" [ref=e179] [cursor=pointer]:
                - /url: /press
            - listitem [ref=e180]:
              - link "Brand" [ref=e181] [cursor=pointer]:
                - /url: /brand
            - listitem [ref=e182]:
              - link "Partners" [ref=e183] [cursor=pointer]:
                - /url: /partners
            - listitem [ref=e184]:
              - link "Contact" [ref=e185] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e186]:
              - link "Support" [ref=e187] [cursor=pointer]:
                - /url: /support
        - navigation "Legal" [ref=e188]:
          - heading "Legal" [level=3] [ref=e189]
          - list [ref=e190]:
            - listitem [ref=e191]:
              - link "Privacy policy" [ref=e192] [cursor=pointer]:
                - /url: /privacy
            - listitem [ref=e193]:
              - link "Terms of service" [ref=e194] [cursor=pointer]:
                - /url: /terms
            - listitem [ref=e195]:
              - link "Acceptable use" [ref=e196] [cursor=pointer]:
                - /url: /acceptable-use
            - listitem [ref=e197]:
              - link "Cookie policy" [ref=e198] [cursor=pointer]:
                - /url: /cookie-policy
            - listitem [ref=e199]:
              - link "Security" [ref=e200] [cursor=pointer]:
                - /url: /security
            - listitem [ref=e201]:
              - link "Trust" [ref=e202] [cursor=pointer]:
                - /url: /trust
            - listitem [ref=e203]:
              - link "Accessibility" [ref=e204] [cursor=pointer]:
                - /url: /accessibility
            - listitem [ref=e205]:
              - link "AI policy" [ref=e206] [cursor=pointer]:
                - /url: /ai-policy
            - listitem [ref=e207]:
              - link "Refund policy" [ref=e208] [cursor=pointer]:
                - /url: /refund-policy
      - generic [ref=e209]:
        - paragraph [ref=e210]: © 2026 Codexa. All rights reserved.
        - paragraph [ref=e211]:
          - text: Prices shown in INR and USD. Usage limits are enforced per workspace. See
          - link "pricing" [ref=e212] [cursor=pointer]:
            - /url: /pricing
          - text: .
  - button "Open Next.js Dev Tools" [ref=e218] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { PUBLIC_ROUTES } from "../../src/config/routes";
  3  | 
  4  | /**
  5  |  * Every indexable public route must respond 200 with a title, a meta
  6  |  * description and exactly one h1. Data-driven from PUBLIC_ROUTES so new
  7  |  * routes are covered automatically. Routes owned by teams that have not
  8  |  * shipped yet will fail here until their pages exist.
  9  |  */
  10 | const routes = PUBLIC_ROUTES.filter((r) => !r.noindex);
  11 | 
  12 | for (const route of routes) {
  13 |   test(`${route.path} renders with title, description and one h1`, async ({ page }) => {
  14 |     const res = await page.goto(route.path, { waitUntil: "domcontentloaded" });
  15 |     expect(res, `no response for ${route.path}`).not.toBeNull();
> 16 |     expect(res!.status(), `${route.path} status`).toBe(200);
     |                                                   ^ Error: /templates/ecommerce status
  17 |     await expect(page).toHaveTitle(/.+/);
  18 |     const description = page.locator('head meta[name="description"]');
  19 |     await expect(description).toHaveAttribute("content", /.+/);
  20 |     await expect(page.locator("h1")).toHaveCount(1);
  21 |   });
  22 | }
  23 | 
```