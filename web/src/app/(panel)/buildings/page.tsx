"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import { useConfirm } from "@/components/ConfirmDialog";

type Building = {
  id: number; name: string; city: string | null; floor_count: number | null;
  latitude?: number | string | null; longitude?: number | string | null;
  elevators_count?: number; customer?: { id: number; name: string } | null;
};
type Paginated = { data: Building[]; meta: { current_page: number; last_page: number; total: number } };
type Customer = { id: number; name: string };
type Region = { id: number; name: string };
type Tech = { id: number; name: string; surname?: string | null };

const BUILDING_TYPES = ["Apartman", "Site", "Plaza", "İş Merkezi", "Villa", "Hastane", "AVM", "Otel", "Fabrika", "Diğer"];

const empty = {
  name: "", type: "Apartman", city: "", district: "", region_id: "", address: "",
  postal_code: "", phone: "", email: "",
  customer_id: "", manager_name: "", manager_phone: "", manager_email: "",
  floor_count: "", unit_count: "", built_year: "", is_active: true,
  default_technician_user_id: "", latitude: null as number | null, longitude: null as number | null,
  door_code: "", access_note: "", notes: "",
};
type Form = typeof empty;

const str = (s: string) => (s.trim() ? s.trim() : null);
const num = (s: string) => (s.trim() ? Number(s) : null);

