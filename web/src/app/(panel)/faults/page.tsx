"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import LiveMap from "@/components/LiveMap";
import { Plus, MapPin, X } from "lucide-react";

type Row = {
  id: number; priority: string; status: string; description: string; created_at: string;
  estimated_repair?: string | null;
  elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [
  { v: "reported", l: "Arıza Bildirildi" }, { v: "acknowledged", l: "İşleme Alındı" },
  { v: "dispatched", l: "Servis Yola Çıktı" }, { v: "inspected", l: "Kontrol Edildi" },
  { v: "repairing", l: "Arıza Gideriliyor" }, { v: "completed", l: "İş Tamamlandı" },
];
const FAULT_TYPES = ["Mekanik", "Elektrik", "Kapı", "Kumanda", "Motor", "Fren", "Kabin", "Halat", "Diğer"];
const emptyForm = {
  elevator_id: "", assigned_user_id: "", title: "", type: "Diğer", priority: "normal", status: "reported",
  code: "", contact_name: "", contact_phone: "",
  description: "", symptoms: "", diagnosis: "", solution: "", work_done: "",
  under_warranty: false, billable: true, notes: "",
};

export default function FaultsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [inspect, setInspect] = useState<null | { id: number; diagnosis: string; needsPart: boolean; partDetails: string }>(null);
  const [mapFault, setMapFault] = useState<number | null>(null);

  const elevators = useOptions("/elevators");
  const techs = useOptions("/users?role=technician");
  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/fault-reports${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      const s = (v: string) => (v.trim() ? v.trim() : null);
      await api("/fault-reports", { method: "POST", body: {
        elevator_id: Number(form.elevator_id), assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
        title: s(form.title), type: form.type, priority: form.priority, status: form.status, code: s(form.code),
        contact_name: s(form.contact_name), contact_phone: s(form.contact_phone),
        description: form.description, symptoms: s(form.symptoms), diagnosis: s(form.diagnosis),
        solution: s(form.solution), work_done: s(form.work_done),
        under_warranty: form.under_warranty, billable: form.billable, notes: s(form.notes),
      } });
      setModal(false); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function step(id: number, endpoint: string) {
    await api(`/fault-reports/${id}/${endpoint}`, { method: "POST", body: {} });
    load();
  }
  async function doInspect() {
    if (!inspect) return;
    await api(`/fault-reports/${inspect.id}/inspect`, { method: "POST", body: {
      diagnosis: inspect.diagnosis, needsPart: inspect.needsPart,
      partDetails: inspect.needsPart ? inspect.partDetails : null,
    } });
    setInspect(null); load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Arıza Bildirimleri</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Öncelik</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">Yaşam Döngüsü →</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((f) => (
                <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">#{f.id}</td>
                  <td className="px-4 py-3 font-medium text-ink">{f.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{f.description}</td>
                  <td className="px-4 py-3"><Badge status={f.priority} /></td>
                  <td className="px-4 py-3"><Badge status={f.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {(f.status === "dispatched" || f.status === "inspected" || f.status === "repairing") && (
                        <button onClick={() => setMapFault(f.id)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                          <MapPin size={13} /> Konum
                        </button>
                      )}
                      {f.status === "reported" && (
                        <button onClick={() => step(f.id, "acknowledge")} className="rounded-lg bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/20">
                          İşleme Al
                        </button>
                      )}
                      {f.status === "acknowledged" && (
                        <button onClick={() => step(f.id, "dispatch")} className="rounded-lg bg-info/10 px-2.5 py-1 text-xs font-medium text-info hover:bg-info/20">
                          🚗 Yola Çıkar
                        </button>
                      )}
                      {f.status === "dispatched" && (
                        <button onClick={() => setInspect({ id: f.id, diagnosis: "", needsPart: false, partDetails: "" })} className="rounded-lg bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning hover:bg-warning/20">
                          🔍 Kontrol Et
                        </button>
                      )}
                      {f.status === "inspected" && (
                        <button onClick={() => step(f.id, "start-repair")} className="rounded-lg bg-info/10 px-2.5 py-1 text-xs font-medium text-info hover:bg-info/20">
                          🔧 Onarıma Başla
                        </button>
                      )}
                      {f.status === "repairing" && (
                        <button onClick={() => step(f.id, "complete")} className="rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/20">
                          ✓ İş Tamamlandı
                        </button>
                      )}
                      {f.status === "completed" && (
                        <span className="text-xs text-muted">Tamamlandı</span>
                      )}
                      {f.estimated_repair && f.status === "repairing" && (
                        <span className="text-xs text-muted">~{f.estimated_repair}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Yeni Arıza Bildirimi</h2>
              <button onClick={() => setModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldR label="Asansör" req>
                  <select className="input" value={form.elevator_id} onChange={(e) => set({ elevator_id: e.target.value })}>
                    <option value="">Asansör ara…</option>
                    {elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </FieldR>
                <FieldR label="Atanan Teknisyen">
                  <select className="input" value={form.assigned_user_id} onChange={(e) => set({ assigned_user_id: e.target.value })}>
                    <option value="">— Atanmamış —</option>
                    {techs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </FieldR>
                <FieldR label="Arıza Başlığı" req>
                  <input className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} />
                </FieldR>
                <FieldR label="Arıza Tipi">
                  <select className="input" value={form.type} onChange={(e) => set({ type: e.target.value })}>
                    {FAULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FieldR>
                <FieldR label="Öncelik">
                  <select className="input" value={form.priority} onChange={(e) => set({ priority: e.target.value })}>
                    <option value="urgent">Acil</option><option value="high">Yüksek</option>
                    <option value="normal">Normal</option><option value="low">Düşük</option>
                  </select>
                </FieldR>
                <FieldR label="Durum">
                  <select className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </FieldR>
                <FieldR label="Arıza Kodu">
                  <input className="input" value={form.code} onChange={(e) => set({ code: e.target.value })} />
                </FieldR>
                <FieldR label="İlgili Kişi">
                  <input className="input" value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} />
                </FieldR>
                <FieldR label="İlgili Kişi Tel.">
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-[10px] border border-r-0 border-line bg-surface px-3 text-sm text-muted">+90</span>
                    <input className="input rounded-l-none" placeholder="5XX XXX XX XX" value={form.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} />
                  </div>
                </FieldR>
              </div>

              <FieldR label="Açıklama" req>
                <textarea className="input min-h-20" value={form.description} onChange={(e) => set({ description: e.target.value })} />
              </FieldR>
              <FieldR label="Belirtiler">
                <textarea className="input min-h-16" value={form.symptoms} onChange={(e) => set({ symptoms: e.target.value })} />
              </FieldR>
              <FieldR label="Teşhis">
                <textarea className="input min-h-16" value={form.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} />
              </FieldR>
              <FieldR label="Çözüm">
                <textarea className="input min-h-16" value={form.solution} onChange={(e) => set({ solution: e.target.value })} />
              </FieldR>
              <FieldR label="Yapılan İşlemler">
                <textarea className="input min-h-16" value={form.work_done} onChange={(e) => set({ work_done: e.target.value })} />
              </FieldR>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={form.under_warranty} onChange={(e) => set({ under_warranty: e.target.checked })} />
                  Garanti kapsamında
                </label>
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={form.billable} onChange={(e) => set({ billable: e.target.checked })} />
                  Faturalandırılabilir
                </label>
              </div>

              <FieldR label="Notlar">
                <textarea className="input min-h-16" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </FieldR>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(false)} className="btn-ghost">İptal</button>
              <button onClick={create} disabled={saving || !form.elevator_id || !form.title.trim() || !form.description.trim()} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}

      {inspect && (
        <Modal title="Kontrol Bilgileri" onClose={() => setInspect(null)} footer={
          <>
            <button onClick={() => setInspect(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={doInspect} disabled={!inspect.diagnosis} className="btn-primary">Kaydet & WhatsApp Gönder</button>
          </>
        }>
          <p className="text-sm text-muted">Kontrol sonucunu girin. Kaydedince müşteriye WhatsApp ile bildirilir.</p>
          <Field label="Arıza nedir? *">
            <input className="input" placeholder="örn. Kapı motoru arızalı" value={inspect.diagnosis}
              onChange={(e) => setInspect({ ...inspect, diagnosis: e.target.value })} />
          </Field>
          <Field label="Parça değişimi gerekli mi?">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inspect.needsPart}
                onChange={(e) => setInspect({ ...inspect, needsPart: e.target.checked })} />
              <span>Evet, parça değişimi gerekiyor</span>
            </label>
          </Field>
          {inspect.needsPart && (
            <Field label="Hangi parça?">
              <input className="input" placeholder="örn. Kapı motoru (1 adet)" value={inspect.partDetails}
                onChange={(e) => setInspect({ ...inspect, partDetails: e.target.value })} />
            </Field>
          )}
        </Modal>
      )}

      {mapFault !== null && <LiveMap faultId={mapFault} onClose={() => setMapFault(null)} />}
    </div>
  );
}

function FieldR({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}</span>
      {children}
    </label>
  );
}
