"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import Badge from "@/components/Badge";

type Row = {
  id: number; source_type: string | null; status: string;
  description: string | null; planned_date: string | null;
  elevator?: { name: string } | null;
  assigned_user?: { name: string; surname?: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const SOURCE: Record<string, string> = { fault: "Arıza", maintenance: "Bakım", manual: "Manuel" };
const WO_STATUS: Record<string, string> = { open: "Açık", in_progress: "Devam", done: "Tamamlandı", cancelled: "İptal" };

export default function WorkOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/work-orders")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">İş Emirleri</h1>
      <p className="mt-1 text-sm text-muted">{total} iş emri</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Kaynak</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Planlanan</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">#{w.id}</td>
                  <td className="px-4 py-3 text-ink-soft">{SOURCE[w.source_type ?? ""] ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{w.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{w.description ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(w.planned_date)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: w.status === "done" ? "#DCFCE7" : w.status === "cancelled" ? "#FEE2E2" : "#DBEAFE",
                        color: w.status === "done" ? "#16A34A" : w.status === "cancelled" ? "#DC2626" : "#2563EB",
                      }}>
                      {WO_STATUS[w.status] ?? w.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