export default function BuildingsPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Building[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: Form }>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/buildings?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data); setMeta(res.meta);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ data: Customer[] }>("/customers?per_page=100").then((r) => setCustomers(r.data)).catch(() => {});
    api<{ data: Region[] }>("/regions?per_page=100").then((r) => setRegions(r.data)).catch(() => {});
    api<{ data: Tech[] }>("/users?role=technician&per_page=100").then((r) => setTechs(r.data)).catch(() => {});
  }, []);

  function openCreate() { setModal({ mode: "create", form: { ...empty } }); }

  async function openEdit(id: number) {
    try {
      const b = await api<Record<string, unknown>>(`/buildings/${id}`);
      const g = (k: string) => (b[k] == null ? "" : String(b[k]));
      setModal({
        mode: "edit", id,
        form: {
          name: g("name"), type: g("type") || "Apartman", city: g("city"), district: g("district"),
          region_id: g("region_id"), address: g("address"), postal_code: g("postal_code"),
          phone: g("phone"), email: g("email"), customer_id: g("customer_id"),
          manager_name: g("manager_name"), manager_phone: g("manager_phone"), manager_email: g("manager_email"),
          floor_count: g("floor_count"), unit_count: g("unit_count"), built_year: g("built_year"),
          is_active: b["is_active"] !== false,
          default_technician_user_id: g("default_technician_user_id"),
          latitude: b["latitude"] != null ? Number(b["latitude"]) : null,
          longitude: b["longitude"] != null ? Number(b["longitude"]) : null,
          door_code: g("door_code"), access_note: g("access_note"), notes: g("notes"),
        },
      });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Bina yüklenemedi.");
    }
  }

  function set(patch: Partial<Form>) { setModal((m) => (m ? { ...m, form: { ...m.form, ...patch } } : m)); }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const f = modal.form;
      const body = {
        name: f.name, type: f.type, customer_id: num(f.customer_id), region_id: num(f.region_id),
        city: str(f.city), district: str(f.district), address: str(f.address),
        postal_code: str(f.postal_code), phone: str(f.phone), email: str(f.email),
        floor_count: num(f.floor_count), unit_count: num(f.unit_count), built_year: num(f.built_year),
        manager_name: str(f.manager_name), manager_phone: str(f.manager_phone), manager_email: str(f.manager_email),
        default_technician_user_id: num(f.default_technician_user_id), is_active: f.is_active,
        door_code: str(f.door_code), access_note: str(f.access_note), notes: str(f.notes),
        latitude: f.latitude, longitude: f.longitude,
      };
      if (modal.mode === "create") await api("/buildings", { method: "POST", body });
      else await api(`/buildings/${modal.id}`, { method: "PUT", body });
      setModal(null); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!(await confirm("Bu binayı silmek istediğinize emin misiniz?"))) return;
    await api(`/buildings/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Binalar</h1>
          <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} bina</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Bina adı, şehir…" className="input pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Bina Adı</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Şehir</th>
              <th className="px-4 py-3 font-medium text-center">Kat</th>
              <th className="px-4 py-3 font-medium text-center">Asansör</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/buildings/${b.id}`} className="text-primary hover:underline">{b.name}</a>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{b.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{b.city ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{b.floor_count ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{b.elevators_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(b.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                      <button onClick={() => remove(b.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
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

      {modal && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="pop-in surface-pop flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{modal.mode === "create" ? "Yeni Bina" : "Bina Düzenle"}</h2>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Genel */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bina Adı" req><input className="input" value={modal.form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Bina Tipi">
                  <select className="input" value={modal.form.type} onChange={(e) => set({ type: e.target.value })}>
                    {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Şehir"><input className="input" value={modal.form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                <Field label="İlçe"><input className="input" value={modal.form.district} onChange={(e) => set({ district: e.target.value })} /></Field>
                <div className="sm:col-span-2">
                  <Field label="Saha Bölgesi" hint="rota planlayıcıda bölgeye göre filtrelenir">
                    <select className="input" value={modal.form.region_id} onChange={(e) => set({ region_id: e.target.value })}>
                      <option value="">— Bölge seçilmedi —</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Adres"><textarea className="input min-h-20" value={modal.form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
                </div>
                <Field label="Posta Kodu"><input className="input" value={modal.form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} /></Field>
                <Field label="Telefon"><Phone value={modal.form.phone} onChange={(v) => set({ phone: v })} /></Field>
                <div className="sm:col-span-2">
                  <Field label="E-posta"><input className="input" type="email" value={modal.form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
                </div>
              </div>

              {/* Bina Sahibi (Cari) */}
              <div className="border-t border-line pt-5">
                <SectionTitle title="Bina Sahibi (Cari)" desc="Bakım, arıza ve faturalar burada seçili müşteriye bağlanır. Boş bırakılabilir." />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Müşteri (Cari Sahibi)">
                      <select className="input" value={modal.form.customer_id} onChange={(e) => set({ customer_id: e.target.value })}>
                        <option value="">Sahipsiz (boş bırakılabilir)</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Bina Yöneticisi" hint="müşteriden farklıysa"><input className="input" value={modal.form.manager_name} onChange={(e) => set({ manager_name: e.target.value })} /></Field>
                  <Field label="Yönetici Telefonu" hint="farklıysa"><Phone value={modal.form.manager_phone} onChange={(v) => set({ manager_phone: v })} /></Field>
                  <Field label="Yönetici E-postası" hint="farklıysa"><input className="input" type="email" value={modal.form.manager_email} onChange={(e) => set({ manager_email: e.target.value })} /></Field>
                  <div />
                  <Field label="Kat Sayısı"><input className="input" type="number" value={modal.form.floor_count} onChange={(e) => set({ floor_count: e.target.value })} /></Field>
                  <Field label="Daire Sayısı"><input className="input" type="number" value={modal.form.unit_count} onChange={(e) => set({ unit_count: e.target.value })} /></Field>
                  <Field label="Yapım Yılı"><input className="input" type="number" value={modal.form.built_year} onChange={(e) => set({ built_year: e.target.value })} /></Field>
                  <Field label="Varsayılan Teknisyen" hint="aylık toplu bakımda atanır">
                    <select className="input" value={modal.form.default_technician_user_id} onChange={(e) => set({ default_technician_user_id: e.target.value })}>
                      <option value="">— Seçilmedi —</option>
                      {techs.map((t) => <option key={t.id} value={t.id}>{t.name} {t.surname ?? ""}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 pt-6 text-sm text-ink">
                    <input type="checkbox" className="h-4 w-4 rounded border-line accent-[color:var(--color-primary)]"
                      checked={modal.form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
                    Aktif
                  </label>
                </div>
                <div className="mt-4">
                  <span className="mb-1.5 block text-xs font-medium text-ink-soft">Konum (haritadan seç)</span>
                  <LocationPicker
                    lat={modal.form.latitude} lng={modal.form.longitude}
                    defaultQuery={[modal.form.name, modal.form.city].filter(Boolean).join(" ")}
                    onChange={(la, ln) => set({ latitude: la, longitude: ln })}
                  />
                </div>
              </div>

              {/* Teknisyene Özel */}
              <div className="border-t border-line pt-5">
                <SectionTitle title="Teknisyene Özel / Gizli Bilgiler" desc="Yalnızca firma ekibiniz görür; müşteri/portal ile paylaşılmaz." />
                <div className="mt-4 space-y-4">
                  <Field label="Kapı / Giriş Şifresi" hint="ör. dış kapı erişim kodu"><input className="input" value={modal.form.door_code} onChange={(e) => set({ door_code: e.target.value })} /></Field>
                  <Field label="Erişim Notu (Teknisyene Özel)" hint="anahtar yeri, makine dairesi ulaşımı…"><textarea className="input min-h-20" value={modal.form.access_note} onChange={(e) => set({ access_note: e.target.value })} /></Field>
                  <Field label="Genel Notlar"><textarea className="input min-h-20" value={modal.form.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setModal(null)} className="btn-ghost">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.name.trim()} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
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
function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-xs text-muted">{desc}</p>
    </div>
  );
}
function Phone({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-l-[10px] border border-r-0 border-line bg-surface px-3 text-sm text-muted">+90</span>
      <input className="input rounded-l-none" placeholder="5XX XXX XX XX" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
