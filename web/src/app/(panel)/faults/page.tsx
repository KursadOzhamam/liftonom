"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { useConfirm } from "@/components/ConfirmDialog";
import LiveMap from "@/components/LiveMap";
import { Plus, MapPin, X, Eye, Pencil, List, LayoutGrid, AlertTriangle, CheckCircle2 } from "lucide-react";

type Row = {
  id: number; title: string | null; type: string | null; priority: string; status: string; description: string | null;
  created_at: string; elevator_name: string | null; building_name: string | null; customer_name: string | null;
  assigned_user?: { assigned_user_id: number; name: string; surname: string | null } | null;
};
type Paginated = { data: Row[]; meta: { current_page: number; last_page: number; total: number } };
type Summary = { active: number; completed: number; today: number; today_resolved: number; unowned: number; mine: number };
type Tech = { id: number; name: string; surname?: string | null };

const PRIO: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "#FEE2E2", text: "#DC2626", label: "Acil" }, high: { bg: "#FFEDD5", text: "#EA580C", label: "Yüksek" },
  normal: { bg: "#F3F4F6", text: "#6B7280", label: "Normal" }, low: { bg: "#EFF6FF", text: "#2563EB", label: "Düşük" },
};
const ST: Record<string, { bg: string; text: string; label: string }> = {
  reported: { bg: "#FEF3C7", text: "#B45309", label: "Bildirildi" }, acknowledged: { bg: "#DBEAFE", text: "#2563EB", label: "İşleme Alındı" },
  dispatched: { bg: "#E0E7FF", text: "#4F46E5", label: "Yola Çıktı" }, inspected: { bg: "#FEF9C3", text: "#CA8A04", label: "Kontrol Edildi" },
  repairing: { bg: "#FFEDD5", text: "#EA580C", label: "Onarımda" }, completed: { bg: "#DCFCE7", text: "#16A34A", label: "Tamamlandı" },
};
const FAULT_TYPES = ["Mekanik", "Elektrik", "Kapı", "Kumanda", "Motor", "Fren", "Kabin", "Halat", "Diğer"];
const STEP: Record<string, { label: string; ep: string } | undefined> = {
  reported: { label: "İşleme Al", ep: "acknowledge" }, acknowledged: { label: "Yola Çıkar", ep: "dispatch" },
  inspected: { label: "Onarıma Başla", ep: "start-repair" }, repairing: { label: "Tamamla", ep: "complete" },
};
const TABS: [string, string][] = [["acik", "Açık"], ["mine", "Bana Atanan"], ["sahipsiz", "Sahipsiz"], ["cozulen", "Çözülenler"], ["tum", "Tümü"]];

function rel(iso: string) {
  const d = new Date(iso).getTime(); const s = Math.floor((Date.now() - d) / 1000);
  if (s < 90) return "şimdi";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  return `${Math.floor(s / 86400)} gün önce`;
}
const empty = {
  elevator_id: "", assigned_user_id: "", title: "", type: "Diğer", priority: "normal", status: "reported",
  code: "", contact_name: "", contact_phone: "", description: "", symptoms: "", diagnosis: "", solution: "", work_done: "",
  under_warranty: false, billable: true, notes: "",
};
type Form = typeof empty;

