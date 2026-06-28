"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, clearToken, ApiError } from "@/lib/api";

type Me = { name: string; surname?: string; role: string };
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
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([api<Me>("/auth/me"), api<Kpis>("/dashboard/kpis")])
      .then(([meRes, kpiRes]) => {
        setMe(meRes);
        setKpis(kpiRes);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setError(err instanceof ApiError ? err.message : "Veri alınamadı.");
        }
      });
  }, [router]);

  function logout() {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    router.replace("/login");
  }

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
    <div className="min-h-screen bg-surface">
      {/* Üst bar */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-white px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">
            L
          </div>
          <span className="font-bold text-ink">LiftOtonom</span>
        </div>
        <div className="flex items-center gap-4">
          {me && (
            <span className="text-sm text-ink-soft">
              {me.name} {me.surname} ·{" "}
              <span className="text-muted">{me.role}</span>
            </span>
          )}
          <button onClick={logout} className="text-sm text-danger hover:underline">
            Çıkış
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
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
                <div
                  key={c.label}
                  className="rounded-xl border border-line bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">
                    {c.label}
                  </div>
                  <div
                    className="mt-2 text-2xl font-bold"
                    style={{ color: c.color }}
                  >
                    {c.value}
                  </div>
                </div>
              ))}
        </div>

        <p className="mt-8 text-sm text-muted">
          ✅ Bu ekran backend API&apos;ye bağlı — veriler gerçek (firma:{" "}
          {me ? "yüklendi" : "…"}).
        </p>
      </main>
    </div>
  );
}
