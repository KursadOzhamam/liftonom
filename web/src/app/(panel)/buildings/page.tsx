"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";

type Building = {
  id: number; name: string; city: string | null; floor_count: number | null;
  latitude?: number | string | null; longitude?: number | string | null;
  elevators_count?: number; customer?: { id: number; name: string } | null;
};
type Paginated = { data: Building[]; meta: { current_page: number; last_page: number; total: number } };
type Customer = { id: number; name: string };

const empty = { name: "", customer_id: "", city: "", floor_count: "", latitude: null as number | null, longitude: null as number | null };

export default function BuildingsPage() {
  const [rows, setRows] = useState<Building[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: typeof empty }>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/buildings?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data); setMeta(res.meta);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ data: Customer[] }>("/customers?per_page=100").then((r) => setCustomers(r.data));
  }, []);

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const body = {
        name: modal.form.name,
        customer_id: modal.form.customer_id ? Number(modal.form.customer_id) : null,
        city: modal.form.city || null,
        floor_count: modal.form.floor_count ? Number(modal.form.floor_count) : null,
        latitude: modal.form.latitude,
        longitude: modal.form.longitude,
      };
      if (modal.mode === "create") await api("/buildings", { method: "POST", body });
      else await api(`/buildings/${modal.id}`, { method: "PUT", body });
      setModal(null); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Bu binayı silmek istediğinize emin misiniz?")) return;
    await api(`/buildings/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Binalar</h1>
          <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} bina</p>
        </div>
        <button onClick={() => setModal({ mode: "create", form: { ...empty } })} className="btn-primary">
          <Plus size={16} /> Yeni
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Bina adı, şehir…" className="input pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Bina Adı</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Şehir</th>
              <th className="px-4 py-3 font-medium text-center">Kat</th>
              <th className="px-4 py-3 font-medium text-center">Asansör</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/buildings/${b.id}`} className="text-primary hover:underline">{b.name}</a>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{b.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{b.city ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{b.floor_count ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{b.elevators_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModal({ mode: "edit", id: b.id, form: {
                        name: b.name, customer_id: String(b.customer?.id ?? ""), city: b.city ?? "",
                        floor_count: String(b.floor_count ?? ""),
                        latitude: b.latitude != null ? Number(b.latitude) : null,
                        longitude: b.longitude != null ? Number(b.longitude) : null,
                      } })} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                      <button onClick={() => remove(b.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={16} /></button>
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
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">{modal.mode === "create" ? "Yeni Bina" : "Bina Düzenle"}</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Bina Adı *</span>
                <input className="input" value={modal.form.name}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Müşteri</span>
                <select className="input" value={modal.form.customer_id}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, customer_id: e.target.value } })}>
                  <option value="">Seçiniz…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Şehir</span>
                  <input className="input" value={modal.form.city}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, city: e.target.value } })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Kat Sayısı</span>
                  <input type="number" className="input" value={modal.form.floor_count}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, floor_count: e.target.value } })} />
                </label>
              </div>
              <div className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Konum (arıza yeri — adresten bul veya haritadan seç)</span>
                <LocationPicker
                  lat={modal.form.latitude}
                  lng={modal.form.longitude}
                  defaultQuery={[modal.form.name, modal.form.city].filter(Boolean).join(" ")}
                  onChange={(la, ln) => setModal((m) => m ? { ...m, form: { ...m.form, latitude: la, longitude: ln } } : m)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.name} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
