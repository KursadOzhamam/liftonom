"use client";

import { useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import Badge from "@/components/Badge";
import { FileDown } from "lucide-react";

type Row = {
  id: number; invoice_number: string | null; status: string;
  total: string | null; paid_amount: string | null;
  issue_date: string | null; due_date: string | null;
  customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

export default function InvoicesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/invoices")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Faturalar</h1>
      <p className="mt-1 text-sm text-muted">{total} fatura</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Fatura No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Vade</th>
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
              rows.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{i.invoice_number ?? `#${i.id}`}</td>
                  <td className="px-4 py-3 text-ink-soft">{i.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">{i.total ? TRY(i.total) : "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(i.due_date)}</td>
                  <td className="px-4 py-3"><Badge status={i.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => downloadFile(`/invoices/${i.id}/pdf`, `${i.invoice_number ?? i.id}.pdf`)}
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
