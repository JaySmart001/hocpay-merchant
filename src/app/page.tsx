import Link from "next/link";

export default function Landing() {
  return (
    <main className="md:h-screen md:overflow-hidden">
      <div className="grid min-h-[100svh] grid-cols-1 md:grid-cols-2">
        <section className="bg-white px-6 py-10 sm:px-10 md:px-14 md:py-14">
          <h1 className="text-[34px] font-extrabold leading-tight sm:text-[40px]">
            Make Every Transaction{" "}
            <span className="text-slate-900">Rewarding.</span>
          </h1>

          <p className="mt-4 max-w-[56ch] text-[15px] text-slate-600">
            Join as a merchant to enjoy cashbacks on payments and extra bonuses
            for every referral.
          </p>

          <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-800">
              How it Works
            </h2>
            <ol className="mt-7 flex items-center gap-7 text-center text-slate-600">
              <Step icon={<UserIcon />} label="Sign Up" />
              <Arrow />
              <Step icon={<GiftIcon />} label="Set Up Rewards" />
              <Arrow />
              <Step icon={<CoinIcon />} label="Start Earning" />
            </ol>
          </div>

          <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-800">Why Join?</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Feature
                icon={<CoinIcon />}
                title="Earn from referral Transactions"
              />
              <Feature icon={<ChartIcon />} title="Lifetime Cashback Growth" />
              <Feature
                icon={<PassiveIcon />}
                title="Build a Passive Income Stream"
              />
            </div>
          </div>

          <div className="mt-10">
            <Link
              href="/signin?next=/signup"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#0068FF] px-8 py-3 text-[15px] font-medium text-white shadow hover:bg-[#0657D0] focus:outline-none focus:ring-2 focus:ring-[#0068FF]/40 sm:w-auto"
            >
              Get Started
            </Link>
          </div>
        </section>

        <aside className="relative bg-[#0068FF]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="mx-auto grid w-[min(90vw,640px)] place-items-center text-white">
              <div className="absolute h-64 w-64 rounded-full border-2 border-white/30" />
              <FloatingCards />
            </div>
          </div>

          <p className="absolute right-8 top-20 max-w-xs text-right text-xl font-semibold leading-relaxed text-white md:right-16 md:top-24">
            Quick and Easy Setup
            <br />
            <span className="text-white/90">no heavy paperwork</span>
          </p>

          <div className="absolute bottom-10 right-6 md:right-10">
            <ShieldMonitor />
          </div>
        </aside>
      </div>
    </main>
  );
}

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex flex-col items-center gap-2">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#E7F0FF] text-[#0068FF] ring-1 ring-white/60">
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </li>
  );
}

function Arrow() {
  return <span className="hidden text-2xl text-[#0068FF]/60 sm:block">→</span>;
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 shadow-[0_2px_10px_rgba(16,24,40,0.04)]">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#E7F0FF] text-[#0068FF]">
        {icon}
      </div>
      <div className="text-[15px] font-medium text-slate-800">{title}</div>
    </div>
  );
}

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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <circle cx="12" cy="8" r="3" fill="currentColor" />
      <path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="3" y="8" width="18" height="13" rx="2" fill="currentColor" />
      <path d="M12 8v13M3 12h18" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <ellipse cx="12" cy="7" rx="7" ry="3" fill="currentColor" />
      <path
        d="M5 7v7c0 1.7 3.1 3 7 3s7-1.3 7-3V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M4 20V10M10 20V6M16 20V12"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function PassiveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" />
      <path d="M6 9h12M6 13h8" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
