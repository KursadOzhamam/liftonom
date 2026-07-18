"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Row = {
  id: number; customer_id: number | null; building_id: number | null;
  form_data: string | null; status: string; created_at: string;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [
  { v: "draft", l: "Taslak" }, { v: "sent", l: "Gönderildi" }, { v: "approved", l: "Onaylandı" },
];
const empty = { customer_id: "", building_id: "", status: "draft", note: "", capacity: "", stops: "" };

function parseNote(raw: string | null): string {
  if (!raw) return "—";
  try {
    const o = JSON.parse(raw);
    return o.note || o.capacity ? [o.capacity && `${o.capacity} kg`, o.stops && `${o.stops} durak`, o.note].filter(Boolean).join(" · ") : "—";
  } catch { return "—"; }
}

export default function AtfPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");

  const custName = (id: number | null) => customers.find((c) => c.id === id)?.label ?? "—";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>("/atf");
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/atf", { method: "POST", body: {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        building_id: form.building_id ? Number(form.building_id) : null,
        status: form.status,
        form_data: { note: form.note, capacity: form.capacity, stops: form.stops },
      } });
      setModal(false); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!(await confirm("Form silinsin mi?"))) return;
    await api(`/atf/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Asansör Talep Formu</h1>
          <p className="mt-1 text-sm text-muted">{total} form · Yeni asansör talebi (ATF) kayıtları.</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Detay</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz talep formu yok.</td></tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">#{a.id}</td>
                  <td className="px-4 py-3 font-medium text-ink">{custName(a.customer_id)}</td>
                  <td className="px-4 py-3 text-ink-soft">{parseNote(a.form_data)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{dateTR(a.created_at)}</td>
                  <td className="px-4 py-3"><Badge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => remove(a.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Talep Formu" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={create} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
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
            <Field label="Kapasite (kg)"><input className="input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            <Field label="Durak Sayısı"><input className="input" type="number" value={form.stops} onChange={(e) => setForm({ ...form, stops: e.target.value })} /></Field>
          </div>
          <Field label="Açıklama"><textarea className="input min-h-20" placeholder="Talep detayları…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
        </Modal>
      )}
    </div>
  );
}
