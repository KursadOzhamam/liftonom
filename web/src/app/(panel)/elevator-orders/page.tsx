"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import { Plus, X } from "lucide-react";

type Row = {
  id: number; order_number: string | null; project_name: string | null; elevator_type: string | null;
  amount: number | null; status: string; customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };
type Opt = { id: number; label: string };

const STATUSES = [
  { v: "draft", l: "Taslak" }, { v: "approved", l: "Onaylandı" }, { v: "production", l: "Üretimde" },
  { v: "shipping", l: "Sevkiyatta" }, { v: "installing", l: "Montajda" },
  { v: "completed", l: "Tamamlandı" }, { v: "cancelled", l: "İptal" },
];
const TYPES = ["Elektrikli", "Hidrolik", "Panoramik", "Yük Asansörü", "Sedye Asansörü", "Yürüyen Merdiven", "Diğer"];

const empty = {
  order_number: "", project_name: "", customer_id: "", building_id: "",
  status: "draft", elevator_type: "Elektrikli",
  capacity_kg: "", capacity_persons: "", floor_count: "", stop_count: "", speed_ms: "", door_type: "",
  order_date: "", estimated_end: "", amount: "0", downpayment: "0", technical_details: "", notes: "",
};
type Form = typeof empty;
const s = (v: string) => (v.trim() ? v.trim() : null);
const n = (v: string) => (v.trim() ? Number(v) : null);

