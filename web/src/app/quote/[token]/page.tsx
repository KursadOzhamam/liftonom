"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type Clause = { title: string; body: string };
type Item = { description: string; quantity: number; unit_price: number; total: number };
type Pub = {
  quote_number: string | null; type: string | null; status: string; title: string | null;
  currency: string | null; valid_until: string | null; created_at: string;
  subtotal: number | null; discount: number | null; total: number | null; terms: string | null;
  customer_name: string | null;
  company: { name: string | null; phone: string | null; email: string | null; address: string | null } | null;
  items: Item[]; rendered_clauses: Clause[];
};

const money = (n: number | null, cur?: string | null) =>
  n == null ? "—" : `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${cur ?? "TRY"}`;
const dt = (d: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [c, setC] = useState<Pub | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setC(await api<Pub>(`/public/quotes/${token}`, { auth: false })); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Teklif bulunamadı."); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (err) return <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-600">{err}</div>;
  if (!c) return <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-500">Yükleniyor…</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-8 text-slate-800">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-indigo-600">{c.company?.name ?? "Firma"}</h1>
              <p className="text-sm text-slate-500">{c.company?.phone} {c.company?.email}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Teklif No</p>
              <p className="text-lg font-bold">{c.quote_number}</p>
              <p className="mt-1 text-xs text-slate-500">{dt(c.created_at)} · Geçerlilik {dt(c.valid_until)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-xs text-slate-400">Sayın Müşterimiz</p>
            <p className="font-semibold">{c.customer_name}</p>
            {c.title && <p className="text-slate-600">Konu: {c.title}</p>}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                  <th className="px-3 py-2 text-right font-medium">Miktar</th>
                  <th className="px-3 py-2 text-right font-medium">Birim Fiyat</th>
                  <th className="px-3 py-2 text-right font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {c.items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{it.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{money(it.unit_price, c.currency)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{money(it.total, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right">
            <p className="text-lg font-bold text-indigo-600">Genel Toplam: {money(c.total, c.currency)}</p>
            <p className="text-xs text-slate-400">Tutarlar KDV dahildir.</p>
          </div>

          <div className="mt-6 space-y-4">
            {c.rendered_clauses.length > 0 ? c.rendered_clauses.map((cl, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold">{cl.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{cl.body}</p>
              </div>
            )) : c.terms ? (
              <div><h3 className="text-sm font-semibold">Şartlar</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{c.terms}</p></div>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Bu teklif {c.company?.name} tarafından gönderilmiştir.</p>
      </div>
    </div>
  );
}
