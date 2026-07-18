"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import { Plus, X, Pencil, HandCoins } from "lucide-react";

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
const METHODS = [["cash", "Nakit"], ["transfer", "Havale / EFT"], ["card", "Kredi Kartı"], ["check", "Çek"]];

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
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number }>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [extraCustomers, setExtraCustomers] = useState<Opt[]>([]);
  const [newCust, setNewCust] = useState<null | { name: string; phone: string }>(null);
  // Tahsilat
  const [coll, setColl] = useState({ amount: "", cashbox_id: "", method: "cash", description: "" });
  const [collMsg, setCollMsg] = useState<string | null>(null);

  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");
  const cashboxes = useOptions("/cashboxes");
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

  function openCreate() { setForm(empty); setNewCust(null); setCollMsg(null); setModal({ mode: "create" }); }
  async function openEdit(id: number) {
    try {
      const o = await api<Record<string, unknown>>(`/elevator-orders/${id}`);
      const g = (k: string) => (o[k] == null ? "" : String(o[k]));
      setForm({
        order_number: g("order_number"), project_name: g("project_name"), customer_id: g("customer_id"), building_id: g("building_id"),
        status: g("status") || "draft", elevator_type: g("elevator_type") || "Elektrikli",
        capacity_kg: g("capacity_kg"), capacity_persons: g("capacity_persons"), floor_count: g("floor_count"), stop_count: g("stop_count"),
        speed_ms: g("speed_ms"), door_type: g("door_type"), order_date: g("order_date"), estimated_end: g("estimated_end"),
        amount: g("amount") || "0", downpayment: g("downpayment") || "0", technical_details: g("technical_details"), notes: g("notes"),
      });
      setColl({ amount: "", cashbox_id: "", method: "cash", description: "" }); setCollMsg(null);
      setModal({ mode: "edit", id });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Sipariş yüklenemedi."); }
  }

  async function addCustomer() {
    if (!newCust?.name.trim()) return;
    try {
      const c = await api<{ id: number }>("/customers", { method: "POST", body: { name: newCust.name, phone: newCust.phone || null } });
      setExtraCustomers((x) => [{ id: c.id, label: newCust.name }, ...x]);
      set({ customer_id: String(c.id) }); setNewCust(null);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Müşteri eklenemedi."); }
  }

  function orderBody() {
    return {
      customer_id: Number(form.customer_id), building_id: n(form.building_id), order_number: s(form.order_number),
      project_name: s(form.project_name), elevator_type: form.elevator_type, status: form.status,
      capacity_kg: n(form.capacity_kg), capacity_persons: n(form.capacity_persons),
      floor_count: n(form.floor_count), stop_count: n(form.stop_count), speed_ms: n(form.speed_ms), door_type: s(form.door_type),
      order_date: s(form.order_date), estimated_end: s(form.estimated_end),
      amount: n(form.amount), downpayment: n(form.downpayment),
      technical_details: s(form.technical_details), notes: s(form.notes),
    };
  }
  async function save() {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await api(`/elevator-orders/${modal.id}`, { method: "PUT", body: orderBody() });
      else await api("/elevator-orders", { method: "POST", body: orderBody() });
      setModal(null); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function submitCollection() {
    if (!form.customer_id) { alert("Önce müşteri seçili olmalı."); return; }
    if (!coll.amount || Number(coll.amount) <= 0) { alert("Tutar 0'dan büyük olmalı."); return; }
    if (!coll.cashbox_id) { alert("Kasa seçin."); return; }
    try {
      const r = await api<{ account_balance: number; cashbox_balance: number }>("/collections", { method: "POST", body: {
        customer_id: Number(form.customer_id), amount: Number(coll.amount), payment_method: coll.method,
        cashbox_id: Number(coll.cashbox_id), description: coll.description || `Sipariş ${form.order_number || ""} tahsilatı`,
      } });
      setCollMsg(`Tahsilat kaydedildi. Kasa bakiyesi: ${TRY(r.cashbox_balance)} · Cari bakiye: ${TRY(r.account_balance)}`);
      setColl({ ...coll, amount: "", description: "" });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Tahsilat kaydedilemedi."); }
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
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni</button>
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
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz sipariş yok.</td></tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{o.order_number ?? `#${o.id}`}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(o.id)} className="font-medium text-primary hover:underline">{o.project_name ?? "—"}</button>
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
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(o.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.mode === "edit" ? "Sipariş Düzenle" : "Yeni Sipariş"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
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
                <F label="Peşinat (bilgi)" hint="sadece bilgi; tahsilatı aşağıdan kaydedin">
                  <input className="input" type="number" value={form.downpayment} onChange={(e) => set({ downpayment: e.target.value })} />
                </F>
              </div>

              <F label="Teknik Detaylar"><textarea className="input min-h-20" value={form.technical_details} onChange={(e) => set({ technical_details: e.target.value })} /></F>
              <F label="Notlar"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></F>

              {modal.mode === "create" ? (
                <div className="rounded-xl border border-primary/20 bg-primary-light/50 px-4 py-3 text-sm text-ink-soft">
                  <b className="text-ink">Bilgi:</b> Sipariş kaydedildikten sonra <b>düzenleme</b> ekranındaki <b>“Yeni Tahsilat”</b> alanından peşinat/tahsilat girebilirsiniz; tahsilat seçtiğin kasaya ve müşteri carisine otomatik yansır.
                </div>
              ) : (
                <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><HandCoins size={16} className="text-success" /> Yeni Tahsilat</h3>
                  <p className="mt-0.5 text-xs text-muted">Bu siparişin müşterisine tahsilat kaydı — seçilen kasaya ve müşteri carisine otomatik yansır.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <F label="Tutar (₺)"><input className="input" type="number" value={coll.amount} onChange={(e) => setColl({ ...coll, amount: e.target.value })} /></F>
                    <F label="Kasa">
                      <select className="input" value={coll.cashbox_id} onChange={(e) => setColl({ ...coll, cashbox_id: e.target.value })}>
                        <option value="">Kasa seçin</option>
                        {cashboxes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </F>
                    <F label="Ödeme Yöntemi">
                      <select className="input" value={coll.method} onChange={(e) => setColl({ ...coll, method: e.target.value })}>
                        {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </F>
                    <F label="Açıklama"><input className="input" value={coll.description} onChange={(e) => setColl({ ...coll, description: e.target.value })} /></F>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button onClick={submitCollection} className="btn-primary"><HandCoins size={15} /> Tahsilat Kaydet</button>
                    {collMsg && <span className="text-sm font-medium text-success">{collMsg}</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !form.customer_id || !form.project_name.trim() || !form.order_date} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
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
