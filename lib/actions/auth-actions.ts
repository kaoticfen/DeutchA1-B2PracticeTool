"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { isSetupComplete } from "@/lib/session";
import { isLevel, type LevelName } from "@/lib/levels";

export type FormState = { error?: string } | null;

const setupSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter your name.").max(120),
    email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
    level: z.string().refine(isLevel, "Please choose a starting level."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function createFirstAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  // Guard against a second account being created through a stale setup form.
  if (await isSetupComplete()) return { error: "Setup has already been completed. Please sign in." };

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    level: formData.get("level"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { name, email, password, level } = parsed.data;
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      currentLevel: level as LevelName,
      levelMode: "AUTO",
    },
  });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Incorrect email or password." };
    throw err;
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
