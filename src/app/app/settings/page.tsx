import { WalletPanel } from "@/components/WalletPanel";
import { requireLocalUser } from "@/lib/auth";
import { walletConnection } from "@/lib/anyapi";

export default async function SettingsPage() {
  const user = await requireLocalUser();
  const connection = await walletConnection(user.id);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-h2" style={{ fontWeight: 500 }}>
        Settings
      </h1>
      <WalletPanel connectedAt={connection?.connectedAt ?? null} />
    </div>
  );
}
