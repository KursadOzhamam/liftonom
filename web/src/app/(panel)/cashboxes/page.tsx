"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Landmark, Wallet } from "lucide-react";

type Cashbox = { id: number; name: string; type: string; balance: string };
type Resp = { data: Cashbox[]; total: number };

const TRY = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

export default function CashboxesPage() {
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => { api<Resp>("/cashboxes").then(setData); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Kasalar</h1>
      <p className="mt-1 text-sm text-muted">Nakit ve banka hesaplarınız.</p>

      {data && (
        <div className="mt-4 rounded-xl border border-line bg-primary p-5 text-white">
          <div className="text-xs uppercase tracking-wide opacity-80">Toplam Bakiye</div>
          <div className="mt-1 text-3xl font-bold">{TRY(data.total)}</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!data
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-white" />
            ))
          : data.data.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted">
                  {c.type === "bank" ? <Landmark size={18} /> : <Wallet size={18} />}
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs">
                    {c.type === "bank" ? "Banka" : "Nakit"}
                  </span>
                </div>
                <div className="mt-3 text-2xl font-bold text-ink">{TRY(Number(c.balance))}</div>
              </div>
            ))}
        {data && data.data.length === 0 && (
          <p className="text-sm text-muted">Henüz kasa eklenmemiş.</p>
        )}
      </div>
    </div>
  );
}
