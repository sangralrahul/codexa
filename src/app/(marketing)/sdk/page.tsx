import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { Callout } from "@/components/content";

export const metadata = routeMetadata("/sdk");

const md = `
## What it will do

- Typed clients for every v1 endpoint (workspaces, projects, files, snapshots, AI runs, runtime, deployments).
- A streaming helper that turns the generation SSE stream into an async iterator of typed events.
- Authentication with API tokens, which are also still planned. The SDK will not ship before tokens do.
- TypeScript first, published to npm; other languages are not planned for the first release.

## What to use today

The [HTTP API](/api) with a session cookie. Every call the SDK will make is already available as a plain request; the [reference](/api/reference) has shapes and examples, and the [generations page](/api/generations) includes a small SSE parser you can copy.

## Status

Listed under **Later** on the [roadmap](/roadmap), after API tokens. No dates are committed.
`;

export default function SdkPage() {
  return (
    <div data-tone="docs">
    <DevArticle path="/sdk" markdown={md}>
      <div className="mt-10 max-w-xl space-y-6">
        <Callout kind="warning" title="Not yet available">
          <p>There is no Codexa SDK to install today. Any package using the name on a registry is not published by us.</p>
        </Callout>
        <section aria-labelledby="sdk-notify">
          <h2 id="sdk-notify" className="text-lg font-semibold">
            Get notified when it ships
          </h2>
          <NewsletterForm className="mt-3" source="sdk" />
        </section>
      </div>
    </DevArticle>
    </div>
  );
}
