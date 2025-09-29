// src/app/(merchant)/layout.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";

import { signOut } from "firebase/auth";
import { getFirebase } from "@/app/lib/firebase";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/referrals", label: "Referrals", icon: UsersIcon },

  { href: "/rewards", label: "Rewards", icon: GiftIcon },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = getFirebase();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/signin");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-[#F3F6FB]">
      <aside className="sticky top-0 h-screen overflow-y-auto bg-[#0A66FF] text-white">
        <div className="px-4 pb-6 pt-5">
          <div className="mb-6 flex items-center gap-2">
            <span className="text-lg font-semibold">HocPay Merchant</span>
          </div>

          <div className="mb-5">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm placeholder-white/70">
              <span className="opacity-80">🔍</span>
              <input
                placeholder="Search"
                className="w-full bg-transparent outline-none placeholder-white/70"
                aria-label="Search"
              />
            </div>
          </div>

          <nav className="space-y-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx(
                    "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-white text-[#0A66FF]"
                      : "text-white/90 hover:bg-white/10"
                  )}
                >
                  <Icon active={active} />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 border-t border-white/10 pt-5">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={cx(
                "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm hover:bg-white/10",
                loggingOut ? "opacity-60 cursor-not-allowed" : "text-white/90"
              )}
            >
              <span className="text-lg">{loggingOut ? "⏳" : "⏻"}</span>
              {loggingOut ? "Logging out…" : "Log Out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3">
            <div className="relative w-full max-w-md">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400"
                placeholder="Search"
                aria-label="Search"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>
            <div className="ml-4 flex items-center gap-3">
              <button className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
                🔔
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                SU
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect
        x="3"
        y="3"
        width="8"
        height="8"
        rx="2"
        className={active ? "stroke-[#0A66FF]" : "stroke-current"}
        fill={active ? "#fff" : "none"}
      />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M2 21c0-4 4-6 7-6" />
      <circle cx="17" cy="9" r="2" />
      <path d="M22 21c0-3-3-5-5-5" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 8v12M3 12h18" />
    </svg>
  );
}
