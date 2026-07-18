"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadFile } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2, FileDown } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Row = {
  id: number; quote_number: string | null; status: string;
  total: number | string | null; valid_until: string | null;
  customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };
type Item = { description: string; quantity: string; unit_price: string };

const newItem = (): Item => ({ description: "", quantity: "1", unit_price: "" });
const emptyForm = { customer_id: "", valid_until: "", tax_rate: "20", discount: "0", notes: "" };
type Form = typeof emptyForm;

/** Kayıtlı jsonb kalemleri forma çevirir (snake_case veya PascalCase). */
function parseItems(raw: unknown): Item[] {
  let arr: unknown[] = [];
  if (typeof raw === "string") { try { arr = JSON.parse(raw || "[]"); } catch { arr = []; } }
  else if (Array.isArray(raw)) arr = raw;
  const mapped = arr.map((x) => {
    const it = x as Record<string, unknown>;
    return {
      description: String(it.description ?? it.Description ?? ""),
      quantity: String(it.quantity ?? it.Quantity ?? 1),
      unit_price: String(it.unit_price ?? it.UnitPrice ?? ""),
    };
  });
  return mapped.length ? mapped : [newItem()];
}

export default function QuotesPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number }>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({ ...emptyForm });
  const [items, setItems] = useState<Item[]>([newItem()]);

  const customers = useOptions("/customers");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/quotes?type=standard"); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm({ ...emptyForm }); setItems([newItem()]); setModal({ mode: "create" }); }

  async function openEdit(id: number) {
    try {
      const q = await api<Record<string, unknown>>(`/quotes/${id}`);
      setForm({
        customer_id: q.customer_id != null ? String(q.customer_id) : "",
        valid_until: q.valid_until ? String(q.valid_until).slice(0, 10) : "",
        tax_rate: q.tax_rate != null ? String(q.tax_rate) : "20",
        discount: q.discount != null ? String(q.discount) : "0",
        notes: (q.notes as string) ?? "",
      });
      setItems(parseItems(q.items));
      setModal({ mode: "edit", id });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Teklif yüklenemedi."); }
  }

  function setItem(i: number, patch: Partial<Item>) { setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxRate = Number(form.tax_rate) || 0;
  const discount = Number(form.discount) || 0;
  const taxAmount = (subtotal - discount) * taxRate / 100;
  const grandTotal = subtotal - discount + taxAmount;

  async function save() {
    setSaving(true);
    try {
      const body = {
        customer_id: Number(form.customer_id), type: "standard",
        valid_until: form.valid_until || null,
        items: items.filter((it) => it.description).map((it) => ({
          description: it.description, quantity: Number(it.quantity) || 0, unit_price: Number(it.unit_price) || 0,
        })),
        tax_rate: Number(form.tax_rate) || 0, discount: Number(form.discount) || 0, notes: form.notes || null,
      };
      if (modal?.mode === "create") await api("/quotes", { method: "POST", body });
      else await api(`/quotes/${modal?.id}`, { method: "PUT", body });
      setModal(null); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!(await confirm("Bu teklifi silmek istediğinize emin misiniz?"))) return;
    await api(`/quotes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Teklifler</h1>
          <p className="mt-1 text-sm text-muted">{total} teklif</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Teklif No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Geçerlilik</th>
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
              rows.map((q) => (
                <tr key={q.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{q.quote_number ?? `#${q.id}`}</td>
                  <td className="px-4 py-3 text-ink-soft">{q.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{q.total != null ? TRY(q.total) : "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(q.valid_until)}</td>
                  <td className="px-4 py-3"><Badge status={q.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => downloadFile(`/quotes/${q.id}/pdf`, `${q.quote_number ?? q.id}.pdf`)}
                        className="text-muted hover:text-primary" title="PDF indir"><FileDown size={16} /></button>
                      <button onClick={() => openEdit(q.id)} className="text-muted hover:text-primary" title="Düzenle"><Pencil size={16} /></button>
                      <button onClick={() => remove(q.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">{modal.mode === "create" ? "Yeni Teklif" : "Teklif Düzenle"}</h2>
            <div className="mt-4 space-y-3">
              <Field label="Müşteri *">
                <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">Seçiniz…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>

              <div>
                <span className="mb-1 block text-xs font-medium text-muted">Kalemler</span>
                <div className="space-y-2">
                  {items.map((it, i) => {
                    const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <input className="input min-w-0 flex-1" placeholder="Açıklama" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                        <input className="input w-16 shrink-0" type="number" step="any" placeholder="Adet" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                        <input className="input w-24 shrink-0" type="number" step="any" placeholder="B.Fiyat" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} />
                        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-soft">{TRY(lineTotal)}</span>
                        {items.length > 1 && <button onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} className="shrink-0 rounded-lg px-1 text-muted hover:text-danger"><Trash2 size={15} /></button>}
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setItems((a) => [...a, newItem()])} className="mt-2 text-xs text-primary hover:underline">+ Kalem ekle</button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="KDV %"><input className="input" type="number" step="any" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></Field>
                <Field label="İskonto (₺)"><input className="input" type="number" step="any" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
                <Field label="Geçerlilik"><input className="input" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></Field>
              </div>

              <Field label="Notlar"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>

              <div className="space-y-1 rounded-lg bg-surface px-3 py-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Ara toplam</span><span className="tabular-nums text-ink-soft">{TRY(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted">İskonto</span><span className="tabular-nums text-ink-soft">− {TRY(discount)}</span></div>
                <div className="flex justify-between"><span className="text-muted">KDV (%{taxRate})</span><span className="tabular-nums text-ink-soft">{TRY(taxAmount)}</span></div>
                <div className="flex justify-between border-t border-line pt-1 font-semibold"><span className="text-ink">Genel Toplam</span><span className="tabular-nums text-ink">{TRY(grandTotal)}</span></div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.customer_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
