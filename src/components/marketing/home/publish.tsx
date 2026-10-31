import { Check, Cloud, Globe, RotateCcw } from "lucide-react";
import { CAPTURES } from "@/components/marketing/captures";
import { Eyebrow } from "./frame";

/** 03 Publish: copy and check rows on the left, the real Publish dialog capture on the right. */
export function HomePublish({ publishChecks }: { publishChecks: number }) {
  const c = CAPTURES.publish;
  const rows = [
    { icon: Check, ok: true, label: `${publishChecks} pre-publish checks`, note: "every publish" },
    { icon: Globe, ok: false, label: "Subdomain or custom domain", note: "custom on Pro and Team" },
    { icon: RotateCcw, ok: false, label: "One-click rollback", note: "any version" },
    { icon: Cloud, ok: false, label: "Runs on Cloudflare", note: "Workers / Containers / R2" },
  ];
  return (
    <section aria-labelledby="publish-title" className="mkg-row mkg-split">
      <div>
        <Eyebrow index="03">Publish</Eyebrow>
        <h2 id="publish-title" className="mkg-h2">
          Checked before
          <br />
          <span>it goes live.</span>
        </h2>
        <p className="mkg-split__p">
          {publishChecks} security and quality checks run before every publish. Ship to a Codexa subdomain or connect your own domain, and roll back to any earlier deployment in one click.
        </p>
        <ul className="mkg-rows">
          {rows.map((r) => (
            <li key={r.label}>
              <r.icon className={r.ok ? "size-4 shrink-0 text-success" : "size-4 shrink-0"} aria-hidden="true" />
              <b>{r.label}</b>
              <span>{r.note}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mkg-split__media">
        <div className="mkg-pimg">
          {/* eslint-disable-next-line @next/next/no-img-element -- static capture with explicit size */}
          <img src={c.src} alt={c.alt} width={c.width} height={c.height} loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  );
}
