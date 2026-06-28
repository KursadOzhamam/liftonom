"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = { id: number; name: string; code: string | null; technicians_count?: number };
type Paginated = { data: Row[]; meta: { total: number } };

export default function RegionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/regions")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Bölgeler</h1>
      <p className="mt-1 text-sm text-muted">{total} bölge · Saha bölgelerini tanımlayın ve teknisyen atayın.</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Bölge</th>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium text-center">Teknisyen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Henüz bölge eklenmemiş.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.code ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{r.technicians_count ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
