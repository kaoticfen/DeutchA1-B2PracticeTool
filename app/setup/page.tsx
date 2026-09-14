import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/SetupWizard";
import { isSetupComplete } from "@/lib/session";

export default async function SetupPage() {
  // Setup is strictly first-run; once an account exists this route is closed.
  if (await isSetupComplete()) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <SetupWizard />
    </main>
  );
}
