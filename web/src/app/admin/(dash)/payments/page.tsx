"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import Modal, { Field } from "@/components/Modal";
import { Plus } from "lucide-react";

type Payment = {
  id: number; tenant_id: number; tenant_name: string; amount: number;
  currency: string; status: string; paid_at: string | null; created_at: string;
};
type Tenant = { id: number; name: string };

const empty = { tenant_id: "", amount: "", currency: "TRY", status: "success", paid_at: "" };
const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "Başarılı", cls: "bg-success/10 text-success" },
  pending: { label: "Bekliyor", cls: "bg-warning/10 text-warning" },
  failed: { label: "Başarısız", cls: "bg-danger/10 text-danger" },
  refunded: { label: "İade", cls: "bg-info/10 text-info" },
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<Payment[]>("/admin/payments", { admin: true }));
      const t = await api<{ data?: Tenant[] } | Tenant[]>("/admin/tenants?per_page=200", { admin: true });
      setTenants(Array.isArray(t) ? t : (t.data ?? []));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const total = rows.filter((r) => r.status === "success").reduce((s, r) => s + Number(r.amount), 0);

  async function save() {
    setSaving(true);
    try {
      await api("/admin/payments", { method: "POST", admin: true, body: {
        tenant_id: Number(form.tenant_id), amount: Number(form.amount) || 0,
        currency: form.currency, status: form.status, paid_at: form.paid_at || null,
      } });
      setModal(false); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ödemeler & Faturalar</h1>
          <p className="mt-1 text-sm text-muted">Tüm firmaların abonelik ödemeleri.</p>
        </div>
        <button onClick={() => { setForm(empty); setModal(true); }} className="btn-primary"><Plus size={16} /> Ödeme Kaydet</button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Toplam Tahsilat</div>
          <div className="mt-1 text-2xl font-bold text-success">{TRY(total)}</div>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Ödeme Sayısı</div>
          <div className="mt-1 text-2xl font-bold text-ink">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Başarılı</div>
          <div className="mt-1 text-2xl font-bold text-primary">{rows.filter((r) => r.status === "success").length}</div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium text-right">Tutar</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Ödeme Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Henüz ödeme kaydı yok.</td></tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{p.tenant_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{TRY(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[p.status]?.cls ?? "bg-surface text-muted"}`}>
                        {STATUS[p.status]?.label ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{dateTR(p.paid_at) || dateTR(p.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title="Ödeme Kaydet" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.tenant_id || !form.amount} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Firma *">
            <select className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
              <option value="">Firma seçin…</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tutar (₺) *"><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Ödeme Tarihi"><input className="input" type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} /></Field>
          </div>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="success">Başarılı</option>
              <option value="pending">Bekliyor</option>
              <option value="failed">Başarısız</option>
              <option value="refunded">İade</option>
            </select>
          </Field>
        </Modal>
      )}
    </div>
  );
}
