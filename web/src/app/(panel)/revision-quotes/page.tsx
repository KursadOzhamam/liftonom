"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Trash2 } from "lucide-react";

type Row = { id: number; quote_number: string | null; total: number | null; valid_until: string | null; status: string; customer?: { name: string } | null };
type Paginated = { data: Row[]; meta: { total: number } };
type Item = { description: string; quantity: string; unit_price: string };

const newItem = (): Item => ({ description: "", quantity: "1", unit_price: "" });

export default function RevisionQuotesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_id: "", valid_until: "", tax_rate: "20", discount: "0", notes: "" });
  const [items, setItems] = useState<Item[]>([newItem()]);

  const customers = useOptions("/customers");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/quotes?type=revision"); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setForm({ customer_id: "", valid_until: "", tax_rate: "20", discount: "0", notes: "" }); setItems([newItem()]); setModal(true); }
  function setItem(i: number, patch: Partial<Item>) { setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  async function save() {
    setSaving(true);
    try {
      await api("/quotes", { method: "POST", body: {
        customer_id: Number(form.customer_id), type: "revision",
        valid_until: form.valid_until || null,
        items: items.filter((it) => it.description).map((it) => ({ description: it.description, quantity: Number(it.quantity) || 0, unit_price: Number(it.unit_price) || 0 })),
        tax_rate: Number(form.tax_rate) || 0, discount: Number(form.discount) || 0, notes: form.notes || null,
      } });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Revizyon Teklifleri</h1>
          <p className="mt-1 text-sm text-muted">{total} revizyon teklifi · asansör modernizasyon/revizyon</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Geçerlilik</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Henüz revizyon teklifi yok.</td></tr>
            ) : rows.map((q) => (
              <tr key={q.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{q.quote_number ?? `#${q.id}`}</td>
                <td className="px-4 py-3 font-medium text-ink">{q.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(q.valid_until)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{q.total != null ? TRY(q.total) : "—"}</td>
                <td className="px-4 py-3"><Badge status={q.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Revizyon Teklifi" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.customer_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Müşteri *">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Kalemler</span>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input flex-1" placeholder="Açıklama" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                  <input className="input w-16" type="number" placeholder="Adet" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                  <input className="input w-24" type="number" placeholder="B.Fiyat" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} />
                  {items.length > 1 && <button onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} className="rounded-lg px-2 text-muted hover:text-danger"><Trash2 size={15} /></button>}
                </div>
              ))}
            </div>
            <button onClick={() => setItems((a) => [...a, newItem()])} className="mt-2 text-xs text-primary hover:underline">+ Kalem ekle</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="KDV %"><input className="input" type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></Field>
            <Field label="İskonto (₺)"><input className="input" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
          </div>
          <Field label="Geçerlilik"><input className="input" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></Field>
          <div className="rounded-lg bg-surface px-3 py-2 text-sm"><span className="text-muted">Ara toplam: </span><span className="font-semibold tabular-nums text-ink">{TRY(subtotal)}</span></div>
        </Modal>
      )}
    </div>
  );
}
