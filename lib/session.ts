import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** True once a first account exists. Drives the first-run setup gate. */
export async function isSetupComplete(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}

/**
 * The signed-in user, or a redirect. Sends first-time visitors to /setup
 * rather than to a login form they could not possibly satisfy yet.
 */
export async function requireUser() {
  if (!(await isSetupComplete())) redirect("/setup");

  const session = await auth();
  const id = session?.user?.id ? Number(session.user.id) : null;
  if (!id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/login");

  return user;
}
