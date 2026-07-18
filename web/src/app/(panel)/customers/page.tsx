"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

type Customer = {
  id: number;
  type: string;
  name: string;
  authorized_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  buildings_count?: number;
};
type Paginated = { data: Customer[]; meta: { current_page: number; last_page: number; total: number } };

const empty = { type: "corporate", name: "", authorized_person: "", phone: "", email: "", city: "" };

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: typeof empty }>(null);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/customers?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.mode === "create") {
        await api("/customers", { method: "POST", body: modal.form });
      } else {
        await api(`/customers/${modal.id}`, { method: "PUT", body: modal.form });
      }
      setModal(null);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
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
        <button onClick={() => setModal({ mode: "create", form: { ...empty } })} className="btn-primary">
          <Plus size={16} /> Yeni
        </button>
      </div>

      {/* Filtre */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Ad, telefon, e-posta…"
            className="input pl-9"
          />
        </div>
      </div>

      {/* Tablo */}
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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.type === "corporate" ? "bg-primary-light text-primary" : "bg-surface text-ink-soft"
                    }`}>
                      {c.type === "corporate" ? "Kurumsal" : "Bireysel"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.city ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{c.buildings_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: "edit", id: c.id, form: {
                          type: c.type, name: c.name, authorized_person: c.authorized_person ?? "",
                          phone: c.phone ?? "", email: c.email ?? "", city: c.city ?? "",
                        } })}
                        className="text-muted hover:text-primary" title="Düzenle"
                      ><Pencil size={16} /></button>
                      <button onClick={() => remove(c.id)} className="text-muted hover:text-danger" title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Önceki</button>
          <span className="text-muted">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Sonraki</button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">
              {modal.mode === "create" ? "Yeni Müşteri" : "Müşteri Düzenle"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Tip</span>
                <select className="input" value={modal.form.type}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, type: e.target.value } })}>
                  <option value="corporate">Kurumsal</option>
                  <option value="individual">Bireysel</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Ad / Ünvan (Site adı) *</span>
                <input className="input" value={modal.form.name} placeholder="Örn. Yeşil Vadi Sitesi"
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Yetkili Kişi</span>
                <input className="input" value={modal.form.authorized_person} placeholder="Örn. Ahmet Yılmaz (Yönetici)"
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, authorized_person: e.target.value } })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Telefon</span>
                  <input className="input" value={modal.form.phone}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, phone: e.target.value } })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Şehir</span>
                  <input className="input" value={modal.form.city}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, city: e.target.value } })} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">E-posta</span>
                <input className="input" value={modal.form.email}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, email: e.target.value } })} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.name} className="btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
