"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TRY } from "@/lib/format";
import { TrendingUp } from "lucide-react";

type Point = { month: string; total: string | number };

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const label = (m: string) => {
  const [, mm] = m.split("-");
  return MONTHS[Number(mm) - 1] ?? m;
};
const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;

export default function RevenueChart() {
  const [data, setData] = useState<Point[] | null>(null);

  useEffect(() => {
    api<Point[]>("/dashboard/revenue-chart").then(setData).catch(() => setData([]));
  }, []);

  if (!data) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-card" />;

  const values = data.map((d) => Number(d.total) || 0);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? total / values.length : 0;

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-light text-primary">
            <TrendingUp size={18} />
          </span>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold text-ink">Hasılat</h2>
            <p className="text-xs text-muted">Son 6 ay · tahsilat</p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-lg font-bold text-ink">{TRY(total)}</div>
          <div className="text-[11px] text-muted">toplam</div>
        </div>
      </div>

      {total === 0 ? (
        <p className="flex h-40 items-center justify-center text-center text-sm text-muted">
          Henüz hasılat verisi yok. Tahsilat girildikçe burada görünür.
        </p>
      ) : (
        <>
          <div className="relative mt-6 h-48">
            {/* Izgara çizgileri + eksen etiketleri */}
            {[1, 0.75, 0.5, 0.25, 0].map((r) => (
              <div key={r} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${r * 100}%`, height: 0 }}>
                <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted/70">{compact(max * r)}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            ))}
            {/* Ortalama çizgisi */}
            {avg > 0 && (
              <div className="absolute right-0 flex items-center" style={{ bottom: `${(avg / max) * 100}%`, height: 0, left: "2.5rem" }}>
                <span className="h-px w-full border-t border-dashed border-primary/40" />
              </div>
            )}
            {/* Çubuklar */}
            <div className="absolute inset-0 flex items-end gap-2 pl-10">
              {data.map((d) => {
                const v = Number(d.total) || 0;
                const h = (v / max) * 100;
                return (
                  <div key={d.month} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div className="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-pop transition group-hover:opacity-100">
                      {TRY(v)}
                    </div>
                    <div
                      className="w-full max-w-[46px] rounded-t-lg bg-gradient-to-t from-primary/55 to-primary transition-all duration-300 group-hover:from-primary group-hover:to-primary-dark"
                      style={{ height: `${Math.max(2, h)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex gap-2 pl-10">
            {data.map((d) => (
              <div key={d.month} className="flex-1 text-center text-[11px] font-medium text-muted">{label(d.month)}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
