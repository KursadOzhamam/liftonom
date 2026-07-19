"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { Plus, X } from "lucide-react";

type Tpl = { id: number; name: string; is_default: boolean };
type Item = { description: string; quantity: string; unit_price: string };
type Detail = {
  template_id: number | null; quote_number: string | null; title: string | null; customer_id: number | null;
  customer_name: string | null; email: string | null; phone: string | null; currency: string | null;
  valid_until: string | null; created_at: string; items: { description: string; quantity: number; unit_price: number }[];
  terms: string | null; notes: string | null;
};

const newItem = (): Item => ({ description: "", quantity: "1", unit_price: "" });
const empty = {
  template_id: "", quote_number: "", title: "", customer_id: "", customer_name: "", email: "", phone: "",
  currency: "TRY", edit_date: "", valid_until: "", notes: "", terms: "",
};
type Form = typeof empty;

export default function QuoteForm({ id }: { id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const customers = useOptions("/customers");
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const total = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const cur = (n: number) => `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)}`;

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ data: Tpl[] }>("/quotes/templates");
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
          quote_number: d.quote_number ?? "", title: d.title ?? "",
          customer_id: d.customer_id != null ? String(d.customer_id) : "",
          customer_name: d.customer_name ?? "", email: d.email ?? "", phone: d.phone ?? "",
          currency: d.currency ?? "TRY", edit_date: d.created_at ? d.created_at.slice(0, 10) : "",
          valid_until: d.valid_until ?? "", notes: d.notes ?? "", terms: d.terms ?? "",
        });
        setItems(d.items?.length ? d.items.map((x) => ({ description: x.description, quantity: String(x.quantity), unit_price: String(x.unit_price) })) : [newItem()]);
      } catch (e) { alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi."); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const setItem = (i: number, p: Partial<Item>) => setItems((a) => a.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function save() {
    if (!form.customer_name.trim()) { alert("Müşteri adı zorunludur."); return; }
    setSaving(true);
    try {
      const body = {
        template_id: form.template_id ? Number(form.template_id) : null,
        quote_number: form.quote_number.trim() || null, type: "standard", title: form.title.trim() || null,
        customer_id: form.customer_id ? Number(form.customer_id) : null, customer_name: form.customer_name.trim(),
        email: form.email.trim() || null, phone: form.phone.trim() || null, currency: form.currency || "TRY",
        valid_until: form.valid_until || null,
        items: items.filter((it) => it.description.trim() || Number(it.unit_price))
          .map((it) => ({ description: it.description, quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price) || 0 })),
        tax_rate: 0, discount: 0, terms: form.terms.trim() || null, notes: form.notes.trim() || null,
      };
      const res = id
        ? await api<{ id: number }>(`/quotes/${id}`, { method: "PUT", body })
        : await api<{ id: number }>("/quotes", { method: "POST", body });
      router.push(`/quotes/${id ?? res.id}/preview`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{id ? "Teklif Düzenle" : "Yeni Teklif"}</h1>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <F label="Teklif Şablonu (şartlar)">
          <select className="input" value={form.template_id} onChange={(e) => set({ template_id: e.target.value })}>
            <option value="">Şablon yok (serbest şartlar)</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (varsayılan)" : ""}</option>)}
          </select>
        </F>
        <p className="mt-1.5 text-xs text-muted">Şablon seçilirse standart şart maddeleri teklife otomatik işlenir; kayıt sonrası dondurulur. Yönetmek için <Link href="/quotes/templates/new" className="text-primary hover:underline">Teklif Şablonları</Link>.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <F label="Teklif No" hint="boş = otomatik"><input className="input" placeholder="Boş bırakılırsa otomatik atanır" value={form.quote_number} onChange={(e) => set({ quote_number: e.target.value })} /></F>
          <F label="Konu/Başlık"><input className="input" placeholder="Asansör bakım/revizyon teklifi" value={form.title} onChange={(e) => set({ title: e.target.value })} /></F>

          <F label="Müşteri (kayıtlı)" hint="manuel giriş için boş bırakın">
            <select className="input" value={form.customer_id} onChange={(e) => {
              const cid = e.target.value;
              const label = customers.find((c) => String(c.id) === cid)?.label ?? "";
              set({ customer_id: cid, customer_name: form.customer_name || label });
            }}>
              <option value="">Manuel giriş için boş bırakın</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </F>
          <F label="Müşteri Adı" req><input className="input" value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} /></F>

          <F label="E-posta"><input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></F>
          <F label="Telefon"><input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="5XX XXX XX XX" /></F>
        </div>

        <div className="mt-4"><F label="Açıklama"><textarea className="input min-h-20" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></F></div>

        {/* Kalemler */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Kalemler</span>
          </div>
          <p className="mb-2 text-xs text-muted">Fiyatları <b>KDV dahil</b> girin. Sistem KDV hesaplamaz.</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                  <th className="w-24 px-3 py-2 font-medium">Miktar</th>
                  <th className="w-40 px-3 py-2 font-medium">Birim Fiyat (KDV dahil)</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Toplam</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-3 py-2"><input className="input" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className="input" type="number" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className="input" type="number" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{cur((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setItems((a) => a.length > 1 ? a.filter((_, j) => j !== i) : a)} className="text-muted hover:text-danger"><X size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setItems((a) => [...a, newItem()])} className="btn-ghost mt-2"><Plus size={15} /> Satır Ekle</button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <F label="Düzenleme Tarihi" hint="bilgi"><input className="input" type="date" value={form.edit_date} onChange={(e) => set({ edit_date: e.target.value })} disabled={!!id} /></F>
          <F label="Geçerlilik Bitişi"><input className="input" type="date" value={form.valid_until} onChange={(e) => set({ valid_until: e.target.value })} /></F>
          <F label="Para Birimi"><input className="input" value={form.currency} onChange={(e) => set({ currency: e.target.value })} /></F>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4">
          <div>
            <div className="text-lg font-bold text-ink">Genel Toplam</div>
            <div className="text-xs text-muted">Tutarlar KDV dahildir.</div>
          </div>
          <div className="text-2xl font-bold text-primary tabular-nums">{cur(total)} {form.currency}</div>
        </div>

        <div className="mt-4"><F label="Notlar"><textarea className="input min-h-20" value={form.terms} onChange={(e) => set({ terms: e.target.value })} /></F></div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Link href="/quotes" className="btn-ghost">Vazgeç</Link>
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
