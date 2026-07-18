"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Row = {
  id: number; plate: string; brand: string | null; model: string | null; status: string;
  last_lat: number | null; last_lng: number | null; location_updated_at: string | null;
  assigned_user?: { name: string; surname?: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [{ v: "active", l: "Aktif" }, { v: "maintenance", l: "Bakımda" }, { v: "idle", l: "Boşta" }];
const empty = { plate: "", brand: "", model: "", assigned_user_id: "", status: "active", notes: "" };

export default function VehiclesPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const users = useOptions("/users");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/vehicles"); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(r: Row) {
    setEditId(r.id);
    setForm({ plate: r.plate, brand: r.brand ?? "", model: r.model ?? "", assigned_user_id: "", status: r.status, notes: "" });
    setModal(true);
  }
  async function save() {
    setSaving(true);
    try {
      const body = { plate: form.plate, brand: form.brand || null, model: form.model || null, assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null, status: form.status, notes: form.notes || null };
      await api(editId ? `/vehicles/${editId}` : "/vehicles", { method: editId ? "PUT" : "POST", body });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); } finally { setSaving(false); }
  }
  async function remove(id: number) { if (!(await confirm("Araç silinsin mi?"))) return; await api(`/vehicles/${id}`, { method: "DELETE" }); load(); }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Araç Takip</h1>
          <p className="mt-1 text-sm text-muted">{total} araç</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Plaka</th>
              <th className="px-4 py-3 font-medium">Araç</th>
              <th className="px-4 py-3 font-medium">Sürücü</th>
              <th className="px-4 py-3 font-medium">Konum</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz araç eklenmemiş.</td></tr>
            ) : rows.map((v) => (
              <tr key={v.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-mono font-medium text-ink">{v.plate}</td>
                <td className="px-4 py-3 text-ink-soft">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{v.assigned_user ? `${v.assigned_user.name} ${v.assigned_user.surname ?? ""}` : "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {v.last_lat != null ? (
                    <a href={`https://www.google.com/maps?q=${v.last_lat},${v.last_lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <MapPin size={12} /> {dateTR(v.location_updated_at)}
                    </a>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td className="px-4 py-3"><Badge status={v.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                    <button onClick={() => remove(v.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Araç Düzenle" : "Yeni Araç"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.plate} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Plaka *"><input className="input uppercase" placeholder="34 ABC 123" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marka"><input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="Model"><input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
          </div>
          <Field label="Sürücü / Personel">
            <select className="input" value={form.assigned_user_id} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}>
              <option value="">— (opsiyonel)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
          <Field label="Not"><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
