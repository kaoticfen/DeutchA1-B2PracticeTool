import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { isSetupComplete } from "@/lib/session";

export default async function LoginPage() {
  if (!(await isSetupComplete())) redirect("/setup");

  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm />
    </main>
  );
}
