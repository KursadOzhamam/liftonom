"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { Plus, Search, Pencil, Trash2, Power } from "lucide-react";

type Row = {
  id: number;
  name: string;
  surname: string | null;
  phone: string;
  email: string | null;
  role: string;
  region_id?: number | null;
  is_active: boolean;
  last_login_at: string | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const ROLES = [
  { v: "technician", l: "Teknisyen" },
  { v: "office", l: "Ofis" },
  { v: "accounting", l: "Muhasebe" },
  { v: "manager", l: "Yönetici" },
  { v: "viewer", l: "Görüntüleme" },
];
const ROLE: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.v, r.l]));

const empty = { name: "", surname: "", phone: "", email: "", role: "technician", region_id: "", password: "" };

export default function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: typeof empty }>(null);
  const [saving, setSaving] = useState(false);

  const regions = useOptions("/regions");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (roleFilter) qs.set("role", roleFilter);
      const r = await api<Paginated>(`/users${qs.toString() ? `?${qs}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const f = modal.form;
      const body = {
        name: f.name, surname: f.surname || null, email: f.email || null, role: f.role,
        region_id: f.region_id ? Number(f.region_id) : null,
        ...(f.password ? { password: f.password } : {}),
      };
      if (modal.mode === "create") {
        await api("/users", { method: "POST", body: { ...body, phone: f.phone } });
      } else {
        await api(`/users/${modal.id}`, { method: "PUT", body });
      }
      setModal(null); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function toggleActive(u: Row) {
    await api(`/users/${u.id}`, { method: "PUT", body: { is_active: !u.is_active } });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Bu personeli silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/users/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Silinemedi.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Personel</h1>
          <p className="mt-1 text-sm text-muted">{total} kullanıcı</p>
        </div>
        <button onClick={() => setModal({ mode: "create", form: { ...empty } })} className="btn-primary">
          <Plus size={16} /> Yeni Personel
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, telefon…" className="input pl-9" />
        </div>
        <select className="input max-w-[200px]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tüm Roller</option>
          {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ad Soyad</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Son Giriş</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{u.name} {u.surname}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "technician" ? "bg-info/10 text-info" : "bg-surface text-ink-soft border border-line"
                    }`}>{ROLE[u.role] ?? u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? "bg-success/10 text-success" : "bg-surface text-muted"
                    }`}>{u.is_active ? "Aktif" : "Pasif"}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => toggleActive(u)} className="text-muted hover:text-warning" title={u.is_active ? "Pasifleştir" : "Aktifleştir"}><Power size={16} /></button>
                      <button onClick={() => setModal({ mode: "edit", id: u.id, form: {
                        name: u.name, surname: u.surname ?? "", phone: u.phone, email: u.email ?? "",
                        role: u.role, region_id: String(u.region_id ?? ""), password: "",
                      } })} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                      <button onClick={() => remove(u.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === "create" ? "Yeni Personel" : "Personel Düzenle"} onClose={() => setModal(null)} footer={
          <>
            <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !modal.form.name || (modal.mode === "create" && !modal.form.phone)} className="btn-primary">
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </>
        }>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ad *">
              <input className="input" value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
            </Field>
            <Field label="Soyad">
              <input className="input" value={modal.form.surname} onChange={(e) => setModal({ ...modal, form: { ...modal.form, surname: e.target.value } })} />
            </Field>
          </div>
          <Field label="Telefon *">
            <input className="input" placeholder="05XX XXX XX XX" value={modal.form.phone}
              disabled={modal.mode === "edit"}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, phone: e.target.value } })} />
          </Field>
          <Field label="E-posta">
            <input className="input" type="email" value={modal.form.email} onChange={(e) => setModal({ ...modal, form: { ...modal.form, email: e.target.value } })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rol *">
              <select className="input" value={modal.form.role} onChange={(e) => setModal({ ...modal, form: { ...modal.form, role: e.target.value } })}>
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </Field>
            <Field label="Bölge">
              <select className="input" value={modal.form.region_id} onChange={(e) => setModal({ ...modal, form: { ...modal.form, region_id: e.target.value } })}>
                <option value="">—</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label={modal.mode === "create" ? "Şifre (boş bırakılırsa otomatik oluşturulur)" : "Yeni Şifre (değiştirmek için)"}>
            <input className="input" type="text" placeholder={modal.mode === "create" ? "SMS ile gönderilir" : "Boş bırak = değişmez"}
              value={modal.form.password} onChange={(e) => setModal({ ...modal, form: { ...modal.form, password: e.target.value } })} />
          </Field>
          {modal.mode === "create" && (
            <p className="text-xs text-muted">Personele giriş bilgileri SMS ile gönderilir. Teknisyenler bu bilgilerle mobil uygulamaya giriş yapar.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
