import { createHash } from "node:crypto";
import { ApiError, handler, json } from "@/lib/api";
import { capabilities } from "@/lib/env";
import { verifyRazorpayWebhookSignature } from "@/lib/billing/razorpay";
import { processWebhook } from "@/lib/billing/webhooks";
import { razorpayTransition } from "@/lib/billing/state";

/**
 * POST /api/webhooks/razorpay
 * Verified with HMAC-SHA256(raw body, RAZORPAY_WEBHOOK_SECRET) === X-Razorpay-Signature.
 * Event id comes from X-Razorpay-Event-Id (falls back to a body hash) for idempotency.
 */
export const POST = handler(async (req) => {
  if (!capabilities.razorpay) return json({ error: { code: "billing_not_configured", message: "Razorpay is not configured" } }, { status: 503 });
  const raw = await req.text();
  if (!verifyRazorpayWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    throw new ApiError(400, "Invalid Razorpay signature", "invalid_signature");
  }
  let body: { event?: string; payload?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Invalid JSON body", "bad_request");
  }
  if (!body.event) throw new ApiError(400, "Missing event", "bad_request");
  const eventId = req.headers.get("x-razorpay-event-id") ?? createHash("sha256").update(raw).digest("hex");
  const outcome = await processWebhook("razorpay", eventId, body.event, body, razorpayTransition({ event: body.event, payload: body.payload }));
  if (outcome.error) return json({ received: true, ...outcome }, { status: 500 });
  return json({ received: true, ...outcome });
});
