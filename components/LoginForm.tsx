"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type FormState } from "@/lib/actions/auth-actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, null);

  return (
    <form action={formAction} className="surface w-full max-w-sm space-y-4 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Willkommen zurück</h1>
        <p className="muted mt-1 text-sm">Sign in to continue your German practice.</p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input
          className="input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state?.error && (
        <p className="text-sm text-[var(--color-unknown-500)]" role="alert">
          {state.error}
        </p>
      )}

      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="muted text-center text-xs">
        No account needed for the{" "}
        <Link href="/cheatsheet/A1" className="underline">
          grammar cheat sheet
        </Link>
        .
      </p>
    </form>
  );
}
