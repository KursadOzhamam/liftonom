"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import RevenueChart from "@/components/RevenueChart";
import {
  Building2, ArrowUpDown, AlertTriangle, Wrench, CalendarDays, TrendingUp,
  Wallet, Landmark, CreditCard, Banknote, FileText, ChevronRight, Crown,
  Plus, HandCoins, BarChart3, Clock, ShieldAlert, type LucideIcon,
} from "lucide-react";

type Overview = {
  user: { name: string };
  firm: { name: string };
  plan: { code: string; expires_at: string | null; days_left: number | null; sms_balance: number };
  counts: {
    buildings: number; buildings_this_month: number;
    elevators: number; elevators_this_month: number;
    open_faults: number; urgent_faults: number;
    planned_maintenance: number; upcoming_week: number;
  };
  revenue: { today: number; week: number; month: number };
  cashboxes: { id: number; name: string; type: string; balance: number; today: number; month: number }[];
  checks: { portfolio_count: number; portfolio_amount: number; due_soon_count: number; due_soon_amount: number; bounced_count: number };
};
type Maint = { id: number; planned_date: string | null; elevator?: { name: string } | null };
type Fault = { id: number; priority: string; description: string; elevator?: { name: string } | null };

const PRIO: Record<string, string> = { urgent: "Acil", high: "Yüksek", normal: "Normal", low: "Düşük" };
const PLAN_LABELS: Record<string, string> = { trial: "Deneme", baslangic: "Başlangıç", pro: "Pro", kurumsal: "Kurumsal" };

function greetingText() {
  const h = new Date().getHours();
  return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
}

