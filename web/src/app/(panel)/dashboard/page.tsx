"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import RevenueChart from "@/components/RevenueChart";

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

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Kpis>("/dashboard/kpis")
      .then(setKpis)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Veri alınamadı."));
  }, []);

  const cards = kpis
    ? [
        { label: "Müşteri", value: kpis.customers, color: "var(--color-primary)" },
        { label: "Aktif Asansör", value: kpis.active_elevators, color: "var(--color-success)" },
        { label: "Bu Ay Bakım", value: kpis.maintenance_month, color: "var(--color-warning)" },
        { label: "Açık Arıza", value: kpis.open_faults, color: "var(--color-danger)" },
        { label: "Bu Ay Hasılat", value: TRY(kpis.revenue_month), color: "var(--color-success)" },
        { label: "Tahsil Edilemeyen", value: TRY(kpis.unpaid), color: "var(--color-danger)" },
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
              <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-white" />
            ))
          : cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</div>
                <div className="mt-2 text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
      </div>

      <div className="mt-6">
        <RevenueChart />
      </div>
    </div>
  );
}
