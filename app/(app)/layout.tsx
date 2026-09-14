import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/session";
import type { LevelName } from "@/lib/levels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Gates every authenticated route: redirects to /setup on first run, /login otherwise.
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppNav userName={user.name} level={user.currentLevel as LevelName} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
