"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadFile } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import { Plus, CheckCircle, FileDown, CalendarDays, Play, Check, ChevronRight, X, type LucideIcon } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Row = {
  id: number; type: string; status: string;
  planned_date: string | null; completed_at: string | null;
  elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };
type Tech = { id: number; name: string; surname?: string | null };
type ModeKey = "plan" | "now" | "past";

const TYPE: Record<string, string> = { periodic: "Periyodik", fault: "Arıza", revision: "Revizyon", annual: "Yıllık" };

const MODES: Record<ModeKey, { icon: LucideIcon; color: string; title: string; pick: string; banner: string; dateLabel: string }> = {
  plan: {
    icon: CalendarDays, color: "var(--color-primary)", title: "Bakım Planla",
    pick: "İleri tarihli planlı bakım — takvime düşer, teknisyen atanabilir.",
    banner: "Planlı bakım — kayıt sonrası listeye dönersiniz.", dateLabel: "Planlanan Tarih",
  },
  now: {
    icon: Play, color: "var(--color-success)", title: "Hemen Bakım Yap",
    pick: "Bugün için saha bakımı — kayıt oluşturulur, listeden tamamlanır.",
    banner: "Bugün tarihli bakım — kayıt sonrası listeden “Tamamla” ile bitirilir.", dateLabel: "Bakım Tarihi",
  },
  past: {
    icon: Check, color: "var(--color-warning)", title: "Geçmiş Bakım Kaydet",
    pick: "Geriye dönük tamamlanmış bakım — geçmiş tarihle tamamlandı kaydedilir.",
    banner: "Geçmiş kayıt — geçmiş tarihle “Tamamlandı” olarak kaydedilir.", dateLabel: "Bakım Tarihi (geçmiş)",
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { elevator_id: "", technician_id: "", type: "periodic", date: "", description: "", is_critical: false, notes: "" };

export default function MaintenancePage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [picker, setPicker] = useState(false);
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<ModeKey>("plan");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [techs, setTechs] = useState<Tech[]>([]);

  const elevators = useOptions("/elevators");
  useEffect(() => { api<{ data: Tech[] }>("/users?role=technician&per_page=100").then((r) => setTechs(r.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/maintenance${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(emptyForm); setMode("plan"); setPicker(true); }
  function pickMode(m: ModeKey) {
    setMode(m);
    setForm((f) => ({ ...f, date: m === "now" ? today() : f.date }));
    setPicker(false); setModal(true);
  }
  function set(patch: Partial<typeof emptyForm>) { setForm((f) => ({ ...f, ...patch })); }

  async function create() {
    setSaving(true);
    try {
      const date = mode === "now" ? (form.date || today()) : form.date;
      const body: Record<string, unknown> = {
        elevator_id: Number(form.elevator_id), type: form.type, planned_date: date,
        assigned_users: form.technician_id ? [Number(form.technician_id)] : [],
        description: form.description || null, is_critical: form.is_critical, notes: form.notes || null,
      };
      if (mode === "past") { body.status = "completed"; body.completed_at = date; }
      await api("/maintenance", { method: "POST", body });
      setModal(false); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function complete(id: number) {
    if (!(await confirm("Bu bakımı tamamlandı olarak işaretlemek istiyor musunuz?", { title: "Bakımı Tamamla", confirmText: "Tamamla", danger: false }))) return;
    await api(`/maintenance/${id}/complete`, { method: "POST", body: {} });
    load();
  }

  const M = MODES[mode];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bakım Kayıtları</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="in_progress">Devam Ediyor</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Planlanan</th>
              <th className="px-4 py-3 font-medium">Tamamlanma</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{m.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{TYPE[m.type] ?? m.type}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(m.planned_date)}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(m.completed_at)}</td>
                  <td className="px-4 py-3"><Badge status={m.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {m.status !== "completed" && m.status !== "cancelled" && (
                        <button onClick={() => complete(m.id)} className="inline-flex items-center gap-1 text-xs text-success hover:underline" title="Tamamla">
                          <CheckCircle size={14} /> Tamamla
                        </button>
                      )}
                      <button onClick={() => downloadFile(`/maintenance/${m.id}/pdf`, `bakim-${m.id}.pdf`)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline" title="Servis formu PDF">
                        <FileDown size={14} /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mod seçici */}
      {picker && (
        <div className="fade-in fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setPicker(false)}>
          <div className="pop-in surface-pop w-full max-w-md rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">Bakım Oluştur</h2>
            <p className="mt-0.5 text-sm text-muted">Bakımı nasıl oluşturmak istersiniz?</p>
            <div className="mt-4 space-y-2.5">
              {(Object.keys(MODES) as ModeKey[]).map((k) => {
                const opt = MODES[k]; const Icon = opt.icon;
                return (
                  <button key={k} onClick={() => pickMode(k)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-primary/40 hover:bg-surface">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${opt.color} 14%, transparent)`, color: opt.color }}><Icon size={19} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{opt.title}</span>
                      <span className="block text-xs text-muted">{opt.pick}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted transition group-hover:text-primary" />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPicker(false)} className="mt-4 w-full text-center text-sm font-medium text-muted hover:text-ink">Vazgeç</button>
          </div>
        </div>
      )}

      {/* Form */}
      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Yeni Bakım Kaydı</h2>
              <button onClick={() => setModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Mod banner */}
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${M.color} 14%, transparent)`, color: M.color }}><M.icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{M.title}</div>
                  <div className="text-xs text-muted">{M.banner}</div>
                </div>
                <button onClick={() => setPicker(true)} className="shrink-0 text-sm font-medium text-primary hover:underline">Değiştir</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Asansör" req>
                  <select className="input" value={form.elevator_id} onChange={(e) => set({ elevator_id: e.target.value })}>
                    <option value="">Asansör seçin…</option>
                    {elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </Field>
                <Field label="Teknisyen">
                  <select className="input" value={form.technician_id} onChange={(e) => set({ technician_id: e.target.value })}>
                    <option value="">— Atanmamış —</option>
                    {techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}
                  </select>
                </Field>
                <Field label="Bakım Tipi">
                  <select className="input" value={form.type} onChange={(e) => set({ type: e.target.value })}>
                    <option value="periodic">Periyodik Bakım</option>
                    <option value="fault">Arıza</option>
                    <option value="revision">Revizyon</option>
                    <option value="annual">Yıllık</option>
                  </select>
                </Field>
                <Field label={M.dateLabel} req>
                  <input type="date" className="input" value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </Field>
              </div>

              <FieldNote label="Açıklama">
                <textarea className="input min-h-20" value={form.description} onChange={(e) => set({ description: e.target.value })} />
                <p className="mt-1 text-xs text-muted">Yalnızca iç kayıt — bakım föyü (PDF) ve fişte görünmez.</p>
              </FieldNote>

              <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-4 py-3 text-sm text-ink-soft">
                Kontrol listesi, bulgular, kullanılan parça (stok), ekstra işçilik, müşteri memnuniyeti ve imza — bakım <b>tamamlanırken</b> (saha/teknisyen) girilir. Burada yalnızca asansör, teknisyen, tip ve tarih yeterli.
              </div>

              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={form.is_critical} onChange={(e) => set({ is_critical: e.target.checked })} />
                Kritik bakım
              </label>

              <FieldNote label="Notlar">
                <textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
                <p className="mt-1 text-xs text-muted">Yalnızca iç kayıt — bakım föyü (PDF) ve fişte görünmez.</p>
              </FieldNote>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(false)} className="btn-ghost">İptal</button>
              <button onClick={create} disabled={saving || !form.elevator_id || !form.date} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
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
function FieldNote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">{label}
        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">İç kayıt</span>
      </span>
      {children}
    </div>
  );
}
