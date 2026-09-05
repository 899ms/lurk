import Link from "next/link";
import { Button } from "@/components/ui/button";
import { disconnectWalletAction } from "@/app/app/actions";

type WalletPanelProps = { connectedAt: Date | null };

/** Wallet connection state and the two actions that change it. */
export function WalletPanel({ connectedAt }: WalletPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-card border bg-surface p-6">
      <h2 className="text-h3" style={{ fontWeight: 500 }}>
        AnyAPI wallet
      </h2>
      {connectedAt ? (
        <>
          <p className="text-body text-fg-muted">
            Connected on {connectedAt.toISOString().slice(0, 10)}. Scans bill your AnyAPI wallet up
            to the spend cap you set when you authorized this app.
          </p>
          <form action={disconnectWalletAction}>
            <Button type="submit" variant="outline" size="lg">
              Disconnect
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="text-body text-fg-muted">
            Not connected. Connect a wallet to get hourly scans, unlimited keywords and daily Reddit
            SEO refreshes, billed per request to your own AnyAPI account.
          </p>
          <Button size="lg" render={<Link href="/connect">Connect AnyAPI wallet</Link>} />
        </>
      )}
    </section>
  );
}
