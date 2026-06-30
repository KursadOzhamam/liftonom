"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import Badge from "@/components/Badge";
import { TrendingUp, Wallet, Repeat } from "lucide-react";

type Revenue = {
  total_revenue: number; this_month: number; mrr: number;
  by_status: { status: string; count: number; total: number }[];
  monthly: { month: string; total: number }[];
  recent: { id: number; amount: number; currency: string; status: string; paid_at: string | null; tenant: string | null }[];
};

export default function AdminRevenuePage() {
  const [r, setR] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Revenue>("/admin/revenue", { admin: true }).then(setR).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-20 text-muted">Yükleniyor…</div>;

  const maxVal = Math.max(1, ...(r?.monthly.map((m) => m.total) ?? [1]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Gelir & Abonelik</h1>
      <p className="mt-1 text-sm text-muted">Platform geneli ödeme ve yinelenen gelir özeti.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Wallet size={18} />} label="Toplam Gelir" value={TRY(r?.total_revenue ?? 0)} accent />
        <Stat icon={<TrendingUp size={18} />} label="Bu Ay" value={TRY(r?.this_month ?? 0)} />
        <Stat icon={<Repeat size={18} />} label="MRR (Aylık Yinelenen)" value={TRY(r?.mrr ?? 0)} />
      </div>

      {/* Aylık gelir grafiği */}
      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Son 12 Ay — Başarılı Tahsilat</h2>
        {!r?.monthly.length ? (
          <p className="mt-6 text-center text-sm text-muted">Henüz tahsilat yok.</p>
        ) : (
          <div className="mt-5 flex items-end gap-3 overflow-x-auto pb-2">
            {r.monthly.map((m) => (
              <div key={m.month} className="flex min-w-12 flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end justify-center">
                  <div className="w-2/3 rounded-t bg-primary" style={{ height: `${(m.total / maxVal) * 100}%` }} title={TRY(m.total)} />
                </div>
                <span className="text-[10px] text-muted">{m.month.slice(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Durum dağılımı */}
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Ödeme Durumları</h2>
          {!r?.by_status.length ? (
            <p className="mt-4 text-sm text-muted">Kayıt yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {r.by_status.map((s) => (
                <li key={s.status} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge status={s.status} />
                    <span className="text-xs text-muted">{s.count} adet</span>
                  </div>
                  <span className="font-medium tabular-nums text-ink-soft">{TRY(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Son ödemeler */}
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Son Ödemeler</h2>
          {!r?.recent.length ? (
            <p className="mt-4 text-sm text-muted">Kayıt yok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {r.recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium text-ink">{p.tenant ?? "—"}</div>
                    <div className="text-xs text-muted">{p.paid_at ? dateTR(p.paid_at) : "—"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={p.status} />
                    <span className="font-medium tabular-nums text-ink-soft">{TRY(p.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-line p-5 ${accent ? "bg-primary text-white" : "bg-card"}`}>
      <div className={`flex items-center gap-2 text-xs font-medium ${accent ? "text-white/80" : "text-muted"}`}>{icon} {label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-white" : "text-ink"}`}>{value}</div>
    </div>
  );
}
