"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { LEVEL_LABELS, type LevelName } from "@/lib/levels";
import { signOutAction } from "@/lib/actions/auth-actions";

export function AppNav({
  userName,
  level,
}: {
  userName: string;
  level: LevelName;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <>
      {/* Mobile bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden"
        style={{ background: "var(--surface)" }}
      >
        <Link href="/dashboard" className="font-semibold">
          Deutsch <span style={{ color: "var(--color-brand-500)" }}>A1–B2</span>
        </Link>
        <button className="btn btn-ghost px-3 py-1.5" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-r px-3 py-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:overflow-y-auto`}
        style={{ background: "var(--surface)" }}
      >
        <Link href="/dashboard" className="mb-5 hidden px-2 text-lg font-semibold lg:block">
          Deutsch <span style={{ color: "var(--color-brand-500)" }}>A1–B2</span>
        </Link>

        <div className="mb-5 rounded-lg px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
          <div className="text-sm font-medium">{userName}</div>
          <div className="muted text-xs">{LEVEL_LABELS[level]}</div>
        </div>

        <nav className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group}>
              <div className="muted mb-1 px-2 text-[0.7rem] font-semibold uppercase tracking-wider">
                {group}
              </div>
              <ul className="space-y-0.5">
                {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
                      style={
                        isActive(item.href)
                          ? {
                              background: "color-mix(in srgb, var(--color-brand-500) 16%, transparent)",
                              color: "var(--text)",
                              fontWeight: 500,
                            }
                          : { color: "var(--text-muted)" }
                      }
                    >
                      <span aria-hidden className="w-4 text-center">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-6 border-t pt-4">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <span aria-hidden className="w-4 text-center">
              ☺
            </span>
            Profile & settings
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              <span aria-hidden className="w-4 text-center">
                ⏻
              </span>
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
