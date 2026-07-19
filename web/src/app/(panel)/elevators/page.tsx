"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { Search, Plus, X, Eye, Pencil } from "lucide-react";

type Elevator = {
  id: number;
  name: string | null;
  brand: string | null;
  serial_number: string | null;
  status: string;
  tse_end_date: string | null;
  tse_label: "green" | "yellow" | "red" | "gray";
  tse_label_color: string | null;
  building?: { name: string } | null;
};
type Paginated = { data: Elevator[]; meta: { current_page: number; last_page: number; total: number } };

const TSE: Record<string, { bg: string; text: string; label: string }> = {
  green:  { bg: "#DCFCE7", text: "#16A34A", label: "Geçerli" },
  yellow: { bg: "#FEF3C7", text: "#D97706", label: "Yaklaşıyor" },
  red:    { bg: "#FEE2E2", text: "#DC2626", label: "Süresi Doldu" },
  gray:   { bg: "#F3F4F6", text: "#6B7280", label: "Belge Yok" },
};
const LABEL: Record<string, { text: string; label: string }> = {
  green: { text: "#16A34A", label: "Yeşil" }, blue: { text: "#2563EB", label: "Mavi" },
  yellow: { text: "#D97706", label: "Sarı" }, red: { text: "#DC2626", label: "Kırmızı" },
};
const LABEL_OPTS = [["", "— Etiket —"], ["green", "🟢 Yeşil"], ["blue", "🔵 Mavi"], ["yellow", "🟡 Sarı"], ["red", "🔴 Kırmızı"]];
const STATUS: Record<string, string> = { active: "Aktif", maintenance: "Bakımda", passive: "Pasif", faulty: "Arızalı" };
const TYPES = [["electric", "Elektrikli"], ["hydraulic", "Hidrolik"], ["escalator", "Yürüyen Merdiven"]];
const TSE_LABELS = [["", "— Etiket girilmedi —"], ["green", "Yeşil (Uygun)"], ["blue", "Mavi (Hafif Kusurlu)"], ["yellow", "Sarı (Kusurlu)"], ["red", "Kırmızı (Güvensiz)"]];

const emptyForm = {
  name: "", building_id: "", type: "electric", status: "active", brand: "", model: "",
  serial_number: "", registration_no: "", manufacture_year: "", installation_date: "",
  capacity_kg: "", capacity_persons: "", served_floors: "", stop_count: "", speed_ms: "", door_type: "",
  last_maintenance: "", next_maintenance: "", tse_start_date: "", tse_end_date: "", tse_label_color: "", tse_label_note: "",
  has_emergency_phone: false, has_ups: false, has_fire_system: false, has_earthquake_sensor: false,
  notes: "", fee_amount: "", fee_from: "", fee_to: "",
};
type Form = typeof emptyForm;
const str = (s: string) => (s.trim() ? s.trim() : null);
const num = (s: string) => (s.trim() ? Number(s) : null);

