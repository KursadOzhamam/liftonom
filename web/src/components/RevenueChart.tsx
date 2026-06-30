"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TRY } from "@/lib/format";

type Point = { month: string; total: string | number };

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const label = (m: string) => {
  const [, mm] = m.split("-");
  return MONTHS[Number(mm) - 1] ?? m;
};

export default function RevenueChart() {
  const [data, setData] = useState<Point[] | null>(null);

  useEffect(() => { api<Point[]>("/dashboard/revenue-chart").then(setData).catch(() => setData([])); }, []);

  if (!data) return <div className="h-48 animate-pulse rounded-xl border border-line bg-card" />;

  const max = Math.max(1, ...data.map((d) => Number(d.total)));

  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Son 6 Ay Hasılat</h2>
      {data.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">Henüz veri yok.</p>
      ) : (
        <div className="mt-5 flex h-44 items-end gap-3">
          {data.map((d) => {
            const v = Number(d.total);
            const h = Math.max(4, (v / max) * 100);
            return (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-[10px] font-medium text-muted">{v >= 1000 ? `${Math.round(v / 1000)}k` : v}</div>
                <div className="flex w-full items-end" style={{ height: "120px" }}>
                  <div className="w-full rounded-t-md bg-primary transition-all" style={{ height: `${h}%` }}
                    title={TRY(v)} />
                </div>
                <div className="text-xs text-muted">{label(d.month)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
