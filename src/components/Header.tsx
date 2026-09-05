import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

/** App header: wordmark on the left, theme toggle and account on the right. */
export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-bg px-6">
      <Wordmark />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
