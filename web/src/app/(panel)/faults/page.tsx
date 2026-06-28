"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dateTR } from "@/lib/format";
import Badge from "@/components/Badge";

type Row = {
  id: number;
  priority: string;
  status: string;
  description: string;
  created_at: string;
  elevator?: { name: string } | null;
  assigned_user?: { name: string; surname?: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

export default function FaultsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    api<Paginated>(`/fault-reports${status ? `?status=${status}` : ""}`)
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Arıza Bildirimleri</h1>
      <p className="mt-1 text-sm text-muted">{total} kayıt</p>

      <div className="mt-5 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="new">Yeni</option>
          <option value="investigating">İnceleniyor</option>
          <option value="repairing">Onarımda</option>
          <option value="resolved">Çözüldü</option>
          <option value="closed">Kapatıldı</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Öncelik</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((f) => (
                <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">#{f.id}</td>
                  <td className="px-4 py-3 font-medium text-ink">{f.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{f.description}</td>
                  <td className="px-4 py-3"><Badge status={f.priority} /></td>
                  <td className="px-4 py-3"><Badge status={f.status} /></td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(f.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
