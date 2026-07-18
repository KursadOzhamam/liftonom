"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Region = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  responsible_user_id: number | null;
  responsible_name: string | null;
  is_active: boolean;
};
type Paginated = { data: Region[]; meta: { current_page: number; last_page: number; total: number } };
type Tech = { id: number; name: string; surname?: string | null };

const empty = { name: "", code: "", description: "", responsible_user_id: "", is_active: true };

export default function RegionsPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Region[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: typeof empty }>(null);
  const [saving, setSaving] = useState(false);
  const [techs, setTechs] = useState<Tech[]>([]);

  useEffect(() => {
    api<{ data: Tech[] }>("/users?role=technician&per_page=100").then((r) => setTechs(r.data)).catch(() => {});
  }, []);

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
      const body = {
        name: modal.form.name, code: modal.form.code || null, description: modal.form.description || null,
        responsible_user_id: modal.form.responsible_user_id ? Number(modal.form.responsible_user_id) : null,
        is_active: modal.form.is_active,
      };
      if (modal.mode === "create") {
        await api("/regions", { method: "POST", body });
      } else {
        await api(`/regions/${modal.id}`, { method: "PUT", body });
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
    if (!(await confirm("Bu bölgeyi silmek istediğinize emin misiniz?"))) return;
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
              <th className="px-4 py-3 font-medium">Sorumlu</th>
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
                  <td className="px-4 py-3 text-ink-soft">{r.responsible_name?.trim() || "—"}</td>
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
                          name: r.name, code: r.code ?? "", description: r.description ?? "",
                          responsible_user_id: String(r.responsible_user_id ?? ""), is_active: r.is_active,
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
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.mode === "create" ? "Yeni Bölge" : "Bölge Düzenle"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bölge Adı" req>
                  <input className="input" value={modal.form.name}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
                </Field>
                <Field label="Kod">
                  <input className="input" value={modal.form.code}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, code: e.target.value } })} />
                </Field>
                <Field label="Sorumlu Personel">
                  <select className="input" value={modal.form.responsible_user_id}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, responsible_user_id: e.target.value } })}>
                    <option value="">— Yok —</option>
                    {techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-2 pt-6 text-sm text-ink">
                  <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]"
                    checked={modal.form.is_active}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, is_active: e.target.checked } })} />
                  Aktif
                </label>
                <div className="sm:col-span-2">
                  <Field label="Açıklama">
                    <textarea className="input min-h-20" value={modal.form.description}
                      onChange={(e) => setModal({ ...modal, form: { ...modal.form, description: e.target.value } })} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.name.trim()} className="btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}</span>
      {children}
    </label>
  );
}
