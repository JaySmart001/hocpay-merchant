"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  getCountFromServer,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebase } from "@/app/lib/firebase";

type PeriodMode = "weekly" | "monthly";
type TierId = "starter" | "bronze" | "gold";

type MerchantDoc = {
  fullName?: string;
  status?: "Active" | "Suspended" | "created";
  referralCode?: string;
  cashbackEarned?: number;
  rewardPlan?: {
    period?: PeriodMode;
    tier?: TierId;
    selectedAt?: Timestamp | Date;
  };
  currentCycleId?: string;
  currentCycleStart?: Timestamp | Date;
};

type CycleRecord = {
  period: PeriodMode;
  tier: TierId;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  threshold: number;
  amountDue: number;
  payoutStatus: "paid" | "unpaid";
};

type ReferralDoc = {
  name?: string;
  joinedAt?: Timestamp | Date;
  createdAt?: Timestamp | Date;
  cashback?: number;
  isActive?: boolean;
};

type RecentReferral = {
  id: string;
  date: string;
  name: string;
  status: "Active";
};

type UserDoc = {
  wallet?: {
    balance?: number;
  };
} & Record<string, unknown>;

const WEEKLY_THRESHOLDS: Record<TierId, number> = {
  starter: 5,
  bronze: 10,
  gold: 30,
};
const MONTHLY_THRESHOLDS: Record<TierId, number> = {
  starter: 20,
  bronze: 101,
  gold: 1000,
};

async function countAll(
  refCol: ReturnType<typeof collection>,
  ...constraints: QueryConstraint[]
): Promise<number> {
  try {
    const c = await getCountFromServer(query(refCol, ...constraints));
    return c.data().count;
  } catch {
    try {
      const snap = await getDocs(query(refCol, ...constraints));
      return snap.size;
    } catch {
      return 0;
    }
  }
}

async function countActive(
  refCol: ReturnType<typeof collection>,
  ...constraints: QueryConstraint[]
): Promise<number> {
  try {
    const c = await getCountFromServer(
      query(refCol, where("isActive", "==", true), ...constraints)
    );
    return c.data().count;
  } catch {
    try {
      const snap = await getDocs(query(refCol, ...constraints));
      let n = 0;
      snap.forEach((d) => {
        const data = d.data() as ReferralDoc;
        if (data?.isActive === true) n++;
      });
      return n;
    } catch {
      return 0;
    }
  }
}

async function sumActiveCashback(
  refCol: ReturnType<typeof collection>,
  ...constraints: QueryConstraint[]
): Promise<number> {
  try {
    const q1 = query(refCol, where("isActive", "==", true), ...constraints);
    const snap = await getDocs(q1);
    let sum = 0;
    snap.forEach((d) => {
      sum += Number((d.data() as ReferralDoc).cashback || 0);
    });
    return sum;
  } catch {
    try {
      const snap = await getDocs(query(refCol, ...constraints));
      let sum = 0;
      snap.forEach((d) => {
        const x = d.data() as ReferralDoc;
        if (x.isActive === true) sum += Number(x.cashback || 0);
      });
      return sum;
    } catch {
      return 0;
    }
  }
}

