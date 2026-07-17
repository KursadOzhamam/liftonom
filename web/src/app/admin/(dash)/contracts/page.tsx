"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Contract = {
  id: number; tenant_id: number; tenant_name: string; title: string; plan: string | null;
  amount: number; currency: string; start_date: string | null; end_date: string | null;
  status: string; notes: string | null;
};
type Tenant = { id: number; name: string };

const empty = { tenant_id: "", title: "", plan: "", amount: "", currency: "TRY", start_date: "", end_date: "", status: "active", notes: "" };
const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-success/10 text-success" },
  expired: { label: "Süresi Doldu", cls: "bg-warning/10 text-warning" },
  cancelled: { label: "İptal", cls: "bg-danger/10 text-danger" },
};

export default function AdminContractsPage() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<Contract[]>("/admin/contracts", { admin: true }));
      const t = await api<{ data?: Tenant[] } | Tenant[]>("/admin/tenants?per_page=200", { admin: true });
      setTenants(Array.isArray(t) ? t : (t.data ?? []));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(c: Contract) {
    setEditId(c.id);
    setForm({
      tenant_id: String(c.tenant_id), title: c.title, plan: c.plan ?? "", amount: String(c.amount),
      currency: c.currency, start_date: c.start_date ?? "", end_date: c.end_date ?? "", status: c.status, notes: c.notes ?? "",
    });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        tenant_id: Number(form.tenant_id), title: form.title, plan: form.plan || null,
        amount: Number(form.amount) || 0, currency: form.currency,
        start_date: form.start_date || null, end_date: form.end_date || null,
        status: form.status, notes: form.notes || null,
      };
      await api(editId ? `/admin/contracts/${editId}` : "/admin/contracts", { method: editId ? "PUT" : "POST", admin: true, body });
      setModal(false); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function del(c: Contract) {
    if (!confirm(`"${c.title}" sözleşmesi silinsin mi?`)) return;
    try { await api(`/admin/contracts/${c.id}`, { method: "DELETE", admin: true }); load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sözleşmeler</h1>
          <p className="mt-1 text-sm text-muted">Firmalarla abonelik sözleşmeleri.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni Sözleşme</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Başlık</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium text-right">Tutar</th>
                <th className="px-4 py-3 font-medium">Dönem</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Henüz sözleşme yok.</td></tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{c.tenant_name}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.title}</td>
                    <td className="px-4 py-3 text-muted">{c.plan ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{TRY(c.amount)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{dateTR(c.start_date)} – {dateTR(c.end_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[c.status]?.cls ?? "bg-surface text-muted"}`}>
                        {STATUS[c.status]?.label ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                        <button onClick={() => del(c)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={editId ? "Sözleşme Düzenle" : "Yeni Sözleşme"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.tenant_id || !form.title} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Firma *">
            <select className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} disabled={!!editId}>
              <option value="">Firma seçin…</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Başlık *"><input className="input" placeholder="2026 Yıllık Abonelik" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan"><input className="input" placeholder="pro" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></Field>
            <Field label="Tutar (₺)"><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Başlangıç"><input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Bitiş"><input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Aktif</option>
              <option value="expired">Süresi Doldu</option>
              <option value="cancelled">İptal</option>
            </select>
          </Field>
          <Field label="Notlar"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
