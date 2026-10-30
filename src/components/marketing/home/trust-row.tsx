import { HOME_TRUST } from "@/content/marketing/home";

/**
 * "Built on" trust row: the real stack (React, Vite, TypeScript, Node.js, Cloudflare) as simple
 * monochrome marks drawn in currentColor. These are the technologies Codexa and its starters
 * actually run on; no customer logos, nothing implied.
 */
const MARKS: Record<string, React.ReactNode> = {
  react: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  vite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 4.5 12 21.5 21.5 4.5 12 7.2z" />
      <path d="M14.2 3.2 9.5 12.6h3.1l-1.4 5.6 5.1-8.4h-3.2z" fill="currentColor" stroke="none" />
    </svg>
  ),
  typescript: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="16.4" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="currentColor" fontFamily="ui-sans-serif, system-ui, sans-serif">
        TS
      </text>
    </svg>
  ),
  node: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5 20.5 7.25v9.5L12 21.5 3.5 16.75v-9.5z" />
      <path d="M12 7.5v9M8.2 9.7l3.8 2.2 3.8-2.2" />
    </svg>
  ),
  cloudflare: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 18.5h11a3.5 3.5 0 0 0 .5-6.96A5.5 5.5 0 0 0 8.1 9.6 4.5 4.5 0 0 0 7 18.5z" />
    </svg>
  ),
};

export function TrustRow() {
  return (
    <section aria-labelledby="trust-title" className="border-b border-border bg-background">
      <div className="container-x flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between lg:py-9">
        <p id="trust-title" className="text-[13px] font-medium text-muted-foreground">
          {HOME_TRUST.label}
        </p>
        <ul className="mk-trust flex flex-wrap items-center justify-center gap-x-9 gap-y-3">
          {HOME_TRUST.items.map((t) => (
            <li key={t.id} className="mk-trust__item">
              {MARKS[t.id]}
              <span>{t.name}</span>
            </li>
          ))}
        </ul>
        <p className="hidden text-[12px] text-muted-foreground xl:block">{HOME_TRUST.note}</p>
      </div>
    </section>
  );
}
