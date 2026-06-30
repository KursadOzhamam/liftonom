"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, RefreshCw } from "lucide-react";

type Row = {
  id: number; contract_number: string | null; type: string | null;
  start_date: string | null; end_date: string | null; monthly_fee: number | null;
  status: string; customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [
  { v: "active", l: "Aktif" }, { v: "expired", l: "Süresi Doldu" }, { v: "cancelled", l: "İptal" },
];
const TYPES = ["Bakım", "Tam Kapsam", "Sadece Arıza", "Revizyon"];
const empty = { customer_id: "", type: "Bakım", start_date: "", end_date: "", monthly_fee: "", auto_renew: false, status: "active", notes: "" };

export default function ContractsPage() {
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
      const r = await api<Paginated>(`/contracts${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/contracts", { method: "POST", body: {
        customer_id: Number(form.customer_id), type: form.type,
        start_date: form.start_date || null, end_date: form.end_date || null,
        monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
        auto_renew: form.auto_renew, status: form.status, notes: form.notes || null,
      } });
      setModal(false); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function renew(id: number) {
    const months = prompt("Kaç ay uzatılsın?", "12");
    if (!months) return;
    await api(`/contracts/${id}/renew`, { method: "POST", body: { months: Number(months) } });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sözleşmeler</h1>
          <p className="mt-1 text-sm text-muted">{total} sözleşme</p>
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
              <th className="px-4 py-3 font-medium">Tür</th>
              <th className="px-4 py-3 font-medium">Başlangıç</th>
              <th className="px-4 py-3 font-medium">Bitiş</th>
              <th className="px-4 py-3 font-medium text-right">Aylık Ücret</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Henüz sözleşme yok.</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{c.contract_number ?? `#${c.id}`}</td>
                  <td className="px-4 py-3 font-medium text-ink">{c.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.type ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(c.start_date)}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(c.end_date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{c.monthly_fee != null ? TRY(c.monthly_fee) : "—"}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => renew(c.id)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                        <RefreshCw size={13} /> Yenile
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Sözleşme" onClose={() => setModal(false)} footer={
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
          <Field label="Tür">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Başlangıç"><input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Bitiş"><input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Aylık Ücret (₺)"><input className="input" type="number" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} />
            Otomatik yenile
          </label>
          <Field label="Not"><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