async function recentActive(
  refCol: ReturnType<typeof collection>,
  take: number
): Promise<RecentReferral[]> {
  try {
    const q1 = query(
      refCol,
      where("isActive", "==", true),
      orderBy("joinedAt", "desc"),
      limit(take)
    );
    const snap = await getDocs(q1);
    return snap.docs.map((d) => {
      const data = d.data() as ReferralDoc;
      const joinedAt =
        ((data.joinedAt as Timestamp | Date | undefined) &&
          (data.joinedAt as Timestamp & { toDate?: () => Date })?.toDate?.()) ||
        ((data.createdAt as Timestamp | Date | undefined) &&
          (
            data.createdAt as Timestamp & { toDate?: () => Date }
          )?.toDate?.()) ||
        new Date();
      return {
        id: d.id,
        name: data.name || "Unknown",
        date: joinedAt.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        status: "Active",
      };
    });
  } catch {
    const q2 = query(refCol, orderBy("joinedAt", "desc"), limit(20));
    const snap = await getDocs(q2);
    const active = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as ReferralDoc }))
      .filter(({ data }) => data.isActive === true)
      .slice(0, take)
      .map(({ id, data }) => {
        const joinedAt =
          ((data.joinedAt as Timestamp | Date | undefined) &&
            (
              data.joinedAt as Timestamp & { toDate?: () => Date }
            )?.toDate?.()) ||
          ((data.createdAt as Timestamp | Date | undefined) &&
            (
              data.createdAt as Timestamp & { toDate?: () => Date }
            )?.toDate?.()) ||
          new Date();
        return {
          id,
          name: data.name || "Unknown",
          date: joinedAt.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          status: "Active" as const,
        };
      });
    return active;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState<string>("Merchant");
  const [status, setStatus] = useState<"Active" | "Suspended" | "created">(
    "created"
  );
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [totalCashback, setTotalCashback] = useState(0);
  const [monthlyCashback, setMonthlyCashback] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalActiveReferrals, setTotalActiveReferrals] = useState(0);
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([]);

  const [goalTarget, setGoalTarget] = useState(0);
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalPeriodLabel, setGoalPeriodLabel] = useState<"Week" | "Month">(
    "Week"
  );

  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const { auth, db } = getFirebase();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }

      try {
        const msnap = await getDoc(doc(db, "merchants", user.uid));
        if (!msnap.exists()) {
          router.replace("/signup");
          return;
        }
        const m = (msnap.data() || {}) as MerchantDoc;

        const display =
          m.fullName || user.displayName || user.email || "Merchant";
        setName(display);
        setStatus(m.status || "created");
        setReferralCode(m.referralCode || null);
        setTotalCashback(Number(m.cashbackEarned || 0));

        if (m.referralCode) {
          const base =
            process.env.NEXT_PUBLIC_INVITE_BASE ||
            (typeof window !== "undefined" ? window.location.origin : "");
          setShareLink(`${base}/r/${m.referralCode}`);
        }

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const u = userDoc.data() as UserDoc;
            let balance = 0;
            const walletField = u.wallet;
            if (walletField && typeof walletField === "object") {
              balance = Number(walletField.balance || 0);
            } else if (
              typeof (u as Record<string, unknown>)["wallet.balance"] ===
              "number"
            ) {
              balance = Number(
                (u as Record<string, unknown>)["wallet.balance"]
              );
            }
            setWalletBalance(balance);
          }
        } catch (e) {
          console.error("Error fetching wallet:", e);
        }

        const refCol = collection(db, "merchants", user.uid, "referrals");

        const allTotal = await countAll(refCol);
        setTotalReferrals(allTotal);

        const activeTotal = await countActive(refCol);
        setTotalActiveReferrals(activeTotal);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        );

        const monthCash = await sumActiveCashback(
          refCol,
          where("joinedAt", ">=", Timestamp.fromDate(monthStart)),
          where("joinedAt", "<", Timestamp.fromDate(nextMonthStart))
        );
        setMonthlyCashback(monthCash);

        setRecentReferrals(await recentActive(refCol, 5));

        let computedTarget = 0;
        let computedProgress = 0;
        let periodLabel: "Week" | "Month" = "Week";

        if (m.currentCycleId) {
          const cycleSnap = await getDoc(
            doc(db, "merchants", user.uid, "cycles", m.currentCycleId)
          );
          if (cycleSnap.exists()) {
            const c = cycleSnap.data() as CycleRecord;
            const startTs = c.startDate as Timestamp;
            const endTs = c.endDate as Timestamp;

            const count = await countActive(
              refCol,
              where("joinedAt", ">=", startTs),
              where("joinedAt", "<", endTs)
            );

            computedTarget = Number(c.threshold || 0);
            computedProgress = count;
            periodLabel = c.period === "monthly" ? "Month" : "Week";
          }
        }

        if (
          computedTarget === 0 &&
          m.rewardPlan?.period &&
          m.rewardPlan?.tier
        ) {
          const period = m.rewardPlan.period;
          const tier = m.rewardPlan.tier;

          if (period === "weekly") {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const count = await countActive(
              refCol,
              where("joinedAt", ">=", Timestamp.fromDate(weekStart))
            );

            computedTarget = WEEKLY_THRESHOLDS[tier] || 0;
            computedProgress = count;
            periodLabel = "Week";
          } else {
            const monthActiveCount = await countActive(
              refCol,
              where("joinedAt", ">=", Timestamp.fromDate(monthStart)),
              where("joinedAt", "<", Timestamp.fromDate(nextMonthStart))
            );
            computedTarget = MONTHLY_THRESHOLDS[tier] || 0;
            computedProgress = monthActiveCount;
            periodLabel = "Month";
          }
        }

        setGoalTarget(computedTarget);
        setGoalProgress(computedProgress);
        setGoalPeriodLabel(periodLabel);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const firstName = useMemo(() => (name || "Merchant").split(/\s+/)[0], [name]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  const formatCurrency = (amount: number) =>
    "₦" +
    Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A66FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back {firstName}! 👋</h1>
        <p className="text-sm text-slate-600">
          Keep inviting friends and watch your cashback grow.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-700">
              Wallet Balance
            </h3>
            <div className="mt-2 text-3xl font-bold text-[#0A66FF]">
              {formatCurrency(walletBalance)}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            Available for withdrawal
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-slate-700">
          Your Referral Code
        </h3>

        {status !== "Active" ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your merchant account is under review. Once you&#39;re verified,
            your referral code will appear here.
          </div>
        ) : referralCode ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Code
              </span>
              <span className="rounded-md bg-slate-900 px-3 py-1.5 font-mono text-lg font-semibold text-white">
                {referralCode}
              </span>
              <button
                onClick={() => copy(referralCode)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {shareLink && (
              <div className="text-xs text-slate-600">
                Share link:{" "}
                <a
                  href={shareLink}
                  className="break-all font-medium text-[#0A66FF] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {shareLink}
                </a>
                <button
                  onClick={() => copy(shareLink)}
                  className="ml-2 rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            You are verified, but we couldn&#39;t find a referral code yet.
            Please contact support to generate one.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi title="Lifetime Earnings" value={formatCurrency(totalCashback)} />
        <Kpi
          title="This Month&#39;s Cashback (Active)"
          value={formatCurrency(monthlyCashback)}
        />
        <Kpi title="Total Referrals" value={totalReferrals.toString()} />
        <Kpi
          title="Total Active Referrals"
          value={totalActiveReferrals.toString()}
        />
      </div>

      {goalTarget > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-slate-700">
            Referral Target
          </h3>
          <div className="mt-3 text-4xl font-bold text-slate-900">
            {goalTarget}
          </div>
          <div className="text-sm text-slate-500">
            Referrals / {goalPeriodLabel}
          </div>

          <div className="mt-4 text-xs text-slate-600">
            {goalProgress} Achieved
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#0A66FF]"
              style={{
                width: `${Math.min(100, (goalProgress / goalTarget) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 text-right text-xs text-slate-500">
            {Math.round((goalProgress / goalTarget) * 100)}% progress
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Counts only <b>active</b> referrals inside the current cycle’s date
            range. Progress resets when a new cycle starts.
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-700">
          Recent Referrals (Active)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Date Joined</th>
                <th className="px-4 py-2 font-medium">Referral Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recentReferrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">
                    <span className="text-[#0A66FF]">{r.status}</span>
                  </td>
                </tr>
              ))}
              {recentReferrals.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No active referrals yet. Share your code to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Card>
  );
}
