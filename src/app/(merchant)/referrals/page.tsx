"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query as fsQuery,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { getFirebase } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";

type Referral = {
  id: string;
  joinedAt: string;
  name: string;
  totalTx: number;
  cashback: number;
  status: "Active" | "Inactive";
};

type ReferralFS = {
  name?: string;
  joinedAt?: { toDate?: () => Date };
  createdAt?: { toDate?: () => Date };
  totalTx?: number;
  cashback?: number;
  isActive?: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return "₦" + amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export default function ReferralsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allReferrals, setAllReferrals] = useState<Referral[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "Inactive">("Active");
  const [month, setMonth] = useState<"All" | number>("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const { auth, db } = getFirebase();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }

      try {
        const referralsQuery = fsQuery(
          collection(db, "merchants", user.uid, "referrals"),
          orderBy("joinedAt", "desc")
        );

        const snapshot = await getDocs(referralsQuery);
        const refs: Referral[] = [];

        snapshot.forEach((snap) => {
          const data = snap.data() as ReferralFS;
          const joinedAt =
            data.joinedAt?.toDate?.() ||
            data.createdAt?.toDate?.() ||
            new Date();
          const isActive = data.isActive === true;

          refs.push({
            id: snap.id,
            name: data.name || "Unknown User",
            joinedAt: joinedAt.toISOString(),
            totalTx: Number(data.totalTx || 0),
            cashback: Number(data.cashback || 0),
            status: isActive ? "Active" : "Inactive",
          });
        });

        setAllReferrals(refs);
      } catch (error) {
        console.error("Error fetching referrals:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const k_totalReferrals = allReferrals.length;
  const k_activeReferrals = allReferrals.filter(
    (r) => r.status === "Active"
  ).length;
  const k_totalTransactions = allReferrals.reduce((s, r) => s + r.totalTx, 0);
  const k_totalCashback = allReferrals.reduce((s, r) => s + r.cashback, 0);

  const filtered = useMemo(() => {
    let list = [...allReferrals];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    if (status !== "All") list = list.filter((r) => r.status === status);
    if (month !== "All") {
      list = list.filter((r) => new Date(r.joinedAt).getMonth() === month);
    }
    list.sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1));
    return list;
  }, [allReferrals, search, status, month]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [page, totalPages]);

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
        <h1 className="text-2xl font-semibold">Referrals</h1>
        <p className="text-sm text-slate-500">
          Track your referrals and cashback performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi title="Active Referrals" value={k_activeReferrals.toString()} />
        <Kpi title="Total Referrals" value={k_totalReferrals.toString()} />
        <Kpi
          title="Total Transactions"
          value={k_totalTransactions.toString()}
        />
        <Kpi
          title="Total Cashback Earned"
          value={formatCurrency(k_totalCashback)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-md">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
        </div>

        <Select
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v as "All" | "Active" | "Inactive");

            setPage(1);
          }}
          options={[
            { label: "All", value: "All" },
            { label: "Active", value: "Active" },
            { label: "Inactive", value: "Inactive" },
          ]}
        />

        <Select
          label="Month"
          value={String(month)}
          onChange={(v) => {
            setMonth(v === "All" ? "All" : Number(v));
            setPage(1);
          }}
          options={[
            { label: "All", value: "All" },
            ...Array.from({ length: 12 }).map((_, i) => ({
              label: new Date(2025, i, 1).toLocaleString(undefined, {
                month: "long",
              }),
              value: String(i),
            })),
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <Th>Date Joined</Th>
              <Th>Referral Name</Th>
              <Th className="text-right">Transactions</Th>
              <Th className="text-right">Cashback Earned</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {current.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td>{formatDate(r.joinedAt)}</Td>
                <Td className="font-medium text-slate-900">{r.name}</Td>
                <Td className="text-right">{r.totalTx}</Td>
                <Td className="text-right">{formatCurrency(r.cashback)}</Td>
                <Td>
                  <span
                    className={classNames(
                      "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                      r.status === "Active"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {r.status}
                  </span>
                </Td>
              </tr>
            ))}
            {current.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  {allReferrals.length === 0
                    ? "No referrals yet. Share your referral code to get started!"
                    : "No referrals found matching your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} –{" "}
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}{" "}
            referrals
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

/* ---------- tiny UI bits ---------- */

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={classNames("px-4 py-2 font-medium", className)}>
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={classNames("px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="text-slate-500">{label}:</span>
      <select
        className="bg-transparent outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const maxVisible = 7;
  let pages: number[] = [];

  if (totalPages <= maxVisible) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (page <= 4) {
      pages = [1, 2, 3, 4, 5, -1, totalPages];
    } else if (page >= totalPages - 3) {
      pages = [
        1,
        -1,
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    } else {
      pages = [1, -1, page - 1, page, page + 1, -1, totalPages];
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-40"
      >
        ‹
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          p === -1 ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={classNames(
                "h-8 w-8 rounded-full text-sm",
                p === page
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
