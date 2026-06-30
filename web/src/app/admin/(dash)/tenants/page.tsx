"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, setToken, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import Modal, { Field } from "@/components/Modal";
import { LogIn, Search, ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";

type Tenant = {
  id: number; name: string; slug: string; plan: string; plan_expires_at: string | null;
  is_active: boolean; sms_balance: number; users_count: number; elevators_count: number;
};
type Paginated = { data: Tenant[]; meta: { total: number; current_page: number; last_page: number } };

const PLAN: Record<string, string> = { trial: "Deneme", starter: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };

const emptyNew = { company_name: "", plan: "trial", manager_name: "", manager_surname: "", phone: "", email: "", password: "" };

export default function AdminTenantsPage() {
  const [rows, setRows] = useState<Tenant[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"]>({ total: 0, current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyNew);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (search) qs.set("search", search);
      const r = await api<Paginated>(`/admin/tenants?${qs}`, { admin: true });
      setRows(r.data); setMeta(r.meta);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(t: Tenant) {
    await api(`/admin/tenants/${t.id}`, { method: "PUT", admin: true, body: { is_active: !t.is_active } });
    load();
  }
  async function changePlan(t: Tenant, plan: string) {
    await api(`/admin/tenants/${t.id}`, { method: "PUT", admin: true, body: { plan } });
    load();
  }
  async function impersonate(t: Tenant) {
    if (!confirm(`${t.name} firmasına yönetici olarak giriş yapılacak. Devam?`)) return;
    try {
      const res = await api<{ token: string }>(`/admin/tenants/${t.id}/impersonate`, { method: "POST", admin: true });
      setToken(res.token);
      window.location.href = "/dashboard";
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Giriş yapılamadı.");
    }
  }

  async function createTenant() {
    setSaving(true);
    try {
      await api("/admin/tenants", { method: "POST", admin: true, body: {
        company_name: form.company_name, plan: form.plan,
        manager_name: form.manager_name, manager_surname: form.manager_surname || null,
        phone: form.phone, email: form.email || null, password: form.password,
      } });
      setModal(false); setForm(emptyNew); setPage(1); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Firma oluşturulamadı.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Firmalar</h1>
          <p className="mt-1 text-sm text-muted">{meta.total} firma</p>
        </div>
        <button onClick={() => { setForm(emptyNew); setModal(true); }} className="btn-primary"><Plus size={16} /> Yeni Firma</button>
      </div>

      <div className="mt-5 flex max-w-xs items-center gap-2 rounded-lg border border-line bg-card px-3">
        <Search size={16} className="text-muted" />
        <input className="w-full bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
          placeholder="Firma adı / slug ara…" value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Firma</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium text-center">Kullanıcı</th>
              <th className="px-4 py-3 font-medium text-center">Asansör</th>
              <th className="px-4 py-3 font-medium">Bitiş</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Firma bulunamadı.</td></tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="font-medium text-ink hover:text-primary">{t.name}</Link>
                    <div className="text-xs text-muted">/{t.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={t.plan} onChange={(e) => changePlan(t, e.target.value)}
                      className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink-soft">
                      {Object.entries(PLAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-soft">{t.users_count}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-ink-soft">{t.elevators_count}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(t.plan_expires_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(t)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {t.is_active ? "Aktif" : "Askıda"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => impersonate(t)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline" title="Firma adına giriş">
                        <LogIn size={14} /> Giriş
                      </button>
                      <Link href={`/admin/tenants/${t.id}`} className="text-muted hover:text-primary" title="Detay">
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-ink-soft disabled:opacity-40">
            <ChevronLeft size={15} /> Önceki
          </button>
          <span className="text-muted">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-ink-soft disabled:opacity-40">
            Sonraki <ChevronRight size={15} />
          </button>
        </div>
      )}

      {modal && (
        <Modal title="Yeni Firma" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={createTenant} disabled={saving || !form.company_name || !form.manager_name || !form.phone || !form.password} className="btn-primary">
              {saving ? "Oluşturuluyor…" : "Firma Oluştur"}
            </button>
          </>
        }>
          <Field label="Firma Adı *"><input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
          <Field label="Plan">
            <select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              {Object.entries(PLAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yönetici Adı *"><input className="input" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></Field>
            <Field label="Soyadı"><input className="input" value={form.manager_surname} onChange={(e) => setForm({ ...form, manager_surname: e.target.value })} /></Field>
          </div>
          <Field label="Telefon *"><input className="input" placeholder="05XX XXX XX XX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="E-posta"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Geçici Şifre * (min 6)"><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
