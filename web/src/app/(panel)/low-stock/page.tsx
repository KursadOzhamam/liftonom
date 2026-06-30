"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AlertTriangle, Package } from "lucide-react";

type Product = {
  id: number; code: string | null; name: string; category: string | null;
  unit: string | null; stock_quantity: number; min_stock: number;
};

export default function LowStockPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Product[]>("/inventory/low-stock")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Düşük Stok</h1>
          <p className="mt-1 text-sm text-muted">Minimum seviyenin altına düşen {rows.length} ürün.</p>
        </div>
        <Link href="/inventory" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
          <Package size={15} /> Tüm Stok
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium text-center">Mevcut</th>
              <th className="px-4 py-3 font-medium text-center">Min.</th>
              <th className="px-4 py-3 font-medium text-center">Eksik</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <div className="grid place-items-center gap-2 text-muted">
                  <Package size={32} className="text-success" />
                  <span>Tüm ürünler yeterli stokta 👍</span>
                </div>
              </td></tr>
            ) : (
              rows.map((p) => {
                const deficit = p.min_stock - p.stock_quantity;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-warning" />
                        <div>
                          <div className="font-medium text-ink">{p.name}</div>
                          {p.code && <div className="text-xs text-muted">{p.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-medium tabular-nums text-danger">{p.stock_quantity} {p.unit ?? ""}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink-soft">{p.min_stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger tabular-nums">−{deficit}</span>
                    </td>
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
