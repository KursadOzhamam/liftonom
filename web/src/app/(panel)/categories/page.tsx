"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Tag, Package } from "lucide-react";

type Cat = { category: string; product_count: number; total_stock: number };

export default function CategoriesPage() {
  const [rows, setRows] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Cat[]>("/inventory/categories").then(setRows).finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(1, ...rows.map((r) => r.product_count));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Kategoriler</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} kategori · ürünler kategoriye göre gruplanır</p>
        </div>
        <Link href="/inventory" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
          <Package size={15} /> Tüm Stok
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 grid place-items-center text-muted">Yükleniyor…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-line bg-card py-16 text-muted">
          <Tag size={32} /> <span className="mt-2">Henüz kategorili ürün yok.</span>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <div key={c.category} className="rounded-xl border border-line bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Tag size={16} /></div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{c.category}</div>
                  <div className="text-xs text-muted">{c.product_count} ürün · {c.total_stock} stok</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(c.product_count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
