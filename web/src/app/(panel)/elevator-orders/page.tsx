"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus } from "lucide-react";

type Row = {
  id: number; order_number: string | null; elevator_type: string | null;
  quantity: number; amount: number | null; status: string;
  customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [
  { v: "quote", l: "Teklif" }, { v: "approved", l: "Onaylandı" }, { v: "production", l: "Üretimde" },
  { v: "shipping", l: "Sevkiyatta" }, { v: "installing", l: "Montajda" },
  { v: "completed", l: "Tamamlandı" }, { v: "cancelled", l: "İptal" },
];
const empty = { customer_id: "", elevator_type: "", quantity: "1", amount: "", notes: "" };

export default function ElevatorOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const customers = useOptions("/customers");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/elevator-orders${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/elevator-orders", { method: "POST", body: {
        customer_id: Number(form.customer_id), elevator_type: form.elevator_type || null,
        quantity: Number(form.quantity) || 1, amount: form.amount ? Number(form.amount) : null,
        notes: form.notes || null,
      } });
      setModal(false); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function changeStatus(id: number, s: string) {
    await api(`/elevator-orders/${id}`, { method: "PUT", body: { status: s } });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Asansör Siparişleri</h1>
          <p className="mt-1 text-sm text-muted">{total} sipariş</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium text-center">Adet</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz sipariş yok.</td></tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{o.order_number ?? `#${o.id}`}</td>
                  <td className="px-4 py-3 font-medium text-ink">{o.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{o.elevator_type ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{o.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{o.amount != null ? TRY(o.amount) : "—"}</td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}
                      className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink-soft">
                      {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Sipariş" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={create} disabled={saving || !form.customer_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Müşteri *">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Asansör Tipi"><input className="input" placeholder="örn. İnsan Asansörü 6 kişi" value={form.elevator_type} onChange={(e) => setForm({ ...form, elevator_type: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adet"><input className="input" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Tutar (₺)"><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          </div>
          <Field label="Not"><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