export default function DashboardPage() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [greet, setGreet] = useState("Merhaba");
  const [maint, setMaint] = useState<Maint[]>([]);
  const [maintScope, setMaintScope] = useState<"mine" | "all">("all");
  const [faults, setFaults] = useState<Fault[]>([]);

  useEffect(() => { setGreet(greetingText()); }, []);
  useEffect(() => { api<Overview>("/dashboard/overview").then(setOv).catch(() => {}); }, []);
  useEffect(() => {
    api<Fault[]>("/dashboard/open-faults").then(setFaults).catch(() => {});
  }, []);
  useEffect(() => {
    api<Maint[]>(`/dashboard/upcoming-maintenance${maintScope === "mine" ? "?mine=true" : ""}`).then(setMaint).catch(() => {});
  }, [maintScope]);

  return (
    <div className="space-y-6">
      {/* 1 · Karşılama banner */}
      {ov ? <WelcomeBanner ov={ov} greet={greet} /> : <div className="h-28 animate-pulse rounded-2xl bg-card shadow-card" />}

      {/* 2 · KPI kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {ov ? (
          <>
            <Stat icon={Building2} color="var(--color-primary)" value={ov.counts.buildings} label="Binalar"
              sub={ov.counts.buildings_this_month > 0 ? `+${ov.counts.buildings_this_month} bu ay` : "Bu ay yeni yok"}
              good={ov.counts.buildings_this_month > 0} href="/buildings" />
            <Stat icon={ArrowUpDown} color="var(--color-info)" value={ov.counts.elevators} label="Asansörler"
              sub={ov.counts.elevators_this_month > 0 ? `+${ov.counts.elevators_this_month} bu ay` : "Bu ay yeni yok"}
              good={ov.counts.elevators_this_month > 0} href="/elevators" />
            <Stat icon={AlertTriangle} color="var(--color-danger)" value={ov.counts.open_faults} label="Açık Arızalar"
              sub={ov.counts.urgent_faults > 0 ? `${ov.counts.urgent_faults} acil` : "Acil yok"}
              bad={ov.counts.urgent_faults > 0} href="/faults" />
            <Stat icon={Wrench} color="var(--color-warning)" value={ov.counts.planned_maintenance} label="Planlı Bakım"
              sub="Firma geneli" href="/maintenance" />
            <Stat icon={CalendarDays} color="var(--color-success)" value={ov.counts.upcoming_week} label="Yaklaşan 7 Gün"
              sub="Takvimi aç →" href="/maintenance/calendar" />
          </>
        ) : (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-card shadow-card" />)
        )}
      </div>

      {/* 3 · Hasılat özeti + Çek & Senet */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><RevenueSummary ov={ov} /></div>
        <ChecksCard ov={ov} />
      </div>

      {/* 4 · Grafik + Hızlı işlemler */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><RevenueChart /></div>
        <QuickActions />
      </div>

      {/* 5 · Bekleyen bakımlar + Açık arızalar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Bekleyen Bakımlar" action={
          <div className="flex rounded-lg border border-line p-0.5 text-xs">
            <button onClick={() => setMaintScope("mine")} className={`rounded-md px-2.5 py-1 font-medium transition ${maintScope === "mine" ? "bg-primary text-white" : "text-muted hover:text-ink"}`}>Bana Atanmış</button>
            <button onClick={() => setMaintScope("all")} className={`rounded-md px-2.5 py-1 font-medium transition ${maintScope === "all" ? "bg-primary text-white" : "text-muted hover:text-ink"}`}>Firma Tümü</button>
          </div>
        }>
          {maint.length === 0 ? (
            <Empty>Bu kapsamda bekleyen bakım yok.</Empty>
          ) : maint.map((m) => (
            <Row key={m.id} icon={<Wrench size={15} className="text-warning" />} left={m.elevator?.name ?? "—"}
              right={<span className="text-xs font-medium text-ink-soft">{dateTR(m.planned_date)}</span>} />
          ))}
        </Panel>

        <Panel title="Açık Arızalar" action={<Link href="/faults" className="text-sm font-medium text-primary hover:underline">Tümü →</Link>}>
          {faults.length === 0 ? (
            <Empty>Açık arıza yok — harika gidiyorsunuz! 🎉</Empty>
          ) : faults.map((f) => (
            <Row key={f.id} icon={<AlertTriangle size={15} className="text-danger" />}
              left={f.elevator?.name ?? "—"} sub={f.description}
              right={<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.priority === "urgent" ? "bg-danger/10 text-danger" : "bg-surface text-muted"}`}>{PRIO[f.priority] ?? f.priority}</span>} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Karşılama banner ---------- */
function WelcomeBanner({ ov, greet }: { ov: Overview; greet: string }) {
  const planLabel = PLAN_LABELS[ov.plan.code] ?? ov.plan.code;
  const isTrial = ov.plan.days_left != null;
  return (
    <div className="pop-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12203C] via-[#1B2C4F] to-[#122E4A] p-5 text-white shadow-pop sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-lg font-bold uppercase backdrop-blur">
            {ov.firm.name?.[0] ?? "?"}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-white/70">{greet}, {ov.user.name || "yönetici"}</p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{ov.firm.name || "Firma"}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:gap-6">
          <Meta label="Paket" value={planLabel} />
          {isTrial && (
            <div className="flex items-center gap-2.5">
              <Ring value={ov.plan.days_left!} total={30} />
              <Meta label="Deneme Bitişi" value={ov.plan.expires_at ? dateTR(ov.plan.expires_at) : "—"} />
            </div>
          )}
          <Link href="/subscription" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#12203C] shadow-sm transition hover:bg-white/90">
            <Crown size={15} /> Planı Satın Al <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
function Meta({ label, value, amber }: { label: string; value: string; amber?: boolean }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-sm font-bold ${amber ? "text-amber-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
function Ring({ value, total }: { value: number; total: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / total));
  return (
    <div className="relative grid h-12 w-12 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#5EEAD4" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <div className="text-center leading-none">
        <div className="text-sm font-bold">{value}</div>
        <div className="text-[7px] font-medium uppercase tracking-wide text-white/60">gün</div>
      </div>
    </div>
  );
}

/* ---------- KPI kartı ---------- */
function Stat({ icon: Icon, color, value, label, sub, href, good, bad }: {
  icon: LucideIcon; color: string; value: number; label: string; sub: string; href: string; good?: boolean; bad?: boolean;
}) {
  return (
    <Link href={href as never} className="pop-in group rounded-2xl border border-line bg-card p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop">
      <span className="grid h-9 w-9 place-items-center rounded-xl transition group-hover:scale-110"
        style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}>
        <Icon size={17} />
      </span>
      <div className="mt-3 text-[26px] font-bold leading-none tabular-nums text-ink">{value}</div>
      <div className="mt-1.5 text-sm font-medium text-ink-soft">{label}</div>
      <div className={`mt-0.5 text-xs ${good ? "text-success" : bad ? "text-danger" : "text-muted"}`}>{sub}</div>
    </Link>
  );
}

/* ---------- Hasılat özeti ---------- */
const CASHBOX_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  bank: { label: "Banka Hesabı", icon: Landmark, color: "var(--color-info)" },
  card: { label: "Kredi Kartı", icon: CreditCard, color: "var(--color-warning)" },
  credit_card: { label: "Kredi Kartı", icon: CreditCard, color: "var(--color-warning)" },
  pos: { label: "POS", icon: CreditCard, color: "var(--color-primary)" },
  cash: { label: "Nakit Kasa", icon: Banknote, color: "var(--color-success)" },
};
function RevenueSummary({ ov }: { ov: Overview | null }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp size={16} className="text-success" /> Hasılat Özeti</h2>
        <Link href="/finance" className="text-sm font-medium text-primary hover:underline">Gün Sonu Raporu →</Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Tile label="Bugün" value={ov?.revenue.today} highlight />
        <Tile label="Bu Hafta" value={ov?.revenue.week} />
        <Tile label="Bu Ay" value={ov?.revenue.month} />
      </div>

      <div className="mt-4 divide-y divide-line">
        {!ov ? (
          <div className="py-6 text-center text-sm text-muted">Yükleniyor…</div>
        ) : ov.cashboxes.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">Henüz kasa tanımlı değil.</div>
        ) : ov.cashboxes.map((c) => {
          const m = CASHBOX_META[c.type] ?? { label: c.type, icon: Wallet, color: "var(--color-muted)" };
          return (
            <div key={c.id} className="flex items-center gap-3 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{c.name}</div>
                <div className="truncate text-xs text-muted">{m.label}</div>
              </div>
              <MiniCol label="Bugün" value={c.today} signed />
              <MiniCol label="Bu Ay" value={c.month} signed />
              <MiniCol label="Bakiye" value={c.balance} strong />
              <Link href="/cashboxes" className="btn-ghost hidden shrink-0 px-3 py-1.5 text-xs sm:inline-flex">Ekstre</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Tile({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 ${highlight ? "border-success/30 bg-success/5" : "border-line bg-surface"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${highlight ? "text-success" : "text-ink"}`}>{value == null ? "—" : TRY(value)}</div>
    </div>
  );
}
function MiniCol({ label, value, signed, strong }: { label: string; value: number; signed?: boolean; strong?: boolean }) {
  const cls = signed ? (value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-ink-soft") : "text-ink";
  return (
    <div className="hidden w-24 text-right md:block">
      <div className="text-[9px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-xs tabular-nums ${strong ? "font-semibold text-ink" : cls}`}>{signed && value > 0 ? "+" : ""}{TRY(value)}</div>
    </div>
  );
}

/* ---------- Çek & Senet ---------- */
function ChecksCard({ ov }: { ov: Overview | null }) {
  const rows = [
    { icon: Wallet, color: "var(--color-primary)", label: "Portföyde Bekleyen", amount: ov?.checks.portfolio_amount, count: ov?.checks.portfolio_count },
    { icon: Clock, color: "var(--color-warning)", label: "15 Gün İçinde Vade", amount: ov?.checks.due_soon_amount, count: ov?.checks.due_soon_count },
    { icon: ShieldAlert, color: "var(--color-danger)", label: "Karşılıksız", amount: null as number | null, count: ov?.checks.bounced_count },
  ];
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Çek & Senet Portföyü</h2>
        <Link href="/checks" className="text-sm font-medium text-primary hover:underline">Detay →</Link>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${r.color} 13%, transparent)`, color: r.color }}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">{r.label}</div>
                <div className="text-base font-bold tabular-nums text-ink">{r.amount != null ? TRY(r.amount) : `${r.count ?? 0} adet`}</div>
              </div>
              {r.amount != null && <div className="shrink-0 text-xs text-muted">{r.count ?? 0} adet</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Hızlı işlemler ---------- */
const ACTIONS: { icon: LucideIcon; title: string; sub: string; href: string; color: string }[] = [
  { icon: Plus, title: "Hızlı Kurulum", sub: "Müşteri + bina ekle", href: "/quick-setup", color: "var(--color-primary)" },
  { icon: HandCoins, title: "Tahsilat Al", sub: "Kasaya giriş kaydet", href: "/collections", color: "var(--color-success)" },
  { icon: AlertTriangle, title: "Arıza Bildir", sub: "Yeni kayıt oluştur", href: "/faults", color: "var(--color-danger)" },
  { icon: BarChart3, title: "Cari Bakiye", sub: "Rapor görüntüle", href: "/current-accounts", color: "var(--color-info)" },
];
function QuickActions() {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">Hızlı İşlemler</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.title} href={a.href as never} className="group rounded-xl border border-line p-3.5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card">
              <span className="grid h-9 w-9 place-items-center rounded-xl transition group-hover:scale-110" style={{ background: `color-mix(in srgb, ${a.color} 13%, transparent)`, color: a.color }}>
                <Icon size={16} />
              </span>
              <div className="mt-2.5 text-sm font-semibold text-ink">{a.title}</div>
              <div className="text-xs text-muted">{a.sub}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Ortak panel / satır ---------- */
function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-3 divide-y divide-line">{children}</div>
    </div>
  );
}
function Row({ icon, left, sub, right }: { icon: React.ReactNode; left: string; sub?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{left}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}
