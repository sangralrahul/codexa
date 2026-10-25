import { autoHighlight, Highlight } from "@/components/marketing/backdrop";

/** Heading block and content for account pages (the layout provides the frame). */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em]">
        <Highlight text={title} highlight={autoHighlight(title)} />
      </h1>
      {description ? <p className="mt-3 text-base text-muted-foreground">{description}</p> : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}