export default function ElevatorsPage() {
  const [rows, setRows] = useState<Elevator[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number }>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const buildings = useOptions("/buildings");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/elevators?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data); setMeta(res.meta);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  function set(patch: Partial<Form>) { setForm((f) => ({ ...f, ...patch })); }
  function open() { setForm(emptyForm); setModal({ mode: "create" }); }
  async function openEdit(id: number) {
    try {
      const o = await api<Record<string, unknown>>(`/elevators/${id}`);
      const g = (k: string) => (o[k] == null ? "" : String(o[k]));
      setForm({
        ...emptyForm,
        name: g("name"), building_id: g("building_id"), type: g("type") || "electric", status: g("status") || "active",
        brand: g("brand"), model: g("model"), serial_number: g("serial_number"), registration_no: g("registration_no"),
        manufacture_year: g("manufacture_year"), installation_date: g("installation_date"),
        capacity_kg: g("capacity_kg"), capacity_persons: g("capacity_persons"), served_floors: g("served_floors"),
        stop_count: g("stop_count"), speed_ms: g("speed_ms"), door_type: g("door_type"),
        last_maintenance: g("last_maintenance_at").slice(0, 10), next_maintenance: g("next_maintenance_at").slice(0, 10),
        tse_start_date: g("tse_start_date"), tse_end_date: g("tse_end_date"), tse_label_color: g("tse_label_color"), tse_label_note: g("tse_label_note"),
        has_emergency_phone: o["has_emergency_phone"] === true, has_ups: o["has_ups"] === true,
        has_fire_system: o["has_fire_system"] === true, has_earthquake_sensor: o["has_earthquake_sensor"] === true,
        notes: g("notes"),
      });
      setModal({ mode: "edit", id });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Asansör yüklenemedi."); }
  }

  async function setLabel(id: number, color: string) {
    await api(`/elevators/${id}/tse-label`, { method: "POST", body: { color: color || null } });
    load();
  }

  async function save() {
    setSaving(true);
    try {
      const f = form;
      const body = {
        building_id: num(f.building_id), name: f.name, type: f.type, status: f.status,
        brand: str(f.brand), model: str(f.model), serial_number: str(f.serial_number), registration_no: str(f.registration_no),
        manufacture_year: num(f.manufacture_year), installation_date: str(f.installation_date),
        capacity_kg: num(f.capacity_kg), capacity_persons: num(f.capacity_persons),
        served_floors: str(f.served_floors), stop_count: num(f.stop_count), speed_ms: num(f.speed_ms), door_type: str(f.door_type),
        last_maintenance_date: str(f.last_maintenance), next_maintenance_date: str(f.next_maintenance),
        tse_start_date: str(f.tse_start_date), tse_end_date: str(f.tse_end_date),
        tse_label_color: str(f.tse_label_color), tse_label_note: str(f.tse_label_note),
        has_emergency_phone: f.has_emergency_phone, has_ups: f.has_ups,
        has_fire_system: f.has_fire_system, has_earthquake_sensor: f.has_earthquake_sensor,
        notes: str(f.notes),
      };
      if (modal?.mode === "edit") {
        await api(`/elevators/${modal.id}`, { method: "PUT", body });
      } else {
        await api("/elevators", { method: "POST", body });
        if (f.fee_amount.trim() && Number(f.fee_amount) > 0 && f.building_id) {
          await api("/maintenance-fees", {
            method: "POST",
            body: { building_id: num(f.building_id), amount: Number(f.fee_amount), period: "monthly", valid_from: str(f.fee_from), valid_to: str(f.fee_to) },
          });
        }
      }
      setModal(null); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Asansörler</h1>
          <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} asansör</p>
        </div>
        <button onClick={open} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Ad, seri no, marka…" className="input pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Bina</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">TSE Vade</th>
              <th className="px-4 py-3 font-medium">TSE Etiket</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((e) => {
                const tse = TSE[e.tse_label];
                return (
                  <tr key={e.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium">
                      <a href={`/elevators/${e.id}`} className="text-primary hover:underline">{e.name ?? `#${e.id}`}</a>
                      {e.brand && <div className="text-xs font-normal text-muted">{e.brand}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.building?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{STATUS[e.status] ?? e.status}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: tse.bg, color: tse.text }}>
                        {tse.label}{e.tse_end_date ? ` · ${new Date(e.tse_end_date).toLocaleDateString("tr-TR")}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={e.tse_label_color ?? ""} onChange={(ev) => setLabel(e.id, ev.target.value)}
                        className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-medium"
                        style={{ color: e.tse_label_color ? LABEL[e.tse_label_color]?.text : "var(--color-muted)" }}>
                        {LABEL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/elevators/${e.id}`} className="text-muted hover:text-primary" title="Detay"><Eye size={16} /></Link>
                        <button onClick={() => openEdit(e.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
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

      <p className="mt-4 text-xs text-muted">
        TSE renk kodu: <b style={{ color: "#16A34A" }}>Yeşil</b> &gt;30 gün ·
        <b style={{ color: "#D97706" }}> Sarı</b> ≤30 gün ·
        <b style={{ color: "#DC2626" }}> Kırmızı</b> geçmiş ·
        <b style={{ color: "#6B7280" }}> Gri</b> belge yok
      </p>

      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.mode === "edit" ? "Asansör Düzenle" : "Yeni Asansör"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Temel */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Asansör Adı" req><input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Bina" req>
                  <select className="input" value={form.building_id} onChange={(e) => set({ building_id: e.target.value })}>
                    <option value="">Bina seçin</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </Field>
                <Field label="Tip"><Select value={form.type} onChange={(v) => set({ type: v })} opts={TYPES} /></Field>
                <Field label="Durum"><Select value={form.status} onChange={(v) => set({ status: v })} opts={Object.entries(STATUS)} /></Field>
                <Field label="Marka"><input className="input" value={form.brand} onChange={(e) => set({ brand: e.target.value })} /></Field>
                <Field label="Model"><input className="input" value={form.model} onChange={(e) => set({ model: e.target.value })} /></Field>
                <Field label="Seri No"><input className="input" value={form.serial_number} onChange={(e) => set({ serial_number: e.target.value })} /></Field>
                <Field label="Tescil No"><input className="input" value={form.registration_no} onChange={(e) => set({ registration_no: e.target.value })} /></Field>
                <Field label="Üretim Yılı"><input className="input" type="number" value={form.manufacture_year} onChange={(e) => set({ manufacture_year: e.target.value })} /></Field>
                <Field label="Kurulum Tarihi"><input className="input" type="date" value={form.installation_date} onChange={(e) => set({ installation_date: e.target.value })} /></Field>
              </div>

              {/* Teknik */}
              <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                <Field label="Kapasite (kg)"><input className="input" type="number" value={form.capacity_kg} onChange={(e) => set({ capacity_kg: e.target.value })} /></Field>
                <Field label="Kapasite (kişi)"><input className="input" type="number" value={form.capacity_persons} onChange={(e) => set({ capacity_persons: e.target.value })} /></Field>
                <Field label="Hizmet Veren Kat"><input className="input" value={form.served_floors} onChange={(e) => set({ served_floors: e.target.value })} /></Field>
                <Field label="Durak Sayısı"><input className="input" type="number" value={form.stop_count} onChange={(e) => set({ stop_count: e.target.value })} /></Field>
                <Field label="Hız (m/s)"><input className="input" type="number" step="0.01" value={form.speed_ms} onChange={(e) => set({ speed_ms: e.target.value })} /></Field>
                <Field label="Kapı Tipi"><input className="input" value={form.door_type} onChange={(e) => set({ door_type: e.target.value })} /></Field>
              </div>

              {/* Bakım & TSE */}
              <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                <Field label="Son Bakım"><input className="input" type="date" value={form.last_maintenance} onChange={(e) => set({ last_maintenance: e.target.value })} /></Field>
                <Field label="Sonraki Bakım"><input className="input" type="date" value={form.next_maintenance} onChange={(e) => set({ next_maintenance: e.target.value })} /></Field>
                <Field label="Son TSE Muayene"><input className="input" type="date" value={form.tse_start_date} onChange={(e) => set({ tse_start_date: e.target.value })} /></Field>
                <Field label="Sonraki TSE"><input className="input" type="date" value={form.tse_end_date} onChange={(e) => set({ tse_end_date: e.target.value })} /></Field>
                <Field label="TSE Etiket Durumu" hint="periyodik kontrol etiket rengi"><Select value={form.tse_label_color} onChange={(v) => set({ tse_label_color: v })} opts={TSE_LABELS} /></Field>
                <Field label="TSE Etiket Notu"><textarea className="input min-h-16" placeholder="Tespit edilen eksiklik…" value={form.tse_label_note} onChange={(e) => set({ tse_label_note: e.target.value })} /></Field>
              </div>

              {/* Donanım */}
              <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                <Check label="Acil Telefon var" checked={form.has_emergency_phone} onChange={(v) => set({ has_emergency_phone: v })} />
                <Check label="UPS var" checked={form.has_ups} onChange={(v) => set({ has_ups: v })} />
                <Check label="Yangın Sistemi var" checked={form.has_fire_system} onChange={(v) => set({ has_fire_system: v })} />
                <Check label="Deprem Sensörü var" checked={form.has_earthquake_sensor} onChange={(v) => set({ has_earthquake_sensor: v })} />
              </div>

              {/* Notlar */}
              <div className="border-t border-line pt-5">
                <Field label="Notlar"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
              </div>

              {/* Bakım ücreti (yalnızca yeni kayıtta) */}
              {modal.mode === "create" && (
              <div className="border-t border-line pt-5">
                <h3 className="text-sm font-semibold text-ink">Bakım Ücreti <span className="font-normal text-muted">(opsiyonel)</span></h3>
                <p className="mt-0.5 text-xs text-muted">Aylık ücret girilirse binaya bağlı olarak “Bakım Ücretleri”ne kaydedilir. Boş bırakılırsa oluşturulmaz.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Field label="Aylık Ücret (₺, KDV Dahil)"><input className="input" type="number" placeholder="Örn: 2500" value={form.fee_amount} onChange={(e) => set({ fee_amount: e.target.value })} /></Field>
                  <Field label="Ücret Başlangıç"><input className="input" type="date" value={form.fee_from} onChange={(e) => set({ fee_from: e.target.value })} /></Field>
                  <Field label="Ücret Bitiş"><input className="input" type="date" value={form.fee_to} onChange={(e) => set({ fee_to: e.target.value })} /></Field>
                </div>
              </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.building_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}{req && <span className="text-danger"> *</span>}{hint && <span className="font-normal text-muted"> ({hint})</span>}
      </span>
      {children}
    </label>
  );
}
function Select({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: (string[])[] }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink">
      <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
