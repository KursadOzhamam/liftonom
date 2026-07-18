"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import RevenueChart from "@/components/RevenueChart";
import DashboardWidgets from "@/components/DashboardWidgets";
import { Users, ArrowUpDown, Wrench, AlertTriangle, TrendingUp, Receipt, type LucideIcon } from "lucide-react";

type Kpis = {
  customers: number;
  active_elevators: number;
  maintenance_month: number;
  open_faults: number;
  revenue_month: number;
  unpaid: number;
};

const TRY = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

type Card = { label: string; value: string | number; color: string; icon: LucideIcon };

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Kpis>("/dashboard/kpis")
      .then(setKpis)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Veri alınamadı."));
  }, []);

  const cards: Card[] = kpis
    ? [
        { label: "Müşteri", value: kpis.customers, color: "var(--color-primary)", icon: Users },
        { label: "Aktif Asansör", value: kpis.active_elevators, color: "var(--color-info)", icon: ArrowUpDown },
        { label: "Bu Ay Bakım", value: kpis.maintenance_month, color: "var(--color-warning)", icon: Wrench },
        { label: "Açık Arıza", value: kpis.open_faults, color: "var(--color-danger)", icon: AlertTriangle },
        { label: "Bu Ay Hasılat", value: TRY(kpis.revenue_month), color: "var(--color-success)", icon: TrendingUp },
        { label: "Tahsil Edilemeyen", value: TRY(kpis.unpaid), color: "var(--color-danger)", icon: Receipt },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Kontrol Paneli</h1>
      <p className="mt-1 text-sm text-muted">Firmanızın genel durumu.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {!kpis && !error
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-card" />
            ))
          : cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="pop-in group rounded-2xl border border-line bg-card p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{c.label}</span>
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg transition group-hover:scale-110"
                      style={{ background: `color-mix(in srgb, ${c.color} 13%, transparent)`, color: c.color }}
                    >
                      <Icon size={16} />
                    </span>
                  </div>
                  <div className="mt-3 text-[26px] font-bold leading-none tracking-tight tabular-nums text-ink">
                    {c.value}
                  </div>
                </div>
              );
            })}
      </div>

      <div className="mt-6">
        <RevenueChart />
      </div>

      <DashboardWidgets />
    </div>
  );
}
