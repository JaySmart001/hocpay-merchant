"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebase } from "@/app/lib/firebase";

/** ----------- Types ----------- */
type StepKey = "basic" | "location" | "verify";

/** ----------- Helpers ----------- */
const FULLNAME_OK = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;
  return parts.every((p) => p.length >= 2);
};
const EMAIL_OK = (e: string) => /\S+@\S+\.\S+/.test(e.trim());
const PHONE_OK = (p: string) => p.trim().replace(/\D/g, "").length >= 10;
const BVN_OK = (b: string) => /^\d{11}$/.test(b.trim());

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPT_ATTR = "application/pdf,image/png,image/jpeg";
const MAX_BYTES = 5 * 1024 * 1024;

// serialize File -> (name,type,dataUrl) so we can move across pages
async function fileToSerializable(f: File) {
  const reader = new FileReader();
  const p = new Promise<{ name: string; type: string; dataUrl: string }>(
    (resolve, reject) => {
      reader.onerror = () => reject(reader.error);
      reader.onload = () =>
        resolve({ name: f.name, type: f.type, dataUrl: String(reader.result) });
    }
  );
  reader.readAsDataURL(f);
  return p;
}

/** ----------- Page ----------- */
export default function MerchantSignup() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [step, setStep] = useState<StepKey>("basic");

  // Full-screen blocking loader
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Signed-in banner
  const [signedInEmail, setSignedInEmail] = useState<string>("");

  // Form state
  const [form, setForm] = useState({
    // basic
    fullName: "",
    email: "",
    phone: "",
    // location
    address: "",
    city: "",
    state: "",
    country: "Nigeria",
    // verify
    govIdFile: null as File | null,
    utilityFile: null as File | null,
    bvn: "",
  });

  // Prefill from current session (must be signed in)
  useEffect(() => {
    const { auth, db } = getFirebase();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace(`/signin?next=${encodeURIComponent("/signup")}`);

        return;
      }
      setSignedInEmail(user.email || "");

      try {
        const usnap = await getDoc(doc(db, "users", user.uid));
        const u = usnap.data() || {};
        setForm((f) => ({
          ...f,
          fullName: (u as any).name || user.displayName || "",
          email: user.email || (u as any).email || "",
          phone: (u as any).phone || f.phone,
        }));
      } catch {
        // ignore – user can still fill missing fields
      }
    });
    return () => unsub();
  }, [router]);

  // file errors
  const [govIdErr, setGovIdErr] = useState<string | null>(null);
  const [utilityErr, setUtilityErr] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === "basic") {
      return (
        FULLNAME_OK(form.fullName) &&
        EMAIL_OK(form.email) &&
        PHONE_OK(form.phone)
      );
    }
    if (step === "location") {
      return (
        form.address.trim().length > 0 &&
        form.city.trim().length > 0 &&
        form.state.trim().length > 0
      );
    }
    if (step === "verify") {
      return (
        form.govIdFile !== null &&
        form.utilityFile !== null &&
        !govIdErr &&
        !utilityErr &&
        BVN_OK(form.bvn)
      );
    }
    return false;
  }, [form, step, govIdErr, utilityErr]);

  const next = () =>
    setStep(
      step === "basic" ? "location" : step === "location" ? "verify" : "verify"
    );
  const back = () => setStep(step === "verify" ? "location" : "basic");

  /** Final submit: store pending data locally, go to /rewards */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNext || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // serialize files so we can revive them on /rewards
      const gov = await fileToSerializable(form.govIdFile as File);
      const utl = await fileToSerializable(form.utilityFile as File);

      const pending = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country,
        bvn: form.bvn.trim(),
        files: { govId: gov, utility: utl },
        createdAt: Date.now(),
      };

      sessionStorage.setItem("hocpay.pendingSignup", JSON.stringify(pending));
      router.push("/rewards");
    } catch (err: any) {
      setSubmitError(err?.message ?? "Couldn't proceed. Please try again.");
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleSignOut = async () => {
    try {
      const { auth } = getFirebase();
      await signOut(auth);
    } finally {
      router.replace("/signin");
    }
  };

  return (
    <main className="md:h-screen md:overflow-hidden">
      <div className="grid min-h-[100svh] grid-cols-1 md:grid-cols-2">
        {/* LEFT — form */}
        <section className="bg-white px-6 py-10 sm:px-10 md:px-14 md:py-14">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-[32px]">
            Create Your Merchant Account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create an account to start earning with referrals and rewards
          </p>

          {signedInEmail && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              You’re signed in as{" "}
              <span className="font-medium">{signedInEmail}</span>.{" "}
              <button
                onClick={handleSignOut}
                className="text-[#0068FF] underline underline-offset-2"
              >
                Not you? Sign out
              </button>
            </div>
          )}

          {/* Stepper */}
          <Stepper step={step} className="mt-6" />

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            {step === "basic" && (
              <div className="space-y-5">
                <Field label="Full Name">
                  <Input
                    placeholder="e.g. Ada Lovelace"
                    value={form.fullName}
                    onChange={() => {}}
                    readOnly
                    disabled
                  />
                  {!FULLNAME_OK(form.fullName) && form.fullName.length > 0 && (
                    <p className="mt-1 text-xs text-rose-600">
                      Enter your Full name.
                    </p>
                  )}
                </Field>

                <Field label="Email Address">
                  <Input
                    type="email"
                    placeholder="e.g. ada@business.co"
                    value={form.email}
                    onChange={() => {}}
                    readOnly
                    disabled
                  />
                </Field>

                <Field label="Phone Number">
                  <Input
                    inputMode="tel"
                    placeholder="e.g. 0801 234 5678"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                  />
                </Field>
              </div>
            )}

            {step === "location" && (
              <div className="space-y-5">
                <Field label="House Address">
                  <Input
                    placeholder="Street, area"
                    value={form.address}
                    onChange={(v) => setForm({ ...form, address: v })}
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="City">
                    <Input
                      placeholder="e.g. Ikeja"
                      value={form.city}
                      onChange={(v) => setForm({ ...form, city: v })}
                    />
                  </Field>
                  <Field label="State">
                    <Input
                      placeholder="e.g. Lagos"
                      value={form.state}
                      onChange={(v) => setForm({ ...form, state: v })}
                    />
                  </Field>
                </div>

                <Field label="Country">
                  <Input
                    placeholder="Nigeria"
                    value={form.country}
                    onChange={() => {}}
                    readOnly
                    disabled
                  />
                </Field>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-6">
                <Field label="Government ID">
                  <UploadField
                    placeholder="Upload a valid government ID (PDF/JPG/PNG, max 5MB)"
                    accept={ACCEPT_ATTR}
                    maxBytes={MAX_BYTES}
                    onPick={(file, err) => {
                      setGovIdErr(err);
                      setForm((f) => ({ ...f, govIdFile: err ? null : file }));
                    }}
                    fileName={form.govIdFile?.name}
                    error={govIdErr ?? undefined}
                  />
                </Field>

                <Field label="BVN">
                  <Input
                    inputMode="numeric"
                    placeholder="Enter a valid 11-digit bvn"
                    value={form.bvn}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        bvn: v.replace(/\D/g, "").slice(0, 11),
                      })
                    }
                  />
                  <div className="mt-1.5 flex items-start gap-2 text-xs text-slate-500">
                    <span
                      aria-hidden
                      className="mt-0.5 inline-block h-4 w-4 rounded-full border border-slate-300 text-center leading-4"
                    >
                      i
                    </span>
                    <span>
                      {" "}
                      Your BVN is only used to verify your identity and secure
                      your account{" "}
                    </span>
                  </div>
                </Field>

                <Field label="Utility Bill">
                  <UploadField
                    placeholder="Upload either water or electricity bill (PDF/JPG/PNG, max 5MB)"
                    accept={ACCEPT_ATTR}
                    maxBytes={MAX_BYTES}
                    onPick={(file, err) => {
                      setUtilityErr(err);
                      setForm((f) => ({
                        ...f,
                        utilityFile: err ? null : file,
                      }));
                    }}
                    fileName={form.utilityFile?.name}
                    error={utilityErr ?? undefined}
                  />
                </Field>
              </div>
            )}

            {/* Actions */}
            <div className="mt-2 flex items-center justify-between">
              {step !== "basic" ? (
                <button
                  type="button"
                  onClick={back}
                  className="rounded-full px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}

              {step !== "verify" ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext}
                  className="rounded-full bg-[#0068FF] px-10 py-3 text-sm font-medium text-white shadow disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || !canNext}
                  className="rounded-full bg-[#0068FF] px-10 py-3 text-sm font-medium text-white shadow disabled:opacity-50"
                >
                  Continue
                </button>
              )}
            </div>

            <p className="text-center text-xs text-slate-500">
              Already a Merchant?{" "}
              <a href="/signin" className="text-[#0068FF] hover:underline">
                Sign In
              </a>
            </p>
          </form>
        </section>

        {/* RIGHT — blue panel */}
        <aside className="relative bg-[#0068FF]">
          <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2">
            <div className="relative mx-auto grid w-[min(90vw,640px)] place-items-center text-white">
              <div className="absolute h-64 w-64 rounded-full border-2 border-white/30" />
              <FloatingCards />
            </div>
          </div>

          <p className="absolute right-8 top-24 max-w-xs text-right text-lg font-semibold leading-relaxed text-white md:right-16">
            Quick and Easy Setup
            <br />
            <span className="text-white/90">no heavy paperwork</span>
          </p>

          <div className="absolute bottom-12 right-6 md:right-10">
            <ShieldMonitor />
          </div>
        </aside>
      </div>

      {/* blocking overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/90 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow">
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-[#0068FF] border-t-transparent" />
            <p className="text-sm text-slate-700">Preparing the next step…</p>
            {submitError && (
              <p className="mt-3 text-xs font-medium text-rose-600">
                {submitError}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- Small UI bits ---------- */

function Stepper({
  step,
  className = "",
}: {
  step: StepKey;
  className?: string;
}) {
  const order: StepKey[] = ["basic", "location", "verify"];
  const labels: Record<StepKey, string> = {
    basic: "Basic Information",
    location: "Location Information",
    verify: "Verification",
  };
  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-center gap-6">
          {order.map((k, i) => {
            const active = step === k;
            const passed = order.indexOf(step) > i;
            return (
              <div key={k} className="flex flex-1 items-center gap-3">
                <span
                  className={[
                    "grid h-4 w-4 place-items-center rounded-full ring-2",
                    active
                      ? "bg-[#0068FF] ring-[#0068FF]"
                      : passed
                      ? "bg-[#E7F0FF] ring-[#A5C4FF]"
                      : "bg-white ring-slate-200",
                  ].join(" ")}
                >
                  <span className="sr-only">{labels[k]}</span>
                </span>
                <span className="text-xs text-slate-500">{labels[k]}</span>
                {i < order.length - 1 && (
                  <span className="ml-auto mr-2 h-px flex-1 bg-slate-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  readOnly,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#0068FF] focus:ring-2 focus:ring-[#0068FF]/20",
        disabled ? "cursor-not-allowed opacity-70" : "",
      ].join(" ")}
    />
  );
}

function UploadField({
  placeholder,
  onPick,
  fileName,
  accept,
  maxBytes = MAX_BYTES,
  error,
}: {
  placeholder: string;
  onPick: (file: File | null, error: string | null) => void;
  fileName?: string;
  accept?: string;
  maxBytes?: number;
  error?: string;
}) {
  const id = `upl_${Math.random().toString(36).slice(2)}`;

  function validate(f: File): string | null {
    if (!ALLOWED_MIME.includes(f.type)) {
      return "Unsupported file type. Use PDF, JPG or PNG.";
    }
    if (f.size > maxBytes) {
      return "File too large. Max 5MB.";
    }
    return null;
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-500 hover:bg-slate-50"
      >
        <span className="grid h-6 w-6 place-items-center rounded-lg border border-slate-200">
          ⬆️
        </span>
        <span className="truncate">{fileName ? fileName : placeholder}</span>
      </label>
      <input
        id={id}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (!f) {
            onPick(null, null);
            return;
          }
          const err = validate(f);
          onPick(err ? null : f, err);
        }}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/* ---------- Illustrations ---------- */
function FloatingCards() {
  return (
    <svg viewBox="0 0 220 90" className="relative z-10 h-28 w-auto text-white">
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
