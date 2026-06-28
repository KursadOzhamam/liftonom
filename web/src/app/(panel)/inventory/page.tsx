"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TRY } from "@/lib/format";
import { AlertCircle } from "lucide-react";

type Row = {
  id: number;
  code: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  stock_quantity: string;
  min_stock: string;
  unit_price: string | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated>("/inventory")
      .then((r) => { setRows(r.data); setTotal(r.meta.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Stok</h1>
      <p className="mt-1 text-sm text-muted">{total} ürün</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium text-right">Stok</th>
              <th className="px-4 py-3 font-medium text-right">Min.</th>
              <th className="px-4 py-3 font-medium text-right">Birim Fiyat</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((p) => {
                const low = Number(p.stock_quantity) < Number(p.min_stock);
                return (
                  <tr key={p.id} className={`border-b border-line last:border-0 ${low ? "bg-warning/5" : "hover:bg-surface"}`}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {p.name}
                      {p.code && <span className="ml-2 text-xs text-muted">{p.code}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={low ? "font-semibold text-warning" : "text-ink-soft"}>
                        {Number(p.stock_quantity)} {p.unit ?? ""}
                      </span>
                      {low && <AlertCircle size={14} className="ml-1 inline text-warning" />}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{Number(p.min_stock)}</td>
                    <td className="px-4 py-3 text-right text-ink-soft">{p.unit_price ? TRY(p.unit_price) : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
