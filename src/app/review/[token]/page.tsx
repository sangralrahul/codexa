import type { Metadata } from "next";
import { resolveFeedbackToken, listPublicComments, reviewTarget } from "@/lib/services/feedback";
import { ReviewClient, ReviewUnavailable } from "@/components/review/review-client";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Review",
  description: "Leave comments on an app built with Codexa.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Client review page behind a feedback link: anyone with the link can view the app and pin
 * comments to it, without a Codexa account. Revoked and unknown links get an explicit state.
 */
export default async function ReviewPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveFeedbackToken(token);
  if (!resolved) return <ReviewUnavailable />;
  const [target, comments] = await Promise.all([reviewTarget(resolved.project.id), listPublicComments(resolved.project.id)]);
  return <ReviewClient token={token} projectName={resolved.project.name} initialTarget={target} initialComments={comments} />;
}
