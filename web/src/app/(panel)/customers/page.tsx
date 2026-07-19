"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useConfirm } from "@/components/ConfirmDialog";
import { useOptions } from "@/lib/hooks";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";

type Customer = {
  id: number; type: string; name: string; authorized_person: string | null;
  phone: string | null; email: string | null; city: string | null; is_active?: boolean; buildings_count?: number;
};
type Paginated = { data: Customer[]; meta: { current_page: number; last_page: number; total: number } };

const empty = {
  type: "corporate", name: "", authorized_person: "", phone: "", email: "",
  tax_number: "", tax_office: "", city: "", district: "", address: "", region_id: "", notes: "", is_active: true,
};
type Form = typeof empty;
const str = (v: string) => (v.trim() ? v.trim() : null);

export default function CustomersPage() {
  const confirm = useConfirm();
  const regions = useOptions("/regions");
  const [rows, setRows] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: Form }>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/customers?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data); setMeta(res.meta);
    } finally { setLoading(false); }
  }, [search, page]);
  useEffect(() => { load(); }, [load]);

  function set(patch: Partial<Form>) { setModal((m) => (m ? { ...m, form: { ...m.form, ...patch } } : m)); }
  function openCreate() { setModal({ mode: "create", form: { ...empty } }); }
  async function openEdit(id: number) {
    try {
      const c = await api<Record<string, unknown>>(`/customers/${id}`);
      const g = (k: string) => (c[k] == null ? "" : String(c[k]));
      setModal({ mode: "edit", id, form: {
        type: g("type") || "corporate", name: g("name"), authorized_person: g("authorized_person"),
        phone: g("phone"), email: g("email"), tax_number: g("tax_number"), tax_office: g("tax_office"),
        city: g("city"), district: g("district"), address: g("address"), region_id: g("region_id"),
        notes: g("notes"), is_active: c["is_active"] !== false,
      } });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Müşteri yüklenemedi."); }
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const f = modal.form;
      const body = {
        type: f.type, name: f.name, authorized_person: str(f.authorized_person),
        phone: str(f.phone), email: str(f.email), tax_number: str(f.tax_number), tax_office: str(f.tax_office),
        city: str(f.city), district: str(f.district), address: str(f.address),
        region_id: f.region_id ? Number(f.region_id) : null, notes: str(f.notes), is_active: f.is_active,
      };
      if (modal.mode === "create") await api("/customers", { method: "POST", body });
      else await api(`/customers/${modal.id}`, { method: "PUT", body });
      setModal(null); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!(await confirm("Bu müşteriyi silmek istediğinize emin misiniz?"))) return;
    await api(`/customers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Müşteriler</h1>
          <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} kayıt</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Ad, telefon, e-posta…" className="input pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ad / Ünvan</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Şehir</th>
              <th className="px-4 py-3 font-medium text-center">Bina</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/customers/${c.id}`} className="text-primary hover:underline">{c.name}</a>
                    {c.authorized_person && <div className="text-xs font-normal text-muted">Yetkili: {c.authorized_person}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.type === "corporate" ? "bg-primary-light text-primary" : "bg-surface text-ink-soft"}`}>
                      {c.type === "corporate" ? "Kurumsal" : "Bireysel"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.city ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{c.buildings_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                      <button onClick={() => remove(c.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Önceki</button>
          <span className="text-muted">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Sonraki</button>
        </div>
      )}

      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.mode === "create" ? "Yeni Müşteri" : "Müşteri Düzenle"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Tip">
                  <select className="input" value={modal.form.type} onChange={(e) => set({ type: e.target.value })}>
                    <option value="corporate">Kurumsal</option>
                    <option value="individual">Bireysel</option>
                  </select>
                </F>
                <F label="Ad / Ünvan (Site adı)" req>
                  <input className="input" placeholder="Örn. Yeşil Vadi Sitesi" value={modal.form.name} onChange={(e) => set({ name: e.target.value })} />
                </F>
                <F label="Yetkili Kişi">
                  <input className="input" placeholder="Örn. Ahmet Yılmaz (Yönetici)" value={modal.form.authorized_person} onChange={(e) => set({ authorized_person: e.target.value })} />
                </F>
                <F label="Cep Telefonu">
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-[10px] border border-r-0 border-line bg-surface px-3 text-sm text-muted">+90</span>
                    <input className="input rounded-l-none" placeholder="5XX XXX XX XX" value={modal.form.phone} onChange={(e) => set({ phone: e.target.value })} />
                  </div>
                </F>
                <F label="E-posta"><input className="input" type="email" placeholder="info@firma.com" value={modal.form.email} onChange={(e) => set({ email: e.target.value })} /></F>
                <F label="Vergi No / TCKN"><input className="input" value={modal.form.tax_number} onChange={(e) => set({ tax_number: e.target.value })} /></F>
                <F label="Vergi Dairesi"><input className="input" value={modal.form.tax_office} onChange={(e) => set({ tax_office: e.target.value })} /></F>
                <F label="Bölge">
                  <select className="input" value={modal.form.region_id} onChange={(e) => set({ region_id: e.target.value })}>
                    <option value="">— Yok —</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </F>
                <F label="Şehir"><input className="input" value={modal.form.city} onChange={(e) => set({ city: e.target.value })} /></F>
                <F label="İlçe"><input className="input" value={modal.form.district} onChange={(e) => set({ district: e.target.value })} /></F>
              </div>
              <F label="Adres"><textarea className="input min-h-16" value={modal.form.address} onChange={(e) => set({ address: e.target.value })} /></F>
              <F label="Notlar"><textarea className="input min-h-16" value={modal.form.notes} onChange={(e) => set({ notes: e.target.value })} /></F>
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={modal.form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
                Aktif
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.name.trim()} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}</span>
      {children}
    </label>
  );
}
