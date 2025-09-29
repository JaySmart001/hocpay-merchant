"use client";

import { useMemo, useState } from "react";

type Tx = {
  id: string;
  date: string;
  refName: string;
  amount: number;
  type: "Airtime" | "Data" | "Betting" | "Bank Transfer" | "Electricity" | "TV";
  earned: number;
  status: "Successful" | "Failed";
};

const NGN = (n: number) =>
  "₦" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const MOCK: Tx[] = [
  {
    id: "79122083",
    date: "2023-08-03T00:10:00",
    refName: "Miles, Esther",
    amount: 115500,
    type: "Airtime",
    earned: 78000,
    status: "Successful",
  },
  {
    id: "79122083-2",
    date: "2023-01-11T13:49:00",
    refName: "Black, Marvin",
    amount: 64500,
    type: "Data",
    earned: 114000,
    status: "Successful",
  },
  {
    id: "79241079",
    date: "2023-11-04T00:13:00",
    refName: "Flores, Juanita",
    amount: 25500,
    type: "Betting",
    earned: 57500,
    status: "Successful",
  },
  {
    id: "79212083",
    date: "2023-03-13T08:05:00",
    refName: "Black, Marvin",
    amount: 85500,
    type: "Bank Transfer",
    earned: 76500,
    status: "Successful",
  },
  {
    id: "79214079",
    date: "2023-09-04T00:14:00",
    refName: "Flores, Juanita",
    amount: 102000,
    type: "Data",
    earned: 35500,
    status: "Successful",
  },
  {
    id: "79181698",
    date: "2023-02-21T15:05:00",
    refName: "Flores, Juanita",
    amount: 67000,
    type: "Airtime",
    earned: 13000,
    status: "Successful",
  },
  {
    id: "79212231",
    date: "2023-01-11T13:49:00",
    refName: "Cooper, Kristin",
    amount: 58500,
    type: "Bank Transfer",
    earned: 17500,
    status: "Successful",
  },
  {
    id: "79181601",
    date: "2023-10-13T08:05:00",
    refName: "Cooper, Kristin",
    amount: 107000,
    type: "Betting",
    earned: 3000,
    status: "Successful",
  },
  {
    id: "79214079-2",
    date: "2023-02-21T15:05:00",
    refName: "Flores, Juanita",
    amount: 92500,
    type: "Airtime",
    earned: 8500,
    status: "Successful",
  },
  {
    id: "79214204",
    date: "2023-11-04T00:13:00",
    refName: "Black, Marvin",
    amount: 104000,
    type: "Data",
    earned: 53000,
    status: "Successful",
  },
  {
    id: "79181698-2",
    date: "2023-10-13T08:05:00",
    refName: "Flores, Juanita",
    amount: 54500,
    type: "Airtime",
    earned: 20500,
    status: "Failed",
  },
  {
    id: "79212231-2",
    date: "2023-01-01T13:49:00",
    refName: "Nguyen, Shane",
    amount: 45000,
    type: "TV",
    earned: 9800,
    status: "Failed",
  },
];

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | "Successful" | "Failed">("All");
  const [month, setMonth] = useState<"All" | number>("All");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(() => {
    let list = [...MOCK];
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (t) =>
          t.id.includes(q) ||
          t.refName.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
      );
    if (status !== "All") list = list.filter((t) => t.status === status);
    if (month !== "All")
      list = list.filter((t) => new Date(t.date).getMonth() === month);
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    return list;
  }, [query, status, month]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);
  if (page > totalPages) setPage(1);

  const k_total = MOCK.length;
  const k_success = MOCK.filter((t) => t.status === "Successful").length;
  const k_failed = MOCK.filter((t) => t.status === "Failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-sm text-slate-500">
          Track all referral transactions in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi title="Total Transactions" value={k_total.toLocaleString()} />
        <Kpi
          title="Total Successful Transactions"
          value={k_success.toLocaleString()}
        />
        <Kpi
          title="Total Failed Transactions"
          value={k_failed.toLocaleString()}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by transaction id, name or type"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v as "All" | "Successful" | "Failed");

              setPage(1);
            }}
            options={[
              { label: "All", value: "All" },
              { label: "Successful", value: "Successful" },
              { label: "Failed", value: "Failed" },
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <Th>Date and Time</Th>
              <Th>Transaction ID</Th>
              <Th>Referral Name</Th>
              <Th className="text-right">Transaction Amount</Th>
              <Th>Transaction Type</Th>
              <Th className="text-right">Cashback Earned</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {current.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/60">
                <Td>{formatDateTime(t.date)}</Td>
                <Td>{t.id}</Td>
                <Td className="text-slate-900">{t.refName}</Td>
                <Td className="text-right">{NGN(t.amount)}</Td>
                <Td>{t.type}</Td>
                <Td className="text-right">{NGN(t.earned)}</Td>
                <Td>
                  <span
                    className={classNames(
                      t.status === "Successful"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    )}
                  >
                    {t.status}
                  </span>
                </Td>
              </tr>
            ))}
            {current.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} –{" "}
          {Math.min(page * pageSize, filtered.length)} of {filtered.length}{" "}
          transactions
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

/* ---------- bits ---------- */

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function classNames2(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={classNames2("px-4 py-2 font-medium", className)}>
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
    <td className={classNames2("px-4 py-3 align-middle", className)}>
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
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 9);
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
        {pages.map((p) => (
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
        ))}
        {totalPages > pages.length && (
          <span className="px-1 text-slate-400">…</span>
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