export default function FaultsPage() {
  const confirm = useConfirm();
  const elevators = useOptions("/elevators");
  const [techs, setTechs] = useState<Tech[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("acik");
  const [board, setBoard] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number }>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [inspect, setInspect] = useState<null | { id: number; diagnosis: string; needsPart: boolean; partDetails: string }>(null);
  const [mapFault, setMapFault] = useState<number | null>(null);
  const [view, setView] = useState<Row | null>(null);

  useEffect(() => { api<{ data: Tech[] }>("/users?role=technician&per_page=100").then((r) => setTechs(r.data)).catch(() => {}); }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (priority) p.set("priority", priority);
    if (tab === "acik") p.set("open", "true");
    else if (tab === "mine") p.set("mine", "true");
    else if (tab === "sahipsiz") { p.set("unassigned", "true"); p.set("open", "true"); }
    else if (tab === "cozulen") p.set("status", "completed");
    p.set("page", String(page)); p.set("per_page", "50");
    return p.toString();
  }, [search, priority, tab, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([api<Paginated>(`/fault-reports?${qs}`), api<Summary>("/fault-reports/summary")]);
      setRows(r.data); setMeta(r.meta); setSum(s);
    } finally { setLoading(false); }
  }, [qs]);
  useEffect(() => { const h = setTimeout(load, 200); return () => clearTimeout(h); }, [load]);

  function set(patch: Partial<Form>) { setForm((f) => ({ ...f, ...patch })); }
  function openCreate() { setForm(empty); setModal({ mode: "create" }); }
  async function openEdit(id: number) {
    try {
      const o = await api<Record<string, unknown>>(`/fault-reports/${id}`);
      const g = (k: string) => (o[k] == null ? "" : String(o[k]));
      setForm({
        elevator_id: g("elevator_id") || String((o["elevator"] as { id?: number })?.id ?? ""), assigned_user_id: g("assigned_user_id"),
        title: g("title"), type: g("type") || "Diğer", priority: g("priority") || "normal", status: g("status") || "reported",
        code: g("code"), contact_name: g("contact_name"), contact_phone: g("contact_phone"), description: g("description"),
        symptoms: g("symptoms"), diagnosis: g("fault_diagnosis"), solution: g("resolution_note"), work_done: g("work_done"),
        under_warranty: o["under_warranty"] === true, billable: o["billable"] !== false, notes: g("notes"),
      });
      setModal({ mode: "edit", id });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
  }

  async function save() {
    setSaving(true);
    try {
      const f = form; const s = (v: string) => (v.trim() ? v.trim() : null);
      const body = {
        title: s(f.title), type: f.type, priority: f.priority, status: f.status, code: s(f.code),
        assigned_user_id: f.assigned_user_id ? Number(f.assigned_user_id) : null,
        contact_name: s(f.contact_name), contact_phone: s(f.contact_phone), description: f.description,
        symptoms: s(f.symptoms), diagnosis: s(f.diagnosis), solution: s(f.solution), work_done: s(f.work_done),
        under_warranty: f.under_warranty, billable: f.billable, notes: s(f.notes),
      };
      if (modal?.mode === "edit") await api(`/fault-reports/${modal.id}`, { method: "PUT", body });
      else await api("/fault-reports", { method: "POST", body: { ...body, elevator_id: Number(f.elevator_id) } });
      setModal(null); setForm(empty); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function step(id: number, status: string) {
    if (status === "dispatched") { setInspect({ id, diagnosis: "", needsPart: false, partDetails: "" }); return; }
    const st = STEP[status]; if (!st) return;
    await api(`/fault-reports/${id}/${st.ep}`, { method: "POST", body: {} }); load();
  }
  async function doInspect() {
    if (!inspect) return;
    await api(`/fault-reports/${inspect.id}/inspect`, { method: "POST", body: { diagnosis: inspect.diagnosis, needsPart: inspect.needsPart, partDetails: inspect.needsPart ? inspect.partDetails : null } });
    setInspect(null); load();
  }

  const kanbanCols = ["reported", "acknowledged", "dispatched", "inspected", "repairing", "completed"];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Arıza Bildirimleri</h1>
          <p className="mt-1 text-sm text-muted">{sum?.active ?? 0} açık arıza · {sum?.unowned ?? 0} sahipsiz · {sum?.mine ?? 0} size atanmış</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni Arıza</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="accent-card rounded-2xl border border-line bg-card p-5 shadow-card" style={{ "--accent": "var(--color-warning)" } as React.CSSProperties}>
          <div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-muted">Bugün Yeni</span><AlertTriangle size={16} className="text-warning" /></div>
          <div className="mt-2 text-3xl font-bold text-ink">{sum?.today ?? 0}</div>
        </div>
        <div className="accent-card rounded-2xl border border-line bg-card p-5 shadow-card" style={{ "--accent": "var(--color-success)" } as React.CSSProperties}>
          <div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-muted">Bugün Çözülen</span><CheckCircle2 size={16} className="text-success" /></div>
          <div className="mt-2 text-3xl font-bold text-ink">{sum?.today_resolved ?? 0}</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {TABS.map(([v, l]) => {
              const count = v === "acik" ? sum?.active : v === "mine" ? sum?.mine : v === "sahipsiz" ? sum?.unowned : v === "cozulen" ? sum?.completed : undefined;
              return (
                <button key={v} onClick={() => { setTab(v); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === v ? "bg-primary text-white" : "text-muted hover:bg-surface hover:text-ink"}`}>
                  {l}{count != null && count > 0 ? <span className={`ml-1.5 rounded-full px-1.5 text-xs ${tab === v ? "bg-white/25" : "bg-surface"}`}>{count}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex rounded-lg border border-line p-0.5">
            <button onClick={() => setBoard("list")} className={`rounded-md p-1.5 ${board === "list" ? "bg-primary text-white" : "text-muted"}`} title="Liste"><List size={16} /></button>
            <button onClick={() => setBoard("kanban")} className={`rounded-md p-1.5 ${board === "kanban" ? "bg-primary text-white" : "text-muted"}`} title="Kanban"><LayoutGrid size={16} /></button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Bina, müşteri, asansör veya arıza başlığı…" className="input flex-1" />
          <select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }} className="input w-40"><option value="">Tüm Öncelikler</option>{Object.entries(PRIO).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}</select>
        </div>
      </div>

      {board === "list" ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">Arıza</th>
              <th className="px-4 py-3 font-medium">Bina / Asansör</th><th className="px-4 py-3 font-medium">Teknisyen</th>
              <th className="px-4 py-3 font-medium">Süre</th><th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>)
              : rows.length === 0 ? (<tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>)
              : rows.map((f) => {
                const p = PRIO[f.priority] ?? PRIO.normal; const st = ST[f.status] ?? { bg: "#F3F4F6", text: "#6B7280", label: f.status };
                const step2 = STEP[f.status] || (f.status === "dispatched" ? { label: "Kontrol Et", ep: "" } : undefined);
                return (
                  <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-mono text-xs text-muted">#{f.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{f.title || f.description || "—"}</div>
                      <div className="mt-0.5 flex items-center gap-1.5"><span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: p.bg, color: p.text }}>{p.label}</span><span className="text-xs text-muted">{f.type ?? ""}</span></div>
                    </td>
                    <td className="px-4 py-3"><div className="text-ink-soft">{f.building_name ?? "—"}</div><div className="text-xs text-muted">{f.elevator_name ?? "—"}</div></td>
                    <td className="px-4 py-3">{f.assigned_user ? <span className="inline-flex items-center gap-1.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{f.assigned_user.name?.[0]}</span><span className="text-ink-soft">{f.assigned_user.name}</span></span> : <span className="text-muted">— Sahipsiz —</span>}</td>
                    <td className="px-4 py-3"><div className="text-ink-soft">{rel(f.created_at)}</div><div className="text-xs text-muted">{new Date(f.created_at).toLocaleDateString("tr-TR")}</div></td>
                    <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: st.bg, color: st.text }}>{st.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        {(f.status === "dispatched" || f.status === "inspected" || f.status === "repairing") && <button onClick={() => setMapFault(f.id)} className="text-muted hover:text-primary" title="Konum"><MapPin size={15} /></button>}
                        <button onClick={() => setView(f)} className="text-muted hover:text-primary" title="Detay"><Eye size={15} /></button>
                        {step2 && <button onClick={() => step(f.id, f.status)} className="rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/20">{step2.label}</button>}
                        <button onClick={() => openEdit(f.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kanbanCols.map((col) => (
            <div key={col} className="rounded-xl border border-line bg-surface/50 p-2">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: ST[col].text }}>{ST[col].label}<span className="rounded-full bg-card px-1.5 text-muted">{rows.filter((r) => r.status === col).length}</span></div>
              <div className="space-y-2">
                {rows.filter((r) => r.status === col).map((f) => {
                  const p = PRIO[f.priority] ?? PRIO.normal;
                  return (
                    <button key={f.id} onClick={() => setView(f)} className="w-full rounded-lg border border-line bg-card p-2.5 text-left shadow-card hover:border-primary/30">
                      <div className="text-sm font-medium text-ink">{f.title || f.description || `#${f.id}`}</div>
                      <div className="mt-1 text-xs text-muted">{f.building_name ?? "—"} · {f.elevator_name ?? "—"}</div>
                      <div className="mt-1.5 flex items-center justify-between"><span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: p.bg, color: p.text }}>{p.label}</span><span className="text-[10px] text-muted">{rel(f.created_at)}</span></div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {board === "list" && meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Önceki</button>
          <span className="text-muted">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Sonraki</button>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.mode === "edit" ? "Arıza Düzenle" : "Yeni Arıza Bildirimi"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FR label="Asansör" req><select className="input" value={form.elevator_id} onChange={(e) => set({ elevator_id: e.target.value })} disabled={modal.mode === "edit"}><option value="">Asansör ara…</option>{elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></FR>
                <FR label="Atanan Teknisyen"><select className="input" value={form.assigned_user_id} onChange={(e) => set({ assigned_user_id: e.target.value })}><option value="">— Atanmamış —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}</select></FR>
                <FR label="Arıza Başlığı" req><input className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} /></FR>
                <FR label="Arıza Tipi"><select className="input" value={form.type} onChange={(e) => set({ type: e.target.value })}>{FAULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></FR>
                <FR label="Öncelik"><select className="input" value={form.priority} onChange={(e) => set({ priority: e.target.value })}><option value="urgent">Acil</option><option value="high">Yüksek</option><option value="normal">Normal</option><option value="low">Düşük</option></select></FR>
                <FR label="Durum"><select className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>{Object.entries(ST).map(([v, o]) => <option key={v} value={v}>{o.label}</option>)}</select></FR>
                <FR label="Arıza Kodu"><input className="input" value={form.code} onChange={(e) => set({ code: e.target.value })} /></FR>
                <FR label="İlgili Kişi"><input className="input" value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} /></FR>
                <FR label="İlgili Kişi Tel."><div className="flex"><span className="inline-flex items-center rounded-l-[10px] border border-r-0 border-line bg-surface px-3 text-sm text-muted">+90</span><input className="input rounded-l-none" placeholder="5XX XXX XX XX" value={form.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} /></div></FR>
              </div>
              <FR label="Açıklama" req><textarea className="input min-h-20" value={form.description} onChange={(e) => set({ description: e.target.value })} /></FR>
              <FR label="Belirtiler"><textarea className="input min-h-16" value={form.symptoms} onChange={(e) => set({ symptoms: e.target.value })} /></FR>
              <FR label="Teşhis"><textarea className="input min-h-16" value={form.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} /></FR>
              <FR label="Çözüm"><textarea className="input min-h-16" value={form.solution} onChange={(e) => set({ solution: e.target.value })} /></FR>
              <FR label="Yapılan İşlemler"><textarea className="input min-h-16" value={form.work_done} onChange={(e) => set({ work_done: e.target.value })} /></FR>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={form.under_warranty} onChange={(e) => set({ under_warranty: e.target.checked })} /> Garanti kapsamında</label>
                <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={form.billable} onChange={(e) => set({ billable: e.target.checked })} /> Faturalandırılabilir</label>
              </div>
              <FR label="Notlar"><textarea className="input min-h-16" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></FR>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !form.elevator_id || !form.title.trim() || !form.description.trim()} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detay */}
      {view && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setView(null)}>
          <div className="pop-in surface-pop w-full max-w-lg rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">Arıza #{view.id}</h2><button onClick={() => setView(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface"><X size={18} /></button></div>
            <div className="mt-1 flex items-center gap-2"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: PRIO[view.priority]?.bg, color: PRIO[view.priority]?.text }}>{PRIO[view.priority]?.label}</span><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: ST[view.status]?.bg, color: ST[view.status]?.text }}>{ST[view.status]?.label}</span></div>
            <h3 className="mt-3 text-base font-semibold text-ink">{view.title || "—"}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <V label="Bina" value={view.building_name ?? "—"} /><V label="Asansör" value={view.elevator_name ?? "—"} />
              <V label="Müşteri" value={view.customer_name ?? "—"} /><V label="Teknisyen" value={view.assigned_user?.name ?? "— Sahipsiz —"} />
              <V label="Tip" value={view.type ?? "—"} /><V label="Tarih" value={new Date(view.created_at).toLocaleString("tr-TR")} />
            </div>
            {view.description && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm text-ink-soft">{view.description}</p>}
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => { const id = view.id; setView(null); openEdit(id); }} className="btn-primary"><Pencil size={15} /> Düzenle</button></div>
          </div>
        </div>
      )}

      {/* Kontrol (inspect) */}
      {inspect && (
        <div className="fade-in fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setInspect(null)}>
          <div className="pop-in surface-pop w-full max-w-md rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">Kontrol Bilgileri</h2>
            <p className="mt-1 text-sm text-muted">Kontrol sonucunu girin. Kaydedince müşteriye WhatsApp ile bildirilir.</p>
            <div className="mt-3 space-y-3">
              <FR label="Arıza nedir?" req><input className="input" placeholder="örn. Kapı motoru arızalı" value={inspect.diagnosis} onChange={(e) => setInspect({ ...inspect, diagnosis: e.target.value })} /></FR>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inspect.needsPart} onChange={(e) => setInspect({ ...inspect, needsPart: e.target.checked })} /> Parça değişimi gerekiyor</label>
              {inspect.needsPart && <FR label="Hangi parça?"><input className="input" value={inspect.partDetails} onChange={(e) => setInspect({ ...inspect, partDetails: e.target.value })} /></FR>}
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setInspect(null)} className="btn-ghost">İptal</button><button onClick={doInspect} disabled={!inspect.diagnosis} className="btn-primary">Kaydet & WhatsApp</button></div>
          </div>
        </div>
      )}

      {mapFault !== null && <LiveMap faultId={mapFault} onClose={() => setMapFault(null)} />}
    </div>
  );
}

function FR({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}</span>{children}</label>;
}
function V({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted">{label}</div><div className="mt-0.5 text-ink">{value}</div></div>;
}
