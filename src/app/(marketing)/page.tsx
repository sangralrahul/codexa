import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { buttonClasses } from "@/components/ui/button";

export const metadata = routeMetadata("/");

// Placeholder until the full homepage lands in Phase 2.
export default function HomePage() {
  return (
    <section className="container-x py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Build software at the speed of thought.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
        Describe your idea. Codexa helps you create, refine, test, and deploy real applications.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/signup" className={buttonClasses("primary", "lg")}>
          Start Building Free
        </Link>
        <Link href="/product" className={buttonClasses("outline", "lg")}>
          Explore the Platform
        </Link>
      </div>
    </section>
  );
}
