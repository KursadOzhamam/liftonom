"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Row = {
  id: number; name: string; phone: string | null; email: string | null;
  tax_number: string | null; address: string | null; notes: string | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const empty = { name: "", phone: "", email: "", tax_number: "", address: "", notes: "" };

export default function SuppliersPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(r: Row) {
    setEditId(r.id);
    setForm({ name: r.name, phone: r.phone ?? "", email: r.email ?? "", tax_number: r.tax_number ?? "", address: r.address ?? "", notes: r.notes ?? "" });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      await api(editId ? `/suppliers/${editId}` : "/suppliers", {
        method: editId ? "PUT" : "POST", body: form,
      });
      setModal(false); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!(await confirm("Tedarikçi silinsin mi?"))) return;
    await api(`/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tedarikçiler</h1>
          <p className="mt-1 text-sm text-muted">{total} tedarikçi</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5">
        <input className="input max-w-xs" placeholder="Tedarikçi ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ad</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Vergi No</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Henüz tedarikçi eklenmemiş.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.tax_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                      <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.name} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Ad *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Telefon"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="E-posta"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Vergi No"><input className="input" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></Field>
          <Field label="Adres"><textarea className="input min-h-16" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Not"><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
