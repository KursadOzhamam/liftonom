"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = { id: number; name: string; phone: string | null; balance: string };
type Paginated = { data: Row[]; meta: { total: number } };

const TRY = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

export default function CurrentAccountsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/current-accounts")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Cariler</h1>
      <p className="mt-1 text-sm text-muted">{total} müşteri hesabı</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((r) => {
                const bal = Number(r.balance);
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{r.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold"
                      style={{ color: bal > 0 ? "var(--color-danger)" : bal < 0 ? "var(--color-success)" : "var(--color-muted)" }}>
                      {TRY(bal)}
                      <span className="ml-1 text-xs font-normal text-muted">
                        {bal > 0 ? "(borç)" : bal < 0 ? "(alacak)" : ""}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Pozitif bakiye müşterinin borcudur; negatif bakiye alacaklıdır.</p>
    </div>
  );
}
