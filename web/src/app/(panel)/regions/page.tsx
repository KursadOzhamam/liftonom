"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

type Region = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  technicians_count?: number;
};
type Paginated = { data: Region[]; meta: { current_page: number; last_page: number; total: number } };

const empty = { name: "", code: "", description: "", is_active: true };

export default function RegionsPage() {
  const [rows, setRows] = useState<Region[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: typeof empty }>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/regions?search=${encodeURIComponent(search)}&page=${page}`);
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
        await api("/regions", { method: "POST", body: modal.form });
      } else {
        await api(`/regions/${modal.id}`, { method: "PUT", body: modal.form });
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
    if (!confirm("Bu bölgeyi silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/regions/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Silinemedi.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bölgeler</h1>
          <p className="mt-1 text-sm text-muted">
            {meta?.total ?? 0} bölge · Saha bölgelerini tanımlayın ve teknisyen atayın.
          </p>
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
            placeholder="Bölge adı, kod…"
            className="input pl-9"
          />
        </div>
      </div>

      {/* Tablo */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Bölge</th>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium text-center">Teknisyen</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz bölge eklenmemiş.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.code ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{r.description ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{r.technicians_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.is_active ? "bg-primary-light text-primary" : "bg-surface text-ink-soft"
                    }`}>
                      {r.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: "edit", id: r.id, form: {
                          name: r.name, code: r.code ?? "", description: r.description ?? "", is_active: r.is_active,
                        } })}
                        className="text-muted hover:text-primary" title="Düzenle"
                      ><Pencil size={16} /></button>
                      <button onClick={() => remove(r.id)} className="text-muted hover:text-danger" title="Sil">
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
              {modal.mode === "create" ? "Yeni Bölge" : "Bölge Düzenle"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Bölge Adı *</span>
                <input className="input" value={modal.form.name}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Kod</span>
                <input className="input" value={modal.form.code}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, code: e.target.value } })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Açıklama</span>
                <textarea className="input" rows={3} value={modal.form.description}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, description: e.target.value } })} />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={modal.form.is_active}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, is_active: e.target.checked } })} />
                <span className="text-sm text-ink-soft">Aktif</span>
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
