import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSetupComplete } from "@/lib/session";

export default async function Home() {
  if (!(await isSetupComplete())) redirect("/setup");
  const session = await auth();
  redirect(session?.user?.id ? "/dashboard" : "/login");
}
