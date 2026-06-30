"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Trash2 } from "lucide-react";

type Row = {
  id: number; kind: string; title: string | null; status: string; created_at: string;
  form_data: string | null;
  customer?: { name: string } | null; elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [{ v: "draft", l: "Taslak" }, { v: "completed", l: "Tamamlandı" }, { v: "approved", l: "Onaylandı" }];

function note(raw: string | null): string {
  if (!raw) return "—";
  try { return JSON.parse(raw).note || "—"; } catch { return "—"; }
}

/** Kurtarma Formu (kind=rescue) & Eğitim Tutanağı (kind=training) ortak görünümü. */
export default function DocumentFormsView({ kind, title, subtitle, noteLabel }: { kind: string; title: string; subtitle: string; noteLabel: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", customer_id: "", building_id: "", elevator_id: "", note: "", status: "draft" });
  const [saving, setSaving] = useState(false);

  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");
  const elevators = useOptions("/elevators");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>(`/document-forms?kind=${kind}`); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  function openNew() { setForm({ title: "", customer_id: "", building_id: "", elevator_id: "", note: "", status: "draft" }); setModal(true); }
  async function save() {
    setSaving(true);
    try {
      await api("/document-forms", { method: "POST", body: {
        kind, title: form.title || null,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        building_id: form.building_id ? Number(form.building_id) : null,
        elevator_id: form.elevator_id ? Number(form.elevator_id) : null,
        status: form.status, form_data: { note: form.note },
      } });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); } finally { setSaving(false); }
  }
  async function remove(id: number) { if (!confirm("Form silinsin mi?")) return; await api(`/document-forms/${id}`, { method: "DELETE" }); load(); }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt · {subtitle}</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Başlık</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Henüz kayıt yok.</td></tr>
            ) : rows.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-medium text-ink">{d.title ?? `#${d.id}`}</td>
                <td className="px-4 py-3 text-ink-soft">{d.customer?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{d.elevator?.name ?? "—"}</td>
                <td className="px-4 py-3 max-w-xs truncate text-ink-soft">{note(d.form_data)}</td>
                <td className="px-4 py-3 text-xs text-muted">{dateTR(d.created_at)}</td>
                <td className="px-4 py-3"><Badge status={d.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end"><button onClick={() => remove(d.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={`Yeni ${title}`} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Başlık"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Müşteri">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— (opsiyonel)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bina">
              <select className="input" value={form.building_id} onChange={(e) => setForm({ ...form, building_id: e.target.value })}>
                <option value="">—</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="Asansör">
              <select className="input" value={form.elevator_id} onChange={(e) => setForm({ ...form, elevator_id: e.target.value })}>
                <option value="">—</option>
                {elevators.map((el) => <option key={el.id} value={el.id}>{el.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label={noteLabel}><textarea className="input min-h-24" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
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
