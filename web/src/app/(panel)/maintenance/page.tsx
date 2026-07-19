"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, downloadFile } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  Plus, CheckCircle, FileDown, CalendarDays, Play, Check, ChevronRight, X, Eye, Pencil, Trash2,
  FileSpreadsheet, type LucideIcon,
} from "lucide-react";

type Row = {
  id: number; type: string; status: string; planned_date: string | null; completed_at: string | null;
  is_critical: boolean; assigned_users: string | null;
  elevator_name: string | null; building_name: string | null; customer_name: string | null;
};
type Paginated = { data: Row[]; meta: { current_page: number; last_page: number; total: number; per_page: number } };
type Tech = { id: number; name: string; surname?: string | null };
type ModeKey = "plan" | "now" | "past";

const TYPE: Record<string, string> = { periodic: "Periyodik Bakım", fault: "Arıza", revision: "Revizyon", annual: "Yıllık" };
const STATUS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#B45309", label: "Planlandı" },
  in_progress: { bg: "#DBEAFE", text: "#2563EB", label: "Devam Ediyor" },
  completed: { bg: "#DCFCE7", text: "#16A34A", label: "Tamamlandı" },
  cancelled: { bg: "#F3F4F6", text: "#6B7280", label: "İptal" },
};
const MODES: Record<ModeKey, { icon: LucideIcon; color: string; title: string; pick: string; banner: string; dateLabel: string }> = {
  plan: { icon: CalendarDays, color: "var(--color-primary)", title: "Bakım Planla", pick: "İleri tarihli planlı bakım — takvime düşer, teknisyen atanabilir.", banner: "Planlı bakım — kayıt sonrası listeye dönersiniz.", dateLabel: "Planlanan Tarih" },
  now: { icon: Play, color: "var(--color-success)", title: "Hemen Bakım Yap", pick: "Bugün için saha bakımı — kayıt oluşturulur, listeden tamamlanır.", banner: "Bugün tarihli bakım — listeden “Tamamla” ile bitirilir.", dateLabel: "Bakım Tarihi" },
  past: { icon: Check, color: "var(--color-warning)", title: "Geçmiş Bakım Kaydet", pick: "Geriye dönük tamamlanmış bakım — geçmiş tarihle tamamlandı kaydedilir.", banner: "Geçmiş kayıt — geçmiş tarihle “Tamamlandı”.", dateLabel: "Bakım Tarihi (geçmiş)" },
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { elevator_id: "", technician_id: "", type: "periodic", date: "", description: "", is_critical: false, notes: "" };
const emptyFilter = { scope: "all", status: "", type: "", from: "", to: "", region_id: "", technician_id: "", sort: "newest", search: "" };
type Filter = typeof emptyFilter;

export default function MaintenancePage() {
  const confirm = useConfirm();
  const elevators = useOptions("/elevators");
  const regions = useOptions("/regions");
  const [techs, setTechs] = useState<Tech[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [picker, setPicker] = useState(false);
  const [modal, setModal] = useState<null | { kind: "create" | "edit"; id?: number; cmode: ModeKey }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<Record<string, unknown> | null>(null);

  const techName = useMemo(() => {
    const map = new Map<number, string>();
    techs.forEach((t) => map.set(t.id, `${t.name} ${t.surname ?? ""}`.trim()));
    return map;
  }, [techs]);

  useEffect(() => { api<{ data: Tech[] }>("/users?role=technician&per_page=100").then((r) => setTechs(r.data)).catch(() => {}); }, []);

  const qs = useMemo(() => {
    const f = filter;
    const p = new URLSearchParams();
    if (f.search) p.set("search", f.search);
    if (f.scope === "mine") p.set("mine", "true");
    if (f.status) p.set("status", f.status);
    if (f.type) p.set("type", f.type);
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
    if (f.region_id) p.set("region_id", f.region_id);
    if (f.technician_id) p.set("technician_id", f.technician_id);
    p.set("sort", f.sort); p.set("page", String(page)); p.set("per_page", String(perPage));
    return p.toString();
  }, [filter, page, perPage]);

  const load = useCallback(async () => {
    setLoading(true); setSelected(new Set());
    try {
      const r = await api<Paginated>(`/maintenance?${qs}`);
      setRows(r.data); setMeta(r.meta);
    } finally { setLoading(false); }
  }, [qs]);
  useEffect(() => { const h = setTimeout(load, 200); return () => clearTimeout(h); }, [load]);

  function setF(patch: Partial<Filter>) { setPage(1); setFilter((f) => ({ ...f, ...patch })); }
  function set(patch: Partial<typeof emptyForm>) { setForm((f) => ({ ...f, ...patch })); }

  function openNew() { setForm(emptyForm); setPicker(true); }
  function pickMode(m: ModeKey) { setForm((f) => ({ ...f, date: m === "now" ? today() : f.date })); setPicker(false); setModal({ kind: "create", id: undefined, cmode: m }); }

  async function openEdit(id: number) {
    try {
      const o = await api<Record<string, unknown>>(`/maintenance/${id}`);
      let tech = "";
      try { const arr = JSON.parse(String(o["assigned_users"] ?? "[]")); if (Array.isArray(arr) && arr.length) tech = String(arr[0]); } catch { /* yok */ }
      setForm({
        elevator_id: o["elevator_id"] == null ? "" : String(o["elevator_id"]), technician_id: tech,
        type: String(o["type"] ?? "periodic"), date: String(o["planned_date"] ?? "").slice(0, 10),
        description: String(o["description"] ?? ""), is_critical: o["is_critical"] === true, notes: String(o["notes"] ?? ""),
      });
      setModal({ kind: "edit", id, cmode: "plan" });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const f = form;
      if (modal.kind === "edit") {
        await api(`/maintenance/${modal.id}`, { method: "PUT", body: {
          type: f.type, planned_date: f.date || null, assigned_users: f.technician_id ? [Number(f.technician_id)] : [],
          description: f.description || null, is_critical: f.is_critical, notes: f.notes || null,
        } });
      } else {
        const date = modal.cmode === "now" ? (f.date || today()) : f.date;
        const body: Record<string, unknown> = {
          elevator_id: Number(f.elevator_id), type: f.type, planned_date: date,
          assigned_users: f.technician_id ? [Number(f.technician_id)] : [],
          description: f.description || null, is_critical: f.is_critical, notes: f.notes || null,
        };
        if (modal.cmode === "past") { body.status = "completed"; body.completed_at = date; }
        await api("/maintenance", { method: "POST", body });
      }
      setModal(null); setForm(emptyForm); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function complete(id: number) {
    if (!(await confirm("Bu bakımı tamamlandı olarak işaretlemek istiyor musunuz?", { title: "Bakımı Tamamla", confirmText: "Tamamla", danger: false }))) return;
    await api(`/maintenance/${id}/complete`, { method: "POST", body: {} }); load();
  }
  async function remove(id: number) {
    if (!(await confirm("Bu bakım kaydını silmek istediğinize emin misiniz?"))) return;
    await api(`/maintenance/${id}`, { method: "DELETE" }); load();
  }
  async function bulkDelete() {
    if (!(await confirm(`${selected.size} bakım kaydını silmek istediğinize emin misiniz?`))) return;
    for (const id of selected) await api(`/maintenance/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }
  async function bulkAssign(techId: string) {
    if (!techId) return;
    for (const id of selected) await api(`/maintenance/${id}`, { method: "PUT", body: { assigned_users: [Number(techId)] } }).catch(() => {});
    load();
  }

  function exportCsv() {
    const head = ["#", "Durum", "Asansör", "Bina", "Müşteri", "Planlanan", "Gerçekleşen", "Tip", "Teknisyen", "Kritik"];
    const lines = rows.map((r) => {
      const tech = techIds(r.assigned_users).map((i) => techName.get(i) ?? i).join(", ");
      return [r.id, STATUS_CHIP[r.status]?.label ?? r.status, r.elevator_name ?? "", r.building_name ?? "", r.customer_name ?? "",
        r.planned_date ? dateTR(r.planned_date) : "", r.completed_at ? dateTR(r.completed_at) : "", TYPE[r.type] ?? r.type, tech, r.is_critical ? "Evet" : "Hayır"]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";");
    });
    const csv = "﻿" + [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "bakim-kayitlari.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const dirty = JSON.stringify(filter) !== JSON.stringify(emptyFilter);
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const M = modal ? MODES[modal.cmode] : MODES.plan;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-ink">Bakım Kayıtları</h1>
        <p className="mt-1 text-sm text-muted">Tek asansör için bakım planlayın, devam eden işi tamamlayın veya geçmiş kayıt girin. En güncel kayıtlar üstte.</p>
      </div>

      {/* Filtreler */}
      <div className="mt-5 rounded-2xl border border-line bg-card p-5 shadow-card">
        <input value={filter.search} onChange={(e) => setF({ search: e.target.value })} placeholder="Asansör adı, bina adı, müşteri, not…" className="input" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <L label="Kapsam"><select className="input" value={filter.scope} onChange={(e) => setF({ scope: e.target.value })}><option value="all">Firma Tümü</option><option value="mine">Bana Atanmış</option></select></L>
          <L label="Durum"><select className="input" value={filter.status} onChange={(e) => setF({ status: e.target.value })}><option value="">Tüm Durumlar</option><option value="pending">Planlandı</option><option value="in_progress">Devam Ediyor</option><option value="completed">Tamamlandı</option><option value="cancelled">İptal</option></select></L>
          <L label="Tip"><select className="input" value={filter.type} onChange={(e) => setF({ type: e.target.value })}><option value="">Tüm Tipler</option>{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></L>
          <L label="Tarih"><div className="flex gap-1"><input type="date" className="input" value={filter.from} onChange={(e) => setF({ from: e.target.value })} /><input type="date" className="input" value={filter.to} onChange={(e) => setF({ to: e.target.value })} /></div></L>
          <L label="Bölge"><select className="input" value={filter.region_id} onChange={(e) => setF({ region_id: e.target.value })}><option value="">Tüm Bölgeler</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></L>
          <L label="Teknisyen"><select className="input" value={filter.technician_id} onChange={(e) => setF({ technician_id: e.target.value })}><option value="">Tüm Teknisyenler</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}</select></L>
          <L label="Sırala"><select className="input" value={filter.sort} onChange={(e) => setF({ sort: e.target.value })}><option value="newest">En güncel (önerilen)</option><option value="oldest">En eski</option></select></L>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {dirty && <button onClick={() => setFilter(emptyFilter)} className="mr-auto text-sm font-medium text-primary hover:underline">Temizle</button>}
          <button onClick={exportCsv} className="btn-ghost text-sm"><FileSpreadsheet size={15} /> Excel'e Aktar (CSV)</button>
          <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni Bakım</button>
        </div>
      </div>

      {/* Toplu işlem toolbar */}
      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary-light/40 px-4 py-2.5 text-sm">
          <span className="font-medium text-ink">{selected.size} seçili</span>
          <select onChange={(e) => { bulkAssign(e.target.value); e.target.value = ""; }} className="input h-9 w-48 py-1 text-sm" defaultValue="">
            <option value="" disabled>Teknisyen ata…</option>
            {techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}
          </select>
          <button onClick={bulkDelete} className="inline-flex items-center gap-1 text-danger hover:underline"><Trash2 size={14} /> Seçilenleri sil</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted hover:text-ink">Seçimi bırak</button>
        </div>
      )}

      <p className="mt-3 text-sm text-muted">{meta?.total ?? 0} kayıt{meta && meta.total > 0 ? ` · ${(meta.current_page - 1) * meta.per_page + 1}–${Math.min(meta.current_page * meta.per_page, meta.total)} arası` : ""}</p>

      {/* Tablo */}
      <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3"><input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" /></th>
              <th className="px-3 py-3 font-medium">Durum</th>
              <th className="px-3 py-3 font-medium">Asansör</th>
              <th className="px-3 py-3 font-medium">Bina · Müşteri</th>
              <th className="px-3 py-3 font-medium">Planlanan</th>
              <th className="px-3 py-3 font-medium">Gerçekleşen</th>
              <th className="px-3 py-3 font-medium">Tip</th>
              <th className="px-3 py-3 font-medium">Teknisyen</th>
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : rows.map((m) => {
              const st = STATUS_CHIP[m.status] ?? { bg: "#F3F4F6", text: "#6B7280", label: m.status };
              const tech = techIds(m.assigned_users).map((i) => techName.get(i)).filter(Boolean).join(", ");
              const done = m.status === "completed" || m.status === "cancelled";
              return (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(m.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n; })} className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" /></td>
                  <td className="px-3 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.text }}>{st.label}</span>{m.is_critical && <span className="ml-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">kritik</span>}</td>
                  <td className="px-3 py-3 font-medium text-ink">{m.elevator_name ?? "—"}</td>
                  <td className="px-3 py-3"><div className="text-ink-soft">{m.building_name ?? "—"}</div><div className="text-xs text-muted">{m.customer_name ?? "—"}</div></td>
                  <td className="px-3 py-3 text-ink-soft">{dateTR(m.planned_date)}</td>
                  <td className="px-3 py-3 text-ink-soft">{m.completed_at ? dateTR(m.completed_at) : "—"}</td>
                  <td className="px-3 py-3 text-ink-soft">{TYPE[m.type] ?? m.type}</td>
                  <td className="px-3 py-3 text-ink-soft">{tech || <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">#{m.id}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2 text-xs">
                      {!done && <button onClick={() => complete(m.id)} className="inline-flex items-center gap-1 font-medium text-success hover:underline"><CheckCircle size={13} /> Tamamla</button>}
                      <button onClick={() => setView({ ...m })} className="text-muted hover:text-primary" title="Görüntüle"><Eye size={15} /></button>
                      <button onClick={() => downloadFile(`/maintenance/${m.id}/pdf`, `bakim-${m.id}.pdf`)} className="text-muted hover:text-primary" title="Termal Fiş"><FileDown size={15} /></button>
                      <button onClick={() => openEdit(m.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={15} /></button>
                      <button onClick={() => remove(m.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {meta && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>Toplam {meta.total} kayıt · Sayfa {meta.current_page} / {meta.last_page}</span>
          <div className="flex items-center gap-2">
            <span>Sayfa başına</span>
            <select value={perPage} onChange={(e) => { setPage(1); setPerPage(Number(e.target.value)); }} className="input h-9 w-20 py-1">
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">‹</button>
            <span className="rounded-lg bg-primary px-3 py-1 font-medium text-white">{meta.current_page}</span>
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">›</button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Görüntüle ile detayı, kalem ile düzenlemeyi açabilirsiniz. Çoklu seçim ile toplu teknisyen atama ve silme üstteki araç çubuğunda.</p>

      {/* Mod seçici */}
      {picker && (
        <div className="fade-in fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setPicker(false)}>
          <div className="pop-in surface-pop w-full max-w-md rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">Bakım Oluştur</h2>
            <p className="mt-0.5 text-sm text-muted">Bakımı nasıl oluşturmak istersiniz?</p>
            <div className="mt-4 space-y-2.5">
              {(Object.keys(MODES) as ModeKey[]).map((k) => { const opt = MODES[k]; const Icon = opt.icon; return (
                <button key={k} onClick={() => pickMode(k)} className="group flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-primary/40 hover:bg-surface">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${opt.color} 14%, transparent)`, color: opt.color }}><Icon size={19} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{opt.title}</span><span className="block text-xs text-muted">{opt.pick}</span></span>
                  <ChevronRight size={16} className="shrink-0 text-muted group-hover:text-primary" />
                </button>
              ); })}
            </div>
            <button onClick={() => setPicker(false)} className="mt-4 w-full text-center text-sm font-medium text-muted hover:text-ink">Vazgeç</button>
          </div>
        </div>
      )}

      {/* Form (create + edit) */}
      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.kind === "edit" ? "Bakım Düzenle" : "Yeni Bakım Kaydı"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {modal.kind === "create" && (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${M.color} 14%, transparent)`, color: M.color }}><M.icon size={18} /></span>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink">{M.title}</div><div className="text-xs text-muted">{M.banner}</div></div>
                  <button onClick={() => setPicker(true)} className="shrink-0 text-sm font-medium text-primary hover:underline">Değiştir</button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FF label="Asansör" req>
                  <select className="input" value={form.elevator_id} onChange={(e) => set({ elevator_id: e.target.value })} disabled={modal.kind === "edit"}>
                    <option value="">Asansör seçin…</option>
                    {elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </FF>
                <FF label="Teknisyen"><select className="input" value={form.technician_id} onChange={(e) => set({ technician_id: e.target.value })}><option value="">— Atanmamış —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}</select></FF>
                <FF label="Bakım Tipi"><select className="input" value={form.type} onChange={(e) => set({ type: e.target.value })}>{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FF>
                <FF label={modal.kind === "edit" ? "Tarih" : M.dateLabel} req><input type="date" className="input" value={form.date} onChange={(e) => set({ date: e.target.value })} /></FF>
              </div>
              <FF label="Açıklama"><textarea className="input min-h-16" value={form.description} onChange={(e) => set({ description: e.target.value })} /></FF>
              <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={form.is_critical} onChange={(e) => set({ is_critical: e.target.checked })} /> Kritik bakım</label>
              <FF label="Notlar"><textarea className="input min-h-16" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></FF>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !form.elevator_id || !form.date} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Görüntüle */}
      {view && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setView(null)}>
          <div className="pop-in surface-pop w-full max-w-lg rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">Bakım #{String(view["id"])}</h2><button onClick={() => setView(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface"><X size={18} /></button></div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <V label="Asansör" value={String(view["elevator_name"] ?? "—")} />
              <V label="Bina" value={String(view["building_name"] ?? "—")} />
              <V label="Müşteri" value={String(view["customer_name"] ?? "—")} />
              <V label="Durum" value={STATUS_CHIP[String(view["status"])]?.label ?? String(view["status"])} />
              <V label="Tip" value={TYPE[String(view["type"])] ?? String(view["type"])} />
              <V label="Teknisyen" value={techIds(view["assigned_users"] as string).map((i) => techName.get(i)).filter(Boolean).join(", ") || "—"} />
              <V label="Planlanan" value={view["planned_date"] ? dateTR(String(view["planned_date"])) : "—"} />
              <V label="Gerçekleşen" value={view["completed_at"] ? dateTR(String(view["completed_at"])) : "—"} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => downloadFile(`/maintenance/${view["id"]}/pdf`, `bakim-${view["id"]}.pdf`)} className="btn-ghost"><FileDown size={15} /> Termal Fiş</button>
              <button onClick={() => { const id = Number(view["id"]); setView(null); openEdit(id); }} className="btn-primary"><Pencil size={15} /> Düzenle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function techIds(raw: string | null | undefined): number[] {
  try { const a = JSON.parse(String(raw ?? "[]")); return Array.isArray(a) ? a.map(Number) : []; } catch { return []; }
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>{children}</label>;
}
function FF({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}</span>{children}</label>;
}
function V({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted">{label}</div><div className="mt-0.5 text-ink">{value}</div></div>;
}
