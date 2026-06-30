"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Admin = {
  id: number; name: string | null; email: string; is_active: boolean;
  last_login_at: string | null; created_at: string;
};

const emptyNew = { name: "", email: "", password: "" };

export default function AdminsPage() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyNew);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api<Admin[]>("/admin/admins", { admin: true })); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(emptyNew); setModal(true); }
  function openEdit(a: Admin) { setEditId(a.id); setForm({ name: a.name ?? "", email: a.email, password: "" }); setModal(true); }

  async function save() {
    setSaving(true);
    try {
      if (editId) {
        await api(`/admin/admins/${editId}`, { method: "PUT", admin: true, body: {
          name: form.name, email: form.email, password: form.password || null,
        } });
      } else {
        await api("/admin/admins", { method: "POST", admin: true, body: form });
      }
      setModal(false); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function toggle(a: Admin) {
    try {
      await api(`/admin/admins/${a.id}`, { method: "PUT", admin: true, body: { is_active: !a.is_active } });
      load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Güncellenemedi."); }
  }

  async function remove(a: Admin) {
    if (!confirm(`${a.email} silinsin mi?`)) return;
    try {
      await api(`/admin/admins/${a.id}`, { method: "DELETE", admin: true });
      load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Platform Yöneticileri</h1>
          <p className="mt-1 text-sm text-muted">Süper admin paneline erişebilen hesaplar.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ad</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Son Giriş</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yönetici yok.</td></tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{a.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.email}</td>
                  <td className="px-4 py-3 text-xs text-muted">{a.last_login_at ? dateTR(a.last_login_at) : "Hiç"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(a)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${a.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {a.is_active ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                      <button onClick={() => remove(a)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Yönetici Düzenle" : "Yeni Yönetici"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.email || (!editId && !form.password)} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Ad"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="E-posta *"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={editId ? "Yeni Şifre (boş = değişmez)" : "Şifre * (min 6)"}>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
