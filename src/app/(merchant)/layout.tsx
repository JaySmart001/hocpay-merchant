// src/app/(merchant)/layout.tsx  (or wherever your MerchantLayout lives)
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";

/* Firebase */
import { signOut } from "firebase/auth";
import { getFirebase } from "@/app/lib/firebase";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/referrals", label: "Referrals", icon: UsersIcon },
  // { href: "/transactions", label: "Transactions", icon: CardIcon },
  { href: "/rewards", label: "Rewards", icon: GiftIcon },
  // { href: "/settings", label: "Settings", icon: SettingsIcon },
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
      {/* SIDEBAR */}
      <aside className="sticky top-0 h-screen overflow-y-auto bg-[#0A66FF] text-white">
        <div className="px-4 pb-6 pt-5">
          {/* Header (icon removed per request) */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-lg font-semibold">HocPay Merchant</span>
          </div>

          {/* search (decorative) */}
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

      {/* MAIN */}
      <div className="min-w-0">
        {/* top bar */}
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

        {/* page body container */}
        <main className="mx-auto max-w-[1200px] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

/* ——— tiny icons ——— */
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
function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
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
function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82 2 2 0 1 1-3.34 0 1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.35 19l.06-.06A1.65 1.65 0 0 0 4 17.4a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33 2 2 0 1 1 0-3.34 1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 5.17 3.3l.06.06c.5.5 1.2.7 1.82.6.38-.06.73-.25 1-.6.27-.35.42-.79.34-1.22a2 2 0 1 1 3.34 0c-.08.43.07.87.34 1.22.27.35.62.54 1 .6.62.1 1.32-.1 1.82-.6l.06-.06A2 2 0 1 1 20.7 5.2l-.06.06c-.5.5-.7 1.2-.6 1.82.06.38.25.73.6 1 .35.27.79.42 1.22.34a2 2 0 1 1 0 3.34c-.43-.08-.87.07-1.22.34-.35.27-.54.62-.6 1Z" />
    </svg>
  );
}
