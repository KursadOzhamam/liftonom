"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";

type Tpl = { id: number; name: string; type: string; is_default: boolean };
type Detail = {
  customer_id: number | null; building_id: number | null; template_id: number | null;
  contract_number: string | null; type: string | null; start_date: string | null; end_date: string | null;
  monthly_fee: number | null; currency: string | null; period: string | null; annual_visits: number | null;
  renewal_notice_days: number | null; auto_renew: boolean; status: string | null;
  customer_name: string | null; rep_name: string | null; phone: string | null; email: string | null;
  terms: string | null; notes: string | null;
};

const TYPES = ["Bakım", "Tam Kapsam", "Sadece Arıza", "Revizyon"];
const PERIODS = ["Aylık", "2 Aylık", "3 Aylık", "6 Aylık", "Yıllık"];
const STATUSES = [
  { v: "draft", l: "Taslak" }, { v: "active", l: "Aktif" },
  { v: "expired", l: "Süresi Doldu" }, { v: "cancelled", l: "İptal" },
];

const empty = {
  template_id: "", contract_number: "", type: "Bakım", customer_id: "", building_id: "",
  customer_name: "", rep_name: "", phone: "", email: "", start_date: "", end_date: "",
  monthly_fee: "0", currency: "TRY", period: "Aylık", annual_visits: "12", status: "draft",
  renewal_notice_days: "30", auto_renew: false, terms: "", notes: "",
};
type Form = typeof empty;

