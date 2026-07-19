"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Tpl = { id: number; name: string; is_default: boolean };
type Detail = {
  template_id: number | null; quote_number: string | null; created_at: string; customer_name: string | null;
  phone: string | null; email: string | null; valid_until: string | null; address: string | null; notes: string | null;
  elevator_type: string | null; elevator_count: number | null; capacity_kg: number | null; capacity_persons: number | null;
  floor_count: number | null; stop_count: number | null; speed_ms: number | null; door_type: string | null;
  control_system: string | null; unit_price: number | null; total: number | null; warranty_years: number | null;
  delivery_days: number | null; payment_terms: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const empty = {
  template_id: "", quote_number: "", issue_date: today(), customer_name: "", phone: "", email: "", valid_until: "",
  address: "", notes: "", internal_notes: "", elevator_type: "", elevator_count: "1", capacity_kg: "", capacity_persons: "",
  floor_count: "", stop_count: "", speed_ms: "", door_type: "", control_system: "", unit_price: "0",
  total_price: "0", warranty_years: "3", delivery_days: "30", payment_terms: "",
};
type Form = typeof empty;

export default function AtfForm({ id }: { id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ data: Tpl[] }>("/quotes/templates?kind=atf");
        setTemplates(r.data);
        if (!id) { const d = r.data.find((t) => t.is_default); if (d) setForm((f) => ({ ...f, template_id: String(d.id) })); }
      } catch { /* ignore */ }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await api<Detail>(`/quotes/${id}`);
        const s = (n: number | null | undefined) => (n != null ? String(n) : "");
        setForm({
          template_id: d.template_id != null ? String(d.template_id) : "", quote_number: d.quote_number ?? "",
          issue_date: d.created_at ? d.created_at.slice(0, 10) : today(), customer_name: d.customer_name ?? "",
          phone: d.phone ?? "", email: d.email ?? "", valid_until: d.valid_until ?? "", address: d.address ?? "",
          notes: d.notes ?? "", internal_notes: "", elevator_type: d.elevator_type ?? "", elevator_count: s(d.elevator_count) || "1",
          capacity_kg: s(d.capacity_kg), capacity_persons: s(d.capacity_persons), floor_count: s(d.floor_count),
          stop_count: s(d.stop_count), speed_ms: s(d.speed_ms), door_type: d.door_type ?? "",
          control_system: d.control_system ?? "", unit_price: s(d.unit_price) || "0", total_price: s(d.total) || "0",
          warranty_years: s(d.warranty_years) || "3", delivery_days: s(d.delivery_days) || "30", payment_terms: d.payment_terms ?? "",
        });
      } catch (e) { alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi."); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function save() {
    if (!form.issue_date) { alert("Tarih zorunludur."); return; }
    setSaving(true);
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const body = {
        type: "atf", template_id: form.template_id ? Number(form.template_id) : null,
        quote_number: form.quote_number.trim() || null, issue_date: form.issue_date,
        customer_name: form.customer_name.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null,
        valid_until: form.valid_until || null, address: form.address.trim() || null, notes: form.notes.trim() || null,
        elevator_type: form.elevator_type.trim() || null, elevator_count: num(form.elevator_count),
        capacity_kg: num(form.capacity_kg), capacity_persons: num(form.capacity_persons), floor_count: num(form.floor_count),
        stop_count: num(form.stop_count), speed_ms: num(form.speed_ms), door_type: form.door_type.trim() || null,
        control_system: form.control_system.trim() || null, unit_price: num(form.unit_price), total_price: num(form.total_price),
        warranty_years: num(form.warranty_years), delivery_days: num(form.delivery_days),
        payment_terms: form.payment_terms.trim() || null, internal_notes: form.internal_notes.trim() || null, currency: "TRY",
      };
      const res = id
        ? await api<{ id: number }>(`/quotes/${id}`, { method: "PUT", body })
        : await api<{ id: number }>("/quotes", { method: "POST", body });
      router.push(`/atf/${id ?? res.id}/preview`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{id ? "Asansör Talep Formu Düzenle" : "Yeni Asansör Talep Formu"}</h1>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <F label="Belge Şablonu">
              <select className="input" value={form.template_id} onChange={(e) => set({ template_id: e.target.value })}>
                <option value="">Şablon yok (serbest)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (varsayılan)" : ""}</option>)}
              </select>
            </F>
            <p className="mt-1.5 text-xs text-muted">Şablon maddeleri (kapsam, garanti, ödeme…) belgeye eklenir. Boş bırakırsanız şablon kullanılmaz (serbest).</p>
          </div>
          <div>
            <F label="Form No" hint="boş = otomatik"><input className="input" placeholder="Boş bırakılırsa otomatik atanır" value={form.quote_number} onChange={(e) => set({ quote_number: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">Boş bırakırsanız sistem &apos;ATF-YYYYMMDD-XXXX&apos; formatında otomatik atar.</p>
          </div>

          <F label="Tarih" req><input className="input" type="date" value={form.issue_date} onChange={(e) => set({ issue_date: e.target.value })} /></F>
          <F label="Talep Eden Ad / Ünvan"><input className="input" value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} /></F>

          <F label="Talep Eden Telefon"><input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="5XX XXX XX XX" /></F>
          <F label="Talep Eden E-posta"><input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></F>

          <div>
            <F label="Geçerlilik Tarihi"><input className="input" type="date" value={form.valid_until} onChange={(e) => set({ valid_until: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">Bu tarihten sonra teklif otomatik &apos;Süresi Doldu&apos; olur.</p>
          </div>
          <div />
        </div>

        <div className="mt-4"><F label="Adres"><textarea className="input min-h-16" value={form.address} onChange={(e) => set({ address: e.target.value })} /></F></div>
        <div className="mt-4">
          <F label="Açıklama (Müşteri Görür)"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></F>
          <p className="mt-1.5 text-xs text-muted">Public link açıldığında müşteriye görünen açıklama.</p>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-ink">Asansör Spesifikasyonu</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <F label="Asansör Tipi"><input className="input" value={form.elevator_type} onChange={(e) => set({ elevator_type: e.target.value })} /></F>
          <F label="Adet"><input className="input" type="number" value={form.elevator_count} onChange={(e) => set({ elevator_count: e.target.value })} /></F>
          <F label="Kapasite (kg)"><input className="input" type="number" value={form.capacity_kg} onChange={(e) => set({ capacity_kg: e.target.value })} /></F>
          <F label="Kapasite (kişi)"><input className="input" type="number" value={form.capacity_persons} onChange={(e) => set({ capacity_persons: e.target.value })} /></F>
          <F label="Kat Sayısı"><input className="input" type="number" value={form.floor_count} onChange={(e) => set({ floor_count: e.target.value })} /></F>
          <F label="Durak Sayısı"><input className="input" type="number" value={form.stop_count} onChange={(e) => set({ stop_count: e.target.value })} /></F>
          <F label="Hız (m/s)"><input className="input" type="number" step="0.01" value={form.speed_ms} onChange={(e) => set({ speed_ms: e.target.value })} /></F>
          <F label="Kapı Tipi"><input className="input" value={form.door_type} onChange={(e) => set({ door_type: e.target.value })} /></F>
          <F label="Kumanda Sistemi"><input className="input" value={form.control_system} onChange={(e) => set({ control_system: e.target.value })} /></F>
          <div>
            <F label="Birim Fiyat (₺, KDV Dahil)"><input className="input" type="number" value={form.unit_price} onChange={(e) => set({ unit_price: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">KDV dahil tutar girin.</p>
          </div>
          <div>
            <F label="Toplam Fiyat (₺, KDV Dahil)"><input className="input" type="number" value={form.total_price} onChange={(e) => set({ total_price: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">KDV dahil tutar girin.</p>
          </div>
          <F label="Garanti Süresi (Yıl)"><input className="input" type="number" value={form.warranty_years} onChange={(e) => set({ warranty_years: e.target.value })} /></F>
          <F label="Teslim Süresi (Gün)"><input className="input" type="number" value={form.delivery_days} onChange={(e) => set({ delivery_days: e.target.value })} /></F>
        </div>

        <div className="mt-4"><F label="Ödeme Şartları"><textarea className="input min-h-16" value={form.payment_terms} onChange={(e) => set({ payment_terms: e.target.value })} /></F></div>
        <div className="mt-4"><F label="Notlar"><textarea className="input min-h-16" value={form.internal_notes} onChange={(e) => set({ internal_notes: e.target.value })} /></F></div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Link href="/atf" className="btn-ghost">İptal</Link>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </div>
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
