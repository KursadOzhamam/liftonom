"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Row = {
  id: number; amount: number; period: string; valid_from: string | null; is_active: boolean; notes: string | null;
  customer?: { name: string } | null; building?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const PERIODS: Record<string, string> = { monthly: "Aylık", quarterly: "3 Aylık", yearly: "Yıllık" };
const empty = { customer_id: "", building_id: "", amount: "", period: "monthly", valid_from: "", notes: "", is_active: true };

export default function MaintenanceFeesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/maintenance-fees"); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(r: Row) {
    setEditId(r.id);
    setForm({ customer_id: "", building_id: "", amount: String(r.amount), period: r.period, valid_from: r.valid_from?.slice(0, 10) ?? "", notes: r.notes ?? "", is_active: r.is_active });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        building_id: form.building_id ? Number(form.building_id) : null,
        amount: Number(form.amount) || 0, period: form.period, valid_from: form.valid_from || null,
        notes: form.notes || null, is_active: form.is_active,
      };
      await api(editId ? `/maintenance-fees/${editId}` : "/maintenance-fees", { method: editId ? "PUT" : "POST", body });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }
  async function remove(id: number) { if (!confirm("Silinsin mi?")) return; await api(`/maintenance-fees/${id}`, { method: "DELETE" }); load(); }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bakım Ücretleri</h1>
          <p className="mt-1 text-sm text-muted">{total} ücret tanımı</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Bina</th>
              <th className="px-4 py-3 font-medium">Periyot</th>
              <th className="px-4 py-3 font-medium">Geçerlilik</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Henüz ücret tanımı yok.</td></tr>
            ) : rows.map((f) => (
              <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-medium text-ink">{f.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{f.building?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{PERIODS[f.period] ?? f.period}</td>
                <td className="px-4 py-3 text-ink-soft">{dateTR(f.valid_from)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{TRY(f.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{f.is_active ? "Aktif" : "Pasif"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                    <button onClick={() => remove(f.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Ücret Düzenle" : "Yeni Bakım Ücreti"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.amount} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Müşteri">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— (opsiyonel)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Bina">
            <select className="input" value={form.building_id} onChange={(e) => setForm({ ...form, building_id: e.target.value })}>
              <option value="">— (opsiyonel)</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tutar (₺) *"><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Periyot">
              <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                {Object.entries(PERIODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Geçerlilik Başlangıcı"><input className="input" type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif
          </label>
          <Field label="Not"><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
