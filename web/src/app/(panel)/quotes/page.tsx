"use client";

import { useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import Badge from "@/components/Badge";
import { FileDown } from "lucide-react";

type Row = {
  id: number; quote_number: string | null; status: string;
  total: string | null; valid_until: string | null;
  customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

export default function QuotesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/quotes")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Teklifler</h1>
      <p className="mt-1 text-sm text-muted">{total} teklif</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Teklif No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Geçerlilik</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((q) => (
                <tr key={q.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{q.quote_number ?? `#${q.id}`}</td>
                  <td className="px-4 py-3 text-ink-soft">{q.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">{q.total ? TRY(q.total) : "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(q.valid_until)}</td>
                  <td className="px-4 py-3"><Badge status={q.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => downloadFile(`/quotes/${q.id}/pdf`, `${q.quote_number ?? q.id}.pdf`)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline" title="PDF indir">
                      <FileDown size={14} /> PDF
                    </button>
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
