"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* Firebase */
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getFirebase } from "@/app/lib/firebase";

type Period = "weekly" | "monthly";
type TierId = "starter" | "bronze" | "gold";

type PendingSignup = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  bvn: string;
  files: {
    govId: { name: string; type: string; dataUrl: string };
    utility: { name: string; type: string; dataUrl: string };
  };
  createdAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_DAYS = 30;

async function reviveFile(obj: {
  name: string;
  type: string;
  dataUrl: string;
}) {
  const res = await fetch(obj.dataUrl);
  const blob = await res.blob();
  return new File([blob], obj.name, { type: obj.type });
}

export default function GoalPage() {
  const router = useRouter();

  // Mode:
  // - "onboarding": coming from /signup with pending data in sessionStorage
  // - "manage": logged-in user editing goal (subject to 30-day lock)
  const [mode, setMode] = useState<"onboarding" | "manage">("onboarding");

  const [tab, setTab] = useState<Period>("weekly");
  const [selected, setSelected] = useState<TierId | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // onboarding-only
  const [pending, setPending] = useState<PendingSignup | null>(null);

  // manage-only
  const [uid, setUid] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  // Decide mode + preload data
  useEffect(() => {
    const raw = sessionStorage.getItem("hocpay.pendingSignup");
    if (raw) {
      // Onboarding flow
      setPending(JSON.parse(raw));
      setMode("onboarding");
      setLoading(false);
      return;
    }

    // Manage flow (no pending draft). Require auth.
    const { auth, db } = getFirebase();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace(`/signin?next=${encodeURIComponent("/signup")}`);
        return;
      }
      setUid(user.uid);

      const mref = doc(db, "merchants", user.uid);
      const msnap = await getDoc(mref);
      if (msnap.exists()) {
        const m = msnap.data() as any;
        if (m?.rewardPlan?.period) setTab(m.rewardPlan.period as Period);
        if (m?.rewardPlan?.tier) setSelected(m.rewardPlan.tier as TierId);
        if (m?.rewardPlan?.selectedAt?.toDate) {
          const last: Date = m.rewardPlan.selectedAt.toDate();
          setLockedUntil(new Date(last.getTime() + LOCK_DAYS * DAY_MS));
        }
      }
      setMode("manage");
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const now = new Date();
  const canChange = useMemo(() => {
    if (mode === "onboarding") return true;
    if (!lockedUntil) return true;
    return now >= lockedUntil;
  }, [lockedUntil, now, mode]);

  const tiers = useMemo(
    () => ({
      weekly: [
        {
          id: "starter" as TierId,
          title: "Starter - 5 customers per week",
          bonus: "₦500 bonus",
          desc: "Begin your journey! Bring 5 customers weekly, earn ₦500 bonus + starter badge",
          badge: <SparkIcon />,
        },
        {
          id: "bronze" as TierId,
          title: "Bronze - 10 customers per week",
          bonus: "₦1,500 bonus",
          desc: "Step Up! Bring 10 customers weekly and unlock ₦1,500 bonus + bronze badge",
          badge: <MedalIcon />,
          highlight: true,
        },
        {
          id: "gold" as TierId,
          title: "Gold - 30 customers per week",
          bonus: "₦10,000 bonus",
          desc: "Go Big! 30+ weekly customers = ₦10,000 bonus + Gold recognition",
          badge: <CrownIcon />,
          span2: true,
        },
      ],
      monthly: [
        {
          id: "starter" as TierId,
          title: "Starter monthly - 20 customers per month",
          bonus: "₦2,000 bonus",
          desc: "Bring 20 customers monthly, earn ₦2,000 bonus + starter badge",
          badge: <SparkIcon />,
        },
        {
          id: "bronze" as TierId,
          title: "Silver - 101 customers per month",
          bonus: "₦5,000 bonus",
          desc: "Level up! 10+ customers = ₦5,000 bonus + silver recognition",
          badge: <MedalIcon />,
          highlight: true,
        },
        {
          id: "gold" as TierId,
          title: "Elite - 1,000 customers per month",
          bonus: "₦50,000 bonus",
          desc: "Be among the best! Bring 1,000 customers monthly and unlock ₦50,000 + Elite status",
          badge: <CrownIcon />,
          span2: true,
        },
      ],
    }),
    []
  );

  async function completeOnboarding() {
    const { auth, db, storage } = getFirebase();
    if (saving || !pending || !selected) return;

    setSaving(true);
    try {
      // Must be signed in already (existing user only)
      const user = auth.currentUser;
      if (!user) {
        throw new Error(
          "Please sign in to continue your merchant application."
        );
      }
      const userId = user.uid;

      // Ensure a base profile exists: users/{uid}
      const uref = doc(db, "users", userId);
      const usnap = await getDoc(uref);
      if (!usnap.exists()) {
        throw new Error(
          "We couldn't find your user profile. Please complete signup in the mobile app, then try again."
        );
      }

      const udata = (usnap.data() || {}) as any;
      const va = udata.virtualAccount || null;
      const accountNumber = va?.number || va?.accountNumber || null;

      // Upload KYC files to kyc_merchants/...
      const govFile = await reviveFile(pending.files.govId);
      const utlFile = await reviveFile(pending.files.utility);

      const govRef = ref(
        storage,
        `kyc_merchants/selfies/${userId}/${govFile.name}`
      );
      const utlRef = ref(
        storage,
        `kyc_merchants/proof_of_address/${userId}/${utlFile.name}`
      );
      await uploadBytes(govRef, govFile);
      await uploadBytes(utlRef, utlFile);

      // Create/merge merchants/{uid}
      await setDoc(
        doc(db, "merchants", userId),
        {
          uid: userId,
          fullName: pending.fullName,
          email: pending.email,
          phone: pending.phone,
          address: pending.address,
          city: pending.city,
          state: pending.state,
          country: pending.country,
          bvn: pending.bvn,
          govIdPath: govRef.fullPath,
          utilityPath: utlRef.fullPath,
          accountNumber: accountNumber,
          virtualAccountSummary: va
            ? {
                number: accountNumber,
                provider: va.provider ?? null,
                providerEnv: va.providerEnv ?? null,
                status: va.status ?? null,
                createdAt: va.createdAt ?? null,
                updatedAt: va.updatedAt ?? null,
              }
            : null,
          rewardPlan: {
            period: tab,
            tier: selected,
            selectedAt: serverTimestamp(),
          },
          status: "created",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Mark base user
      await setDoc(
        uref,
        {
          isMerchant: true,
          merchantStatus: "created",
          merchantCreatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      sessionStorage.removeItem("hocpay.pendingSignup");
      setSuccess(true);

      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch (e: any) {
      alert(e?.message ?? "Couldn't finish registration. Please try again.");
      setSaving(false);
    }
  }

  async function updateGoal() {
    const { db } = getFirebase();
    if (saving || !uid || !selected || !canChange) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "merchants", uid),
        {
          rewardPlan: {
            period: tab,
            tier: selected,
            selectedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
      router.replace("/dashboard");
    } catch (e: any) {
      alert(e?.message ?? "Couldn't update goal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Handle back button - clear session storage
  const handleBack = () => {
    if (mode === "onboarding") {
      sessionStorage.removeItem("hocpay.pendingSignup");
      router.replace("/signup");
    } else {
      router.replace("/dashboard");
    }
  };

  const onPrimary = () =>
    mode === "onboarding" ? completeOnboarding() : updateGoal();

  // Show success screen
  if (success) {
    return (
      <main className="grid min-h-[100svh] place-items-center bg-white p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Account Created Successfully!
          </h1>
          <p className="mt-3 text-slate-600">
            Your merchant account has been created. You can now start earning
            rewards.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Redirecting to your dashboard…
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-[100svh] place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0068FF] border-t-transparent" />
      </main>
    );
  }

  const lockMsg =
    mode === "manage" && !canChange && lockedUntil
      ? `You can change your goal again on ${lockedUntil.toLocaleDateString()}.`
      : "Whatever you pick (weekly or monthly), you can only change it after 30 days. If you don't meet the goal, you lose the bonus, so pick what you truly believe you can achieve.";

  const canSubmit =
    Boolean(selected) &&
    (mode === "onboarding" || (mode === "manage" && canChange));

  return (
    <main className="min-h-screen">
      <div className="grid min-h-[100svh] grid-cols-1 md:grid-cols-2">
        {/* LEFT */}
        <section className="bg-white px-6 py-10 sm:px-10 md:px-14 md:py-16">
          <h1 className="text-[34px] font-extrabold leading-tight">
            Set Your Earning Goal
          </h1>
          <p className="mt-2 max-w-prose text-sm text-slate-600">{lockMsg}</p>

          {/* Toggle */}
          <div className="mt-6 inline-flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => (canChange ? setTab("weekly") : null)}
              disabled={!canChange && tab !== "weekly"}
              className={`rounded-full px-5 py-2 text-sm font-medium ${
                tab === "weekly" ? "bg-white shadow" : "text-slate-600"
              } ${!canChange && tab !== "weekly" ? "opacity-50" : ""}`}
            >
              Weekly
            </button>
            <button
              onClick={() => (canChange ? setTab("monthly") : null)}
              disabled={!canChange && tab !== "monthly"}
              className={`rounded-full px-5 py-2 text-sm font-medium ${
                tab === "monthly" ? "bg-white shadow" : "text-slate-600"
              } ${!canChange && tab !== "monthly" ? "opacity-50" : ""}`}
            >
              Monthly
            </button>
          </div>

          {/* Tiers */}
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {tiers[tab].map((t) => {
              const isSelected = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => (canChange ? setSelected(t.id) : null)}
                  disabled={!canChange}
                  className={[
                    "text-left rounded-2xl border p-5 shadow-[0_10px_28px_rgba(16,24,40,0.06)] transition",
                    isSelected
                      ? "border-[#2B78FF] ring-2 ring-[#2B78FF] bg-[#EAF2FF]"
                      : "border-slate-200 bg-white hover:border-[#BFD7FF]",
                    (t as any).span2 ? "md:col-span-2" : "",
                    !canChange ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  <div className="mb-2 flex items-center gap-2 text-slate-700">
                    {t.badge}
                    <span className="text-sm font-semibold">{t.title}</span>
                    {isSelected && (
                      <span className="ml-auto rounded-full bg-[#2B78FF] px-2 py-0.5 text-[11px] font-semibold text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold">{t.bonus}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {t.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={onPrimary}
              disabled={!canSubmit || saving}
              className="inline-flex rounded-full bg-[#0068FF] px-7 py-3 text-sm font-medium text-white shadow hover:bg-[#0657D0] focus:outline-none focus:ring-2 focus:ring-[#0068FF]/30 disabled:opacity-50"
            >
              {saving
                ? mode === "onboarding"
                  ? "Creating Account..."
                  : "Saving…"
                : mode === "onboarding"
                ? "Done"
                : "Update Goal"}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-800"
            >
              {mode === "onboarding" ? "Back" : "Cancel"}
            </button>
          </div>
        </section>

        {/* RIGHT — blue pane */}
        <aside className="relative overflow-hidden bg-[#0068FF]">
          <p className="absolute right-8 top-20 max-w-xs text-right text-lg font-semibold leading-relaxed text-white md:right-14">
            Quick and Easy Setup
            <br />
            <span className="text-white/90">no heavy paperwork</span>
          </p>

          <div className="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2">
            <div className="relative grid place-items-center text-white">
              <div className="absolute h-64 w-64 rounded-full border-2 border-white/30" />
              <FloatingCards />
            </div>
          </div>

          <div className="absolute bottom-12 right-6 md:right-10">
            <ShieldMonitor />
          </div>

          <div className="absolute bottom-40 right-12 max-w-xs text-right text-[15px] font-semibold leading-relaxed text-white">
            Secure Account, your details are protected with
            <br />
            bank grade security
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ---------- tiny icons ---------- */
function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#2B78FF]"
      fill="currentColor"
    >
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
    </svg>
  );
}
function MedalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-white">
      <circle cx="12" cy="10" r="4" fill="currentColor" />
      <path d="M8 2h8l-2 6h-4z" fill="currentColor" opacity=".7" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-amber-500"
      fill="currentColor"
    >
      <path d="M3 7l4 3 5-6 5 6 4-3v10H3z" />
    </svg>
  );
}
function FloatingCards() {
  return (
    <svg viewBox="0 0 220 90" className="h-24 w-auto text-white">
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.95">
        <rect
          x="15"
          y="20"
          rx="6"
          ry="6"
          width="90"
          height="38"
          fill="currentColor"
          opacity="0.14"
        />
        <rect
          x="120"
          y="8"
          rx="6"
          ry="6"
          width="70"
          height="28"
          fill="currentColor"
          opacity="0.14"
        />
        <rect
          x="130"
          y="48"
          rx="6"
          ry="6"
          width="60"
          height="22"
          fill="currentColor"
          opacity="0.14"
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
