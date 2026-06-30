"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { Building2, CheckCircle2, Users, ArrowUpDown, AlertTriangle, ArrowRight } from "lucide-react";

type Stats = { tenants: number; active_tenants: number; users: number; elevators: number };
type Tenant = {
  id: number; name: string; slug: string; plan: string;
  plan_expires_at: string | null; is_active: boolean; created_at: string;
};

const PLAN: Record<string, string> = { trial: "Deneme", starter: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };
const PLAN_COLOR: Record<string, string> = { trial: "#6B7280", starter: "#2563EB", pro: "#7C3AED", enterprise: "#16A34A" };

function daysLeft(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Stats>("/admin/stats", { admin: true }),
      api<{ data: Tenant[] }>("/admin/tenants?per_page=100", { admin: true }),
    ])
      .then(([s, t]) => { setStats(s); setTenants(t.data); })
      .finally(() => setLoading(false));
  }, []);

  const planDist = Object.keys(PLAN).map((p) => ({
    plan: p, count: tenants.filter((t) => t.plan === p).length,
  }));
  const maxPlan = Math.max(1, ...planDist.map((p) => p.count));

  const expiringSoon = tenants
    .map((t) => ({ ...t, d: daysLeft(t.plan_expires_at) }))
    .filter((t) => t.d !== null && t.d <= 30)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
    .slice(0, 6);

  const recent = [...tenants]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  if (loading) return <div className="grid place-items-center py-20 text-muted">Yükleniyor…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Genel Bakış</h1>
      <p className="mt-1 text-sm text-muted">Platform geneli özet ve firma durumu.</p>

      {/* KPI */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Building2 size={18} />} label="Toplam Firma" value={stats?.tenants ?? 0} />
        <Kpi icon={<CheckCircle2 size={18} />} label="Aktif Firma" value={stats?.active_tenants ?? 0} tone="success" />
        <Kpi icon={<Users size={18} />} label="Kullanıcı" value={stats?.users ?? 0} />
        <Kpi icon={<ArrowUpDown size={18} />} label="Asansör" value={stats?.elevators ?? 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Plan dağılımı */}
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Plan Dağılımı</h2>
          <div className="mt-4 space-y-3">
            {planDist.map((p) => (
              <div key={p.plan}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink-soft">{PLAN[p.plan]}</span>
                  <span className="tabular-nums text-muted">{p.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full" style={{ width: `${(p.count / maxPlan) * 100}%`, background: PLAN_COLOR[p.plan] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Yakında süresi bitenler */}
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            <h2 className="text-sm font-semibold text-ink">Yakında Süresi Bitenler (30 gün)</h2>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Yaklaşan plan bitişi yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {expiringSoon.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-ink hover:text-primary">{t.name}</Link>
                  <span className={`text-xs font-medium ${(t.d ?? 0) <= 7 ? "text-danger" : "text-warning"}`}>
                    {(t.d ?? 0) <= 0 ? "Doldu" : `${t.d} gün`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Son eklenen firmalar */}
      <div className="mt-4 rounded-xl border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Son Eklenen Firmalar</h2>
          <Link href="/admin/tenants" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Tümü <ArrowRight size={13} />
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {recent.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5">
              <div>
                <Link href={`/admin/tenants/${t.id}`} className="text-sm font-medium text-ink hover:text-primary">{t.name}</Link>
                <span className="ml-2 text-xs text-muted">/{t.slug}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${PLAN_COLOR[t.plan]}1a`, color: PLAN_COLOR[t.plan] }}>{PLAN[t.plan] ?? t.plan}</span>
                <span className="text-xs text-muted">{dateTR(t.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "success" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        <span className={tone === "success" ? "text-success" : "text-primary"}>{icon}</span> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}
