// src/app/(auth)/signin/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* Firebase */
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { getFirebase } from "@/app/lib/firebase";

export default function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const { auth, db } = getFirebase();

  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  // Show CTA (not a merchant yet) instead of a blocking error
  const [notMerchant, setNotMerchant] = useState(false);

  // If already signed in, route appropriately
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setReady(true);
      return;
    }

    (async () => {
      try {
        const mSnap = await getDoc(doc(db, "merchants", u.uid));
        if (mSnap.exists()) {
          router.replace(next);
        } else if (next.startsWith("/signup")) {
          router.replace(next);
        } else {
          setNotMerchant(true);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [auth, db, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setNotMerchant(false);
    setSubmitting(true);

    try {
      // 1) Email/password sign-in
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2) Check merchant doc
      const uid = cred.user.uid;
      const mRef = doc(db, "merchants", uid);
      const mSnap = await getDoc(mRef);

      if (mSnap.exists()) {
        router.replace(next);
        return;
      }

      // Not a merchant yet:
      if (next.startsWith("/signup")) {
        router.replace(next); // continue to merchant application
        return;
      }

      // Default: keep session and show CTA to proceed to signup
      setNotMerchant(true);
    } catch (err) {
      let msg = "Could not sign in. Please try again.";
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            msg = "Invalid email or password.";
            break;
          case "auth/too-many-requests":
            msg = "Too many attempts. Please try again later.";
            break;
          case "auth/network-request-failed":
            msg = "Network error. Check your connection and try again.";
            break;
          default:
            msg = `[${err.code}] ${err.message}`;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <main className="grid min-h-[100svh] place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0068FF] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="grid min-h-[100svh] grid-cols-1 md:grid-cols-2">
        {/* LEFT: form */}
        <section className="bg-white px-6 py-10 sm:px-10 md:px-14 md:py-16">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome To HocPay Merchant
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your business and rewards
          </p>

          <form onSubmit={onSubmit} className="mt-10 max-w-md space-y-6">
            <label className="block">
              <div className="mb-1.5 text-sm font-medium text-slate-700">
                Email Address
              </div>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#0068FF] focus:ring-2 focus:ring-[#0068FF]/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Password</span>
                <a href="/forgot-password" className="text-xs text-[#0068FF]">
                  Forgot Password?
                </a>
              </div>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#0068FF] focus:ring-2 focus:ring-[#0068FF]/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            {notMerchant && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This account isn’t registered as a merchant yet.{" "}
                <a
                  href="/signup"
                  className="font-medium underline decoration-amber-300 underline-offset-2"
                >
                  Continue to merchant application
                </a>
                .
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0068FF] px-8 py-3 text-[15px] font-medium text-white shadow hover:bg-[#0657D0] focus:outline-none focus:ring-2 focus:ring-[#0068FF]/40 disabled:opacity-60 sm:w-60"
            >
              {submitting ? "Signing In…" : "Sign In"}
            </button>

            <p className="text-xs text-slate-500">
              Don’t have an account?{" "}
              {/* Use next=/signup so sign-in sends them directly into the flow */}
              <a
                href="/signin?next=/signup"
                className="text-[#0068FF] hover:underline"
              >
                Sign Up
              </a>
            </p>
          </form>
        </section>

        {/* RIGHT: blue illustration panel */}
        <aside className="relative bg-[#0068FF] text-white">
          <div className="absolute inset-0">
            <p className="absolute right-8 top-24 max-w-xs text-right text-lg font-semibold leading-relaxed md:right-16">
              Quick and Easy Setup
              <br />
              <span className="text-white/90">no heavy paperwork</span>
            </p>

            <div className="absolute bottom-24 right-8 hidden md:block">
              <ShieldMonitor />
            </div>

            <div className="absolute left-1/2 top-28 -translate-x-1/2">
              <div className="relative grid w-[min(90vw,640px)] place-items-center">
                <div className="absolute h-64 w-64 rounded-full border-2 border-white/30" />
                <FloatingCards />
              </div>
            </div>

            <div className="absolute bottom-5 left-1/2 w-full -translate-x-1/2 px-6">
              <div className="mx-auto max-w-4xl">
                <ul className="flex flex-col items-center justify-center gap-2 text-[13px] opacity-90 md:flex-row md:flex-wrap md:gap-6">
                  <li className="font-medium">Need help? Contact us</li>
                  <li className="hidden h-4 w-px bg-white/30 md:block" />
                  <li>
                    <a href="tel:+2348072221056" className="hover:underline">
                      +234 80 7222 1056
                    </a>
                  </li>
                  <li>
                    <a href="tel:+2348053291993" className="hover:underline">
                      +234 80 5329 1993
                    </a>
                  </li>
                  <li className="md:ml-auto">
                    <a
                      href="mailto:hocpaytechnologies@support.com"
                      className="block truncate hover:underline"
                    >
                      hocpaytechnologies@support.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ---------- Illustrations ---------- */
function FloatingCards() {
  return (
    <svg viewBox="0 0 220 90" className="h-28 w-auto text-white">
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.95">
        <rect
          x="15"
          y="20"
          rx="6"
          ry="6"
          width="90"
          height="38"
          fill="currentColor"
          opacity="0.15"
        />
        <rect
          x="120"
          y="8"
          rx="6"
          ry="6"
          width="70"
          height="28"
          fill="currentColor"
          opacity="0.15"
        />
        <rect
          x="130"
          y="48"
          rx="6"
          ry="6"
          width="60"
          height="22"
          fill="currentColor"
          opacity="0.15"
        />
      </g>
      <g stroke="currentColor" strokeWidth="3" opacity="0.95">
        <line x1="28" y1="38" x2="38" y2="38" />
        <line x1="48" y1="38" x2="84" y2="38" />
        <line x1="132" y1="20" x2="178" y2="20" />
        <line x1="140" y1="60" x2="178" y2="60" />
      </g>
      <circle
        cx="110"
        cy="45"
        r="42"
        stroke="currentColor"
        strokeDasharray="4 4"
        opacity="0.35"
        fill="none"
      />
      <circle
        cx="110"
        cy="45"
        r="43"
        stroke="currentColor"
        opacity="0.1"
        fill="none"
      />
    </svg>
  );
}

function ShieldMonitor() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[8px_8px_0_rgba(0,0,0,0.35)] ring-1 ring-black/5">
      <svg viewBox="0 0 120 72" className="h-24 w-auto">
        <rect x="8" y="10" width="104" height="52" rx="6" fill="#F3F6FF" />
        <rect x="58" y="64" width="4" height="4" rx="2" fill="#93C5FD" />
        <path
          d="M60 22 l18 6 v10c0 10-9 16-18 19c-9-3-18-9-18-19v-10z"
          fill="#0EA5E9"
        />
        <path
          d="M54 39 l6 6 l10-11"
          stroke="white"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
