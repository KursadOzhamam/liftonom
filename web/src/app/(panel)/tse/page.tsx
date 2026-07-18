"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { Info } from "lucide-react";

type Elevator = { id: number; name: string | null; tse_end_date: string | null; building?: { name: string } | null };
type Report = {
  summary: { total: number; green: number; yellow: number; red: number; gray: number };
  items: { data: Elevator[] };
};

export default function TsePage() {
  const [rep, setRep] = useState<Report | null>(null);

  useEffect(() => { api<Report>("/elevators/tse-report?list=upcoming").then(setRep); }, []);

  const cards = rep
    ? [
        { label: "Toplam", value: rep.summary.total, color: "var(--color-ink)" },
        { label: "Geçerli", value: rep.summary.green, color: "#16A34A" },
        { label: "30 Gün İçinde", value: rep.summary.yellow, color: "#D97706" },
        { label: "Süresi Dolmuş", value: rep.summary.red, color: "#DC2626" },
        { label: "Belge Yok", value: rep.summary.gray, color: "#6B7280" },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">TSE Muayene Takibi</h1>
      <p className="mt-1 text-sm text-muted">Periyodik muayene durumu.</p>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-light/40 p-4 text-sm text-ink-soft">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          Muayene (TSE) tarihi her <b>asansörün kaydında</b> belirlenir.{" "}
          <Link href="/elevators" className="font-medium text-primary hover:underline">Asansörler</Link>{" "}
          modülünde asansörü düzenleyip <b>TSE / Muayene Tarihi</b>ni girin. Bu sayfa tüm asansörlerin
          muayene durumunu ve yaklaşan tarihleri izler.
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-card p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</div>
            <div className="mt-1 text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">30 gün içinde dolacaklar</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Bina</th>
              <th className="px-4 py-3 font-medium">Muayene Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {!rep ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rep.items.data.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Yaklaşan muayene yok.</td></tr>
            ) : (
              rep.items.data.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{e.name ?? `#${e.id}`}</td>
                  <td className="px-4 py-3 text-ink-soft">{e.building?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-warning">{dateTR(e.tse_end_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