export default function ElevatorOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [extraCustomers, setExtraCustomers] = useState<Opt[]>([]);
  const [newCust, setNewCust] = useState<null | { name: string; phone: string }>(null);

  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");
  const allCustomers = [...extraCustomers, ...customers];
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/elevator-orders${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  function open() { setForm(empty); setNewCust(null); setModal(true); }

  async function addCustomer() {
    if (!newCust?.name.trim()) return;
    try {
      const c = await api<{ id: number }>("/customers", { method: "POST", body: { name: newCust.name, phone: newCust.phone || null } });
      setExtraCustomers((x) => [{ id: c.id, label: newCust.name }, ...x]);
      set({ customer_id: String(c.id) });
      setNewCust(null);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Müşteri eklenemedi."); }
  }

  async function create() {
    setSaving(true);
    try {
      await api("/elevator-orders", { method: "POST", body: {
        customer_id: Number(form.customer_id), building_id: n(form.building_id), order_number: s(form.order_number),
        project_name: s(form.project_name), elevator_type: form.elevator_type, status: form.status,
        capacity_kg: n(form.capacity_kg), capacity_persons: n(form.capacity_persons),
        floor_count: n(form.floor_count), stop_count: n(form.stop_count), speed_ms: n(form.speed_ms), door_type: s(form.door_type),
        order_date: s(form.order_date), estimated_end: s(form.estimated_end),
        amount: n(form.amount), downpayment: n(form.downpayment),
        technical_details: s(form.technical_details), notes: s(form.notes),
      } });
      setModal(false); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function changeStatus(id: number, st: string) {
    await api(`/elevator-orders/${id}`, { method: "PUT", body: { status: st } });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Asansör Siparişleri</h1>
          <p className="mt-1 text-sm text-muted">{total} sipariş</p>
        </div>
        <button onClick={open} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map((st) => <option key={st.v} value={st.v}>{st.l}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-4 py-3 font-medium">Proje / Müşteri</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Henüz sipariş yok.</td></tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{o.order_number ?? `#${o.id}`}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{o.project_name ?? "—"}</div>
                    <div className="text-xs text-muted">{o.customer?.name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{o.elevator_type ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{o.amount != null ? TRY(o.amount) : "—"}</td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}
                      className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink-soft">
                      {STATUSES.map((st) => <option key={st.v} value={st.v}>{st.l}</option>)}
                    </select>
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
              <h2 className="text-lg font-semibold tracking-tight text-ink">Yeni Sipariş</h2>
              <button onClick={() => setModal(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Sipariş No" hint="boş = otomatik">
                  <input className="input" placeholder="Boş bırakılırsa otomatik atanır" value={form.order_number} onChange={(e) => set({ order_number: e.target.value })} />
                </F>
                <F label="Proje Adı" req><input className="input" value={form.project_name} onChange={(e) => set({ project_name: e.target.value })} /></F>

                <div>
                  <F label="Müşteri" req>
                    <select className="input" value={form.customer_id} onChange={(e) => set({ customer_id: e.target.value })}>
                      <option value="">Müşteri seçin</option>
                      {allCustomers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </F>
                  {newCust ? (
                    <div className="mt-2 flex gap-2">
                      <input className="input" placeholder="Yeni müşteri adı" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} />
                      <input className="input w-32" placeholder="Telefon" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
                      <button onClick={addCustomer} className="btn-primary shrink-0 px-3">Ekle</button>
                      <button onClick={() => setNewCust(null)} className="btn-ghost shrink-0 px-3">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setNewCust({ name: "", phone: "" })} className="btn-ghost mt-2 text-sm"><Plus size={14} /> Yeni Müşteri</button>
                  )}
                </div>
                <F label="Bina (opsiyonel)">
                  <select className="input" value={form.building_id} onChange={(e) => set({ building_id: e.target.value })}>
                    <option value="">Bina seçin (opsiyonel)</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </F>

                <F label="Üretim Durumu" hint="sipariş üretim aşaması">
                  <select className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                    {STATUSES.map((st) => <option key={st.v} value={st.v}>{st.l}</option>)}
                  </select>
                </F>
                <F label="Asansör Tipi">
                  <select className="input" value={form.elevator_type} onChange={(e) => set({ elevator_type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </F>

                <F label="Kapasite (kg)"><input className="input" type="number" value={form.capacity_kg} onChange={(e) => set({ capacity_kg: e.target.value })} /></F>
                <F label="Kapasite (kişi)"><input className="input" type="number" value={form.capacity_persons} onChange={(e) => set({ capacity_persons: e.target.value })} /></F>
                <F label="Kat Sayısı"><input className="input" type="number" value={form.floor_count} onChange={(e) => set({ floor_count: e.target.value })} /></F>
                <F label="Durak Sayısı"><input className="input" type="number" value={form.stop_count} onChange={(e) => set({ stop_count: e.target.value })} /></F>
                <F label="Hız (m/s)"><input className="input" type="number" step="0.01" value={form.speed_ms} onChange={(e) => set({ speed_ms: e.target.value })} /></F>
                <F label="Kapı Tipi"><input className="input" value={form.door_type} onChange={(e) => set({ door_type: e.target.value })} /></F>

                <F label="Sipariş Tarihi" req><input className="input" type="date" value={form.order_date} onChange={(e) => set({ order_date: e.target.value })} /></F>
                <F label="Tahmini Bitiş"><input className="input" type="date" value={form.estimated_end} onChange={(e) => set({ estimated_end: e.target.value })} /></F>

                <F label="Toplam Fiyat (₺, KDV Dahil)" req hint="KDV dahil tutar; sistem KDV hesaplamaz">
                  <input className="input" type="number" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
                </F>
                <F label="Peşinat (bilgi)" hint="sadece bilgi; tahsilatı 'Tahsilat Al'dan kaydedin">
                  <input className="input" type="number" value={form.downpayment} onChange={(e) => set({ downpayment: e.target.value })} />
                </F>
              </div>

              <F label="Teknik Detaylar"><textarea className="input min-h-20" value={form.technical_details} onChange={(e) => set({ technical_details: e.target.value })} /></F>
              <F label="Notlar"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></F>

              <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-4 py-3 text-sm text-ink-soft">
                <b className="text-ink">Bilgi:</b> Peşinat/tahsilatı <b>Tahsilat Al</b> ekranından bu müşteriye kaydedin; tahsilat seçtiğin kasaya ve müşteri carisine otomatik yansır.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(false)} className="btn-ghost">İptal</button>
              <button onClick={create} disabled={saving || !form.customer_id || !form.project_name.trim() || !form.order_date} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}{hint && <span className="font-normal text-muted"> ({hint})</span>}</span>
      {children}
    </label>
  );
}
