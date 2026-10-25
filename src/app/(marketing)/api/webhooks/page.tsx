import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";

export const metadata = routeMetadata("/api/webhooks");

const md = `
Codexa receives webhooks from its payment providers. It does not send webhooks to you yet; outbound webhooks are not on the near-term roadmap.

## Endpoints

| Provider | Endpoint                   | Signature header         |
| -------- | -------------------------- | ------------------------ |
| Stripe   | \`POST /api/webhooks/stripe\`   | \`Stripe-Signature\`         |
| Razorpay | \`POST /api/webhooks/razorpay\` | \`X-Razorpay-Signature\`     |

These endpoints are public (no session) and are protected only by signature verification, so the handlers read the **raw** request body before any JSON parsing.

## Verification

- **Stripe**: the raw body and the \`Stripe-Signature\` header are verified with the webhook signing secret (\`STRIPE_WEBHOOK_SECRET\`) using the Stripe SDK's constructor for events. A bad signature returns 400 and nothing is processed.
- **Razorpay**: the \`X-Razorpay-Signature\` header is compared, in constant time, with an HMAC-SHA256 of the raw body keyed with \`RAZORPAY_WEBHOOK_SECRET\`.

When the corresponding secret is not configured on the server, the endpoint returns 503 and logs that the provider is not configured; it never accepts unverified events.

## Idempotency

Providers retry deliveries. Each event's provider-assigned id is stored in a \`webhook_events\` table before processing:

1. Insert the event id. If it already exists, respond 200 immediately without reprocessing.
2. Process the event inside a transaction (update subscription state, record invoice, change the workspace plan).
3. Mark the event as processed. A failure leaves it unprocessed so the provider's retry can complete it.

The result is at-least-once delivery from the provider turned into exactly-once effects in Codexa.

## Events handled

| Stripe                              | Razorpay                       | Effect                                   |
| ----------------------------------- | ------------------------------ | ---------------------------------------- |
| \`checkout.session.completed\`        | \`subscription.activated\`       | Workspace moves to the purchased plan    |
| \`customer.subscription.updated\`     | \`subscription.charged\`         | Interval/plan/renewal updated            |
| \`customer.subscription.deleted\`     | \`subscription.cancelled\`, \`subscription.halted\` | Workspace returns to Free at period end |
| \`invoice.paid\`, \`invoice.payment_failed\` | \`payment.captured\`, \`payment.failed\` | Invoice records and dunning state |

Unknown event types are acknowledged with 200 and ignored, so provider-side changes do not cause retry storms.

## Testing locally

Use the providers' CLIs or dashboards to send test events to a tunnel pointed at your development server. Set the matching webhook secret in the server environment; without it the endpoint returns 503 by design.

## Using the same pattern in your apps

The [Build a SaaS guide](/guides/build-a-saas#step-3-billing) walks through implementing verify-then-deduplicate in a Node + Express project built on Codexa.
`;

export default function ApiWebhooksPage() {
  return <DevArticle path="/api/webhooks" markdown={md} />;
}
