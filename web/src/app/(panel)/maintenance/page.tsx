"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import Badge from "@/components/Badge";

type Row = {
  id: number;
  type: string;
  status: string;
  planned_date: string | null;
  completed_at: string | null;
  elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const TYPE: Record<string, string> = {
  periodic: "Periyodik", fault: "Arıza", revision: "Revizyon", annual: "Yıllık",
};

export default function MaintenancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    api<Paginated>(`/maintenance${status ? `?status=${status}` : ""}`)
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Bakım Kayıtları</h1>
      <p className="mt-1 text-sm text-muted">{total} kayıt</p>

      <div className="mt-5 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="in_progress">Devam Ediyor</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Planlanan</th>
              <th className="px-4 py-3 font-medium">Tamamlanma</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{m.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{TYPE[m.type] ?? m.type}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(m.planned_date)}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(m.completed_at)}</td>
                  <td className="px-4 py-3"><Badge status={m.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
