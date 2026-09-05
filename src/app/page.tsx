import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { PRODUCT_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-16 px-8 py-8">
      <Wordmark />
      <section className="grid gap-10 md:grid-cols-2">
        <h1 className="text-display" style={{ fontWeight: 500 }}>
          Find the Reddit posts that are ready to buy.
        </h1>
        <div className="flex flex-col gap-4 text-body text-fg-muted">
          <p>{PRODUCT_NAME} scores Reddit posts and comments for buyer intent and tells you why.</p>
          <p>Every lead shows what its data cost, down to the request.</p>
          <p>Free to self-host, free to use. Connect an AnyAPI wallet for hourly scans.</p>
          <div className="flex gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/app/leads">Open the app</Link>} />
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href="/sign-up">Create an account</Link>}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
