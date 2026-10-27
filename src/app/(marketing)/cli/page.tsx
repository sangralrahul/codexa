import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { Callout } from "@/components/content";

export const metadata = routeMetadata("/cli");

const md = `
## What it will do

- \`codexa login\` using an API token (tokens are planned; the CLI depends on them).
- \`codexa pull\` / \`codexa push\` to sync a project's files with a local directory, so you can use your own editor and tools.
- \`codexa run\` to start a preview and tail its logs from the terminal.
- \`codexa deploy\` to trigger a Codexa hosting deployment and print the URL.
- \`codexa snapshot\` to create and restore checkpoints.

## What to use today

- **GitHub push** from the project's GitHub panel gets your files into a repository you can clone. See [GitHub](/docs/github).
- **Download** from the project menu produces a zip of the current files.
- The [HTTP API](/api) with \`curl\` covers everything else, using a session cookie.

## Status

Listed under **Later** on the [roadmap](/roadmap), together with the SDK, after API tokens. No dates are committed.
`;

export default function CliPage() {
  return (
    <div data-tone="docs">
    <DevArticle path="/cli" markdown={md}>
      <div className="mt-10 max-w-xl space-y-6">
        <Callout kind="warning" title="Not yet available">
          <p>There is no Codexa CLI to install today. Commands shown above describe the intended design, not shipped software.</p>
        </Callout>
        <section aria-labelledby="cli-notify">
          <h2 id="cli-notify" className="text-lg font-semibold">
            Get notified when it ships
          </h2>
          <NewsletterForm className="mt-3" source="cli" />
        </section>
      </div>
    </DevArticle>
    </div>
  );
}