export default function ContractForm({ id }: { id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const customers = useOptions("/customers");
  const buildings = useOptions("/buildings");
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ data: Tpl[] }>("/contracts/templates");
        setTemplates(r.data);
        if (!id) {
          const def = r.data.find((t) => t.is_default);
          if (def) setForm((f) => ({ ...f, template_id: String(def.id) }));
        }
      } catch { /* ignore */ }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await api<Detail>(`/contracts/${id}`);
        setForm({
          template_id: d.template_id != null ? String(d.template_id) : "",
          contract_number: d.contract_number ?? "", type: d.type ?? "Bakım",
          customer_id: d.customer_id != null ? String(d.customer_id) : "",
          building_id: d.building_id != null ? String(d.building_id) : "",
          customer_name: d.customer_name ?? "", rep_name: d.rep_name ?? "",
          phone: d.phone ?? "", email: d.email ?? "",
          start_date: d.start_date ?? "", end_date: d.end_date ?? "",
          monthly_fee: d.monthly_fee != null ? String(d.monthly_fee) : "0",
          currency: d.currency ?? "TRY", period: d.period ?? "Aylık",
          annual_visits: d.annual_visits != null ? String(d.annual_visits) : "12",
          status: d.status ?? "draft",
          renewal_notice_days: d.renewal_notice_days != null ? String(d.renewal_notice_days) : "30",
          auto_renew: !!d.auto_renew, terms: d.terms ?? "", notes: d.notes ?? "",
        });
      } catch (e) {
        alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi.");
      } finally { setLoading(false); }
    })();
  }, [id]);

  async function save() {
    if (!form.building_id) { alert("Bina zorunludur."); return; }
    if (!form.customer_name.trim()) { alert("Müşteri adı zorunludur."); return; }
    if (!form.start_date || !form.end_date) { alert("Başlangıç ve bitiş tarihi zorunludur."); return; }
    setSaving(true);
    try {
      const body = {
        template_id: form.template_id ? Number(form.template_id) : null,
        contract_number: form.contract_number.trim() || null,
        type: form.type, customer_id: form.customer_id ? Number(form.customer_id) : null,
        building_id: Number(form.building_id), customer_name: form.customer_name.trim(),
        rep_name: form.rep_name.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null,
        start_date: form.start_date, end_date: form.end_date,
        monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null, currency: form.currency || "TRY",
        period: form.period, annual_visits: form.annual_visits ? Number(form.annual_visits) : null,
        status: form.status, renewal_notice_days: form.renewal_notice_days ? Number(form.renewal_notice_days) : 30,
        auto_renew: form.auto_renew, terms: form.terms.trim() || null, notes: form.notes.trim() || null,
      };
      const res = id
        ? await api<{ id: number }>(`/contracts/${id}`, { method: "PUT", body })
        : await api<{ id: number }>("/contracts", { method: "POST", body });
      router.push(`/contracts/${id ?? res.id}/preview`);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  if (loading) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{id ? "Sözleşme Düzenle" : "Yeni Sözleşme"}</h1>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <F label="Belge Şablonu">
          <select className="input" value={form.template_id} onChange={(e) => set({ template_id: e.target.value })}>
            <option value="">Şablon yok (serbest metin)</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? " ★" : ""}</option>)}
          </select>
        </F>
        <p className="mt-1.5 text-xs text-muted">
          Şablon seçerseniz mevzuat maddeleri sözleşmeye otomatik işlenir ve müşteri/bina bilgileriyle doldurulur.
          Boş bırakırsanız aşağıdaki &apos;Sözleşme Şartları&apos; serbest metni kullanılır.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <F label="Sözleşme No" hint="boş = otomatik">
            <input className="input" placeholder="Boş bırakılırsa otomatik atanır" value={form.contract_number} onChange={(e) => set({ contract_number: e.target.value })} />
          </F>
          <F label="Tip">
            <select className="input" value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </F>

          <F label="Müşteri" hint="boş bırakılabilir">
            <select className="input" value={form.customer_id} onChange={(e) => {
              const cid = e.target.value;
              const label = customers.find((c) => String(c.id) === cid)?.label ?? "";
              set({ customer_id: cid, customer_name: form.customer_name || label });
            }}>
              <option value="">Müşteri seçin (boş bırakılabilir)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </F>
          <F label="Bina" req>
            <select className="input" value={form.building_id} onChange={(e) => set({ building_id: e.target.value })}>
              <option value="">Bina seçin</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </F>

          <F label="Müşteri Adı (Sözleşme)" req><input className="input" value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} /></F>
          <F label="Müşteri Temsilcisi"><input className="input" value={form.rep_name} onChange={(e) => set({ rep_name: e.target.value })} /></F>

          <F label="Telefon"><input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></F>
          <F label="E-posta"><input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></F>

          <F label="Başlangıç" req><input className="input" type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} /></F>
          <F label="Bitiş" req><input className="input" type="date" value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} /></F>

          <F label="Tutar" req><input className="input" type="number" step="0.01" value={form.monthly_fee} onChange={(e) => set({ monthly_fee: e.target.value })} /></F>
          <F label="Para Birimi"><input className="input" value={form.currency} onChange={(e) => set({ currency: e.target.value })} /></F>

          <F label="Periyot">
            <select className="input" value={form.period} onChange={(e) => set({ period: e.target.value })}>
              {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </F>
          <F label="Yıllık Ziyaret Sayısı"><input className="input" type="number" value={form.annual_visits} onChange={(e) => set({ annual_visits: e.target.value })} /></F>

          <F label="Yaşam Döngüsü" hint="belge onayı ayrı süreçtir">
            <select className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </F>
          <F label="Yenileme Bildirim (gün)"><input className="input" type="number" value={form.renewal_notice_days} onChange={(e) => set({ renewal_notice_days: e.target.value })} /></F>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.auto_renew} onChange={(e) => set({ auto_renew: e.target.checked })} />
          Otomatik Yenile
        </label>

        <div className="mt-5">
          <F label="Sözleşme Şartları" hint="şablon seçilmezse kullanılır">
            <textarea className="input min-h-28" value={form.terms} onChange={(e) => set({ terms: e.target.value })} />
          </F>
        </div>
        <div className="mt-4">
          <F label="Notlar"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></F>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Link href="/contracts" className="btn-ghost">İptal</Link>
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
