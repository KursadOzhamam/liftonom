"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil } from "lucide-react";

type Plan = {
  id: number; code: string; name: string; monthly_price: number;
  max_users: number | null; max_elevators: number | null; is_active: boolean;
};

const empty = { code: "", name: "", monthly_price: "", max_users: "", max_elevators: "", is_active: true };

export default function AdminPlansPage() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api<Plan[]>("/admin/plans", { admin: true })); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(p: Plan) {
    setEditId(p.id);
    setForm({
      code: p.code, name: p.name, monthly_price: String(p.monthly_price),
      max_users: p.max_users?.toString() ?? "", max_elevators: p.max_elevators?.toString() ?? "", is_active: p.is_active,
    });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        code: form.code, name: form.name, monthly_price: Number(form.monthly_price) || 0,
        max_users: form.max_users ? Number(form.max_users) : null,
        max_elevators: form.max_elevators ? Number(form.max_elevators) : null,
        is_active: form.is_active,
      };
      await api(editId ? `/admin/plans/${editId}` : "/admin/plans", {
        method: editId ? "PUT" : "POST", admin: true, body,
      });
      setModal(false); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Planlar</h1>
          <p className="mt-1 text-sm text-muted">Abonelik planları ve limitleri.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni Plan</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium text-right">Aylık Ücret</th>
              <th className="px-4 py-3 font-medium text-center">Maks. Kullanıcı</th>
              <th className="px-4 py-3 font-medium text-center">Maks. Asansör</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Henüz plan yok.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.code}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{TRY(p.monthly_price)}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{p.max_users ?? "∞"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{p.max_elevators ?? "∞"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {p.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Plan Düzenle" : "Yeni Plan"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.code || !form.name} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kod *"><input className="input disabled:opacity-60" placeholder="pro" value={form.code} disabled={!!editId} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Ad *"><input className="input" placeholder="Pro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          </div>
          <Field label="Aylık Ücret (₺) *"><input className="input" type="number" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maks. Kullanıcı (boş = sınırsız)"><input className="input" type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} /></Field>
            <Field label="Maks. Asansör (boş = sınırsız)"><input className="input" type="number" value={form.max_elevators} onChange={(e) => setForm({ ...form, max_elevators: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Plan aktif (yeni kayıtlarda seçilebilir)
          </label>
        </Modal>
      )}
    </div>
  );
}
