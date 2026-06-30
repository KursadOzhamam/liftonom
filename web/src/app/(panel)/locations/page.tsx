"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

type Row = { id: number; name: string; code: string | null; description: string | null };
type Paginated = { data: Row[]; meta: { total: number } };
const empty = { name: "", code: "", description: "" };

export default function LocationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/locations"); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(r: Row) { setEditId(r.id); setForm({ name: r.name, code: r.code ?? "", description: r.description ?? "" }); setModal(true); }
  async function save() {
    setSaving(true);
    try { await api(editId ? `/locations/${editId}` : "/locations", { method: editId ? "PUT" : "POST", body: form }); setModal(false); load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); } finally { setSaving(false); }
  }
  async function remove(id: number) { if (!confirm("Silinsin mi?")) return; await api(`/locations/${id}`, { method: "DELETE" }); load(); }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Lokasyonlar</h1>
          <p className="mt-1 text-sm text-muted">{total} depo / raf lokasyonu</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Lokasyon</th>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Henüz lokasyon yok.</td></tr>
            ) : rows.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3"><div className="flex items-center gap-2 font-medium text-ink"><MapPin size={15} className="text-primary" />{l.name}</div></td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{l.code ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{l.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(l)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                    <button onClick={() => remove(l.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Lokasyon Düzenle" : "Yeni Lokasyon"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.name} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Ad *"><input className="input" placeholder="örn. Ana Depo - Raf A3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Kod"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Açıklama"><textarea className="input min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
