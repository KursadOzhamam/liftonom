"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";

type Tpl = { id: number; name: string; is_default: boolean };
type Detail = {
  template_id: number | null; elevator_id: number | null; quote_number: string | null; created_at: string;
  labor_total: number | null; material_total: number | null; price_visible: boolean; contact_name: string | null;
  phone: string | null; email: string | null; valid_until: string | null; address: string | null;
  notes: string | null; internal_notes: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const empty = {
  template_id: "", elevator_id: "", quote_number: "", issue_date: today(), labor_total: "0", material_total: "0",
  price_visible: true, contact_name: "", phone: "", email: "", valid_until: "", address: "", notes: "", internal_notes: "",
};
type Form = typeof empty;

export default function RevisionForm({ id }: { id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const elevators = useOptions("/elevators");
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const total = (Number(form.labor_total) || 0) + (Number(form.material_total) || 0);
  const cur = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ data: Tpl[] }>("/quotes/templates?kind=revision");
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
        setForm({
          template_id: d.template_id != null ? String(d.template_id) : "",
          elevator_id: d.elevator_id != null ? String(d.elevator_id) : "",
          quote_number: d.quote_number ?? "", issue_date: d.created_at ? d.created_at.slice(0, 10) : today(),
          labor_total: d.labor_total != null ? String(d.labor_total) : "0",
          material_total: d.material_total != null ? String(d.material_total) : "0",
          price_visible: d.price_visible ?? true, contact_name: d.contact_name ?? "",
          phone: d.phone ?? "", email: d.email ?? "", valid_until: d.valid_until ?? "",
          address: d.address ?? "", notes: d.notes ?? "", internal_notes: d.internal_notes ?? "",
        });
      } catch (e) { alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi."); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function save() {
    if (!form.elevator_id) { alert("Asansör zorunludur."); return; }
    if (!form.issue_date) { alert("Teklif tarihi zorunludur."); return; }
    setSaving(true);
    try {
      const body = {
        type: "revision", template_id: form.template_id ? Number(form.template_id) : null,
        elevator_id: Number(form.elevator_id), quote_number: form.quote_number.trim() || null,
        issue_date: form.issue_date, labor_total: Number(form.labor_total) || 0,
        material_total: Number(form.material_total) || 0, price_visible: form.price_visible,
        contact_name: form.contact_name.trim() || null, phone: form.phone.trim() || null,
        email: form.email.trim() || null, valid_until: form.valid_until || null,
        address: form.address.trim() || null, notes: form.notes.trim() || null,
        internal_notes: form.internal_notes.trim() || null, currency: "TRY",
      };
      const res = id
        ? await api<{ id: number }>(`/quotes/${id}`, { method: "PUT", body })
        : await api<{ id: number }>("/quotes", { method: "POST", body });
      router.push(`/revision-quotes/${id ?? res.id}/preview`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{id ? "Revizyon Teklifi Düzenle" : "Yeni Revizyon Teklifi"}</h1>

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
          <F label="Asansör" req>
            <select className="input" value={form.elevator_id} onChange={(e) => set({ elevator_id: e.target.value })}>
              <option value="">Asansör seçin…</option>
              {elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </F>

          <div>
            <F label="Teklif No" hint="boş = otomatik"><input className="input" placeholder="Boş bırakılırsa otomatik atanır" value={form.quote_number} onChange={(e) => set({ quote_number: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">Boş bırakırsanız sistem &apos;RT-YYYYMMDD-XXXX&apos; formatında otomatik atar.</p>
          </div>
          <F label="Teklif Tarihi" req><input className="input" type="date" value={form.issue_date} onChange={(e) => set({ issue_date: e.target.value })} /></F>

          <div>
            <F label="İşçilik (₺, KDV Dahil)"><input className="input" type="number" value={form.labor_total} onChange={(e) => set({ labor_total: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">KDV dahil tutar girin.</p>
          </div>
          <div>
            <F label="Malzeme Toplam (₺, KDV Dahil)"><input className="input" type="number" value={form.material_total} onChange={(e) => set({ material_total: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">KDV dahil tutar girin.</p>
          </div>
        </div>

        <div className="mt-4">
          <F label="Genel Toplam (₺) — otomatik"><input className="input bg-surface font-semibold" value={cur(total)} disabled /></F>
          <p className="mt-1.5 text-xs text-muted">İşçilik + Malzeme toplamı otomatik hesaplanır. Tutarlar KDV dahildir.</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.price_visible} onChange={(e) => set({ price_visible: e.target.checked })} />
            Fiyat Müşteriye Görünür
          </label>
          <div>
            <F label="Müşteri / Bina Sorumlusu"><input className="input" value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">Public link açıldığında müşteriye &apos;Sayın …&apos; diye hitap edilir.</p>
          </div>

          <div>
            <F label="Müşteri Telefon"><input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="5XX XXX XX XX" /></F>
            <p className="mt-1.5 text-xs text-muted">SMS / WhatsApp gönderiminde kullanılır.</p>
          </div>
          <F label="Müşteri E-posta"><input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></F>

          <div>
            <F label="Geçerlilik Tarihi"><input className="input" type="date" value={form.valid_until} onChange={(e) => set({ valid_until: e.target.value })} /></F>
            <p className="mt-1.5 text-xs text-muted">Bu tarihten sonra teklif otomatik &apos;Süresi Doldu&apos; olur.</p>
          </div>
        </div>

        <div className="mt-4"><F label="Müşteri Adresi"><textarea className="input min-h-16" value={form.address} onChange={(e) => set({ address: e.target.value })} /></F></div>
        <div className="mt-4"><F label="Açıklama (Müşteri Görür)"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></F></div>
        <div className="mt-4"><F label="İç Notlar (Sadece Yöneticiler)"><textarea className="input min-h-20" value={form.internal_notes} onChange={(e) => set({ internal_notes: e.target.value })} /></F></div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Link href="/revision-quotes" className="btn-ghost">İptal</Link>
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
