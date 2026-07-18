"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Row = {
  id: number; source_type: string | null; status: string;
  description: string | null; planned_date: string | null;
  elevator?: { name: string } | null;
  assigned_user?: { name: string; surname?: string } | null;
};
type Paginated = { data: Row[]; meta: { current_page: number; last_page: number; total: number } };
type Option = { id: number; name: string; surname?: string | null; code?: string | null };
type Detail = {
  id: number; elevator_id: number | null; assigned_user_id: number | null;
  planned_date: string | null; status: string; description: string | null;
  elevator?: { name: string } | null;
};

const SOURCE: Record<string, string> = { fault: "Arıza", maintenance: "Bakım", manual: "Manuel" };
const WO_STATUS: Record<string, string> = { open: "Açık", in_progress: "Devam", done: "Tamamlandı", cancelled: "İptal" };

const empty = { elevator_id: "", assigned_user_id: "", planned_date: "", status: "open", description: "" };

const userLabel = (u: Option) => `${u.name}${u.surname ? " " + u.surname : ""}`;

export default function WorkOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [elevators, setElevators] = useState<Option[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [modal, setModal] = useState<
    null | { mode: "create" | "edit"; id?: number; elevatorName?: string; form: typeof empty }
  >(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/work-orders?status=${statusFilter}&page=${page}`);
      setRows(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Açılır liste verileri (bir kez). /users yalnızca yöneticiye açık — hata olursa boş kalır.
  useEffect(() => {
    api<{ data: Option[] }>("/elevators?per_page=100").then((r) => setElevators(r.data)).catch(() => {});
    api<{ data: Option[] }>("/users?per_page=100").then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  async function openEdit(id: number) {
    try {
      const w = await api<Detail>(`/work-orders/${id}`);
      setModal({
        mode: "edit", id, elevatorName: w.elevator?.name,
        form: {
          elevator_id: w.elevator_id ? String(w.elevator_id) : "",
          assigned_user_id: w.assigned_user_id ? String(w.assigned_user_id) : "",
          planned_date: w.planned_date ? String(w.planned_date).slice(0, 10) : "",
          status: w.status ?? "open",
          description: w.description ?? "",
        },
      });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi.");
    }
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const f = modal.form;
      if (modal.mode === "create") {
        await api("/work-orders", { method: "POST", body: {
          elevator_id: f.elevator_id ? Number(f.elevator_id) : null,
          assigned_user_id: f.assigned_user_id ? Number(f.assigned_user_id) : null,
          planned_date: f.planned_date || null,
          description: f.description,
        } });
      } else {
        await api(`/work-orders/${modal.id}`, { method: "PUT", body: {
          assigned_user_id: f.assigned_user_id ? Number(f.assigned_user_id) : null,
          planned_date: f.planned_date || null,
          status: f.status,
          description: f.description,
        } });
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
    if (!confirm("Bu iş emrini silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/work-orders/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Silinemedi.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">İş Emirleri</h1>
          <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} iş emri</p>
        </div>
        <button onClick={() => setModal({ mode: "create", form: { ...empty } })} className="btn-primary">
          <Plus size={16} /> Yeni
        </button>
      </div>

      {/* Filtre */}
      <div className="mt-5 flex items-center gap-2">
        <select className="input max-w-xs" value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">Tüm durumlar</option>
          {Object.entries(WO_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Tablo */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Kaynak</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Atanan</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Planlanan</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">#{w.id}</td>
                  <td className="px-4 py-3 text-ink-soft">{SOURCE[w.source_type ?? ""] ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{w.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {w.assigned_user ? `${w.assigned_user.name}${w.assigned_user.surname ? " " + w.assigned_user.surname : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{w.description ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(w.planned_date)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: w.status === "done" ? "#DCFCE7" : w.status === "cancelled" ? "#FEE2E2" : "#DBEAFE",
                        color: w.status === "done" ? "#16A34A" : w.status === "cancelled" ? "#DC2626" : "#2563EB",
                      }}>
                      {WO_STATUS[w.status] ?? w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(w.id)} className="text-muted hover:text-primary" title="Düzenle">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(w.id)} className="text-muted hover:text-danger" title="Sil">
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
              {modal.mode === "create" ? "Yeni İş Emri" : "İş Emri Düzenle"}
            </h2>
            <div className="mt-4 space-y-3">
              {/* Asansör — düzenlemede değiştirilemez */}
              {modal.mode === "create" ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Asansör</span>
                  <select className="input" value={modal.form.elevator_id}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, elevator_id: e.target.value } })}>
                    <option value="">— Seçiniz —</option>
                    {elevators.map((el) => (
                      <option key={el.id} value={el.id}>{el.name}{el.code ? ` (${el.code})` : ""}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Asansör</span>
                  <input className="input" value={modal.elevatorName ?? "—"} disabled />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Atanan Teknisyen</span>
                <select className="input" value={modal.form.assigned_user_id}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, assigned_user_id: e.target.value } })}>
                  <option value="">— Atanmadı —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Planlanan Tarih</span>
                <input type="date" className="input" value={modal.form.planned_date}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, planned_date: e.target.value } })} />
              </label>

              {modal.mode === "edit" && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Durum</span>
                  <select className="input" value={modal.form.status}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
                    {Object.entries(WO_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Açıklama *</span>
                <textarea className="input" rows={3} value={modal.form.description}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, description: e.target.value } })} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.description} className="btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
