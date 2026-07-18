"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadFile } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Trash2, FileDown, HandCoins } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Row = {
  id: number; invoice_number: string | null; status: string;
  total: number | string | null; paid_amount: number | string | null;
  issue_date: string | null; due_date: string | null;
  customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };
type Item = { description: string; quantity: string; unit_price: string };

const newItem = (): Item => ({ description: "", quantity: "1", unit_price: "" });
const emptyForm = { customer_id: "", issue_date: "", due_date: "", tax_rate: "20", discount: "0", notes: "" };
type Form = typeof emptyForm;

const METHODS = [
  { v: "nakit", l: "Nakit" }, { v: "pos", l: "Kredi Kartı / POS" },
  { v: "havale", l: "Havale / EFT" }, { v: "cek", l: "Çek" },
];
const emptyPay = { amount: "", payment_method: "nakit", cashbox_id: "" };

export default function InvoicesPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [pay, setPay] = useState<null | { id: number; number: string; remaining: number; form: typeof emptyPay }>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({ ...emptyForm });
  const [items, setItems] = useState<Item[]>([newItem()]);

  const customers = useOptions("/customers");
  const cashboxes = useOptions("/cashboxes");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api<Paginated>("/invoices"); setRows(r.data); setTotal(r.meta.total); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm({ ...emptyForm }); setItems([newItem()]); setModal(true); }
  function setItem(i: number, patch: Partial<Item>) { setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxRate = Number(form.tax_rate) || 0;
  const discount = Number(form.discount) || 0;
  const taxAmount = (subtotal - discount) * taxRate / 100;
  const grandTotal = subtotal - discount + taxAmount;

  async function save() {
    setSaving(true);
    try {
      await api("/invoices", {
        method: "POST", body: {
          customer_id: Number(form.customer_id),
          issue_date: form.issue_date || null, due_date: form.due_date || null,
          items: items.filter((it) => it.description).map((it) => ({
            description: it.description, quantity: Number(it.quantity) || 0, unit_price: Number(it.unit_price) || 0,
          })),
          tax_rate: Number(form.tax_rate) || 0, discount: Number(form.discount) || 0, notes: form.notes || null,
        },
      });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!(await confirm("Bu faturayı silmek istediğinize emin misiniz?"))) return;
    await api(`/invoices/${id}`, { method: "DELETE" });
    load();
  }

  async function savePay() {
    if (!pay) return;
    setSaving(true);
    try {
      await api(`/invoices/${pay.id}/pay`, {
        method: "POST", body: {
          amount: Number(pay.form.amount) || 0,
          cashbox_id: Number(pay.form.cashbox_id),
          payment_method: pay.form.payment_method,
        },
      });
      setPay(null); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Tahsilat alınamadı."); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Faturalar</h1>
          <p className="mt-1 text-sm text-muted">{total} fatura</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Fatura No</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Ödeme</th>
              <th className="px-4 py-3 font-medium">Vade</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((i) => {
                const tot = Number(i.total) || 0;
                const paid = Number(i.paid_amount) || 0;
                const remaining = Math.max(0, tot - paid);
                const isPaid = tot > 0 && paid >= tot;
                const partial = paid > 0 && paid < tot;
                return (
                  <tr key={i.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{i.invoice_number ?? `#${i.id}`}</td>
                    <td className="px-4 py-3 text-ink-soft">{i.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{i.total != null ? TRY(i.total) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isPaid ? "bg-success/10 text-success" : partial ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                      }`}>
                        {isPaid ? "Ödendi" : partial ? `Kısmi · ${TRY(paid)}` : "Ödenmedi"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{dateTR(i.due_date)}</td>
                    <td className="px-4 py-3"><Badge status={i.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!isPaid && (
                          <button onClick={() => setPay({ id: i.id, number: i.invoice_number ?? `#${i.id}`, remaining, form: { ...emptyPay, amount: remaining ? String(remaining) : "" } })}
                            className="text-muted hover:text-primary" title="Tahsilat"><HandCoins size={16} /></button>
                        )}
                        <button onClick={() => downloadFile(`/invoices/${i.id}/pdf`, `${i.invoice_number ?? i.id}.pdf`)}
                          className="text-muted hover:text-primary" title="PDF indir"><FileDown size={16} /></button>
                        <button onClick={() => remove(i.id)} className="text-muted hover:text-danger" title="Sil"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Yeni fatura */}
      {modal && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">Yeni Fatura</h2>
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Fatura Tarihi"><input className="input" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
                <Field label="Vade Tarihi"><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="KDV %"><input className="input" type="number" step="any" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></Field>
                <Field label="İskonto (₺)"><input className="input" type="number" step="any" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
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
              <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.customer_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tahsilat */}
      {pay && (
        <Modal title={`Tahsilat · ${pay.number}`} onClose={() => setPay(null)} footer={
          <>
            <button onClick={() => setPay(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={savePay} disabled={saving || !pay.form.amount || !pay.form.cashbox_id} className="btn-primary">{saving ? "İşleniyor…" : "Tahsil Et"}</button>
          </>
        }>
          <p className="text-sm text-muted">Kalan tutar: <span className="font-medium tabular-nums text-ink">{TRY(pay.remaining)}</span></p>
          <Field label="Tutar (₺) *">
            <input className="input" type="number" step="any" min={0} value={pay.form.amount}
              onChange={(e) => setPay({ ...pay, form: { ...pay.form, amount: e.target.value } })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ödeme Yöntemi *">
              <select className="input" value={pay.form.payment_method}
                onChange={(e) => setPay({ ...pay, form: { ...pay.form, payment_method: e.target.value } })}>
                {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </Field>
            <Field label="Kasa *">
              <select className="input" value={pay.form.cashbox_id}
                onChange={(e) => setPay({ ...pay, form: { ...pay.form, cashbox_id: e.target.value } })}>
                <option value="">Seçiniz…</option>
                {cashboxes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
