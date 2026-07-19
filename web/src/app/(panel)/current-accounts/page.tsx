"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY, dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, X, Undo2 } from "lucide-react";

type Row = { id: number; name: string; phone: string | null; balance: string };
type Paginated = { data: Row[]; meta: { total: number } };
type Txn = {
  id: number; type: string; amount: string | number; balance_after: string | number | null;
  description: string | null; source_type: string | null; source_id: number | null; created_at: string;
};
type Detail = { customer: { id: number; name: string }; balance: number; txns: Txn[] };

const emptyForm = { customer_id: "", amount: "", payment_method: "cash", cashbox_id: "", description: "" };

export default function CurrentAccountsPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  const customers = useOptions("/customers");
  const cashboxes = useOptions("/cashboxes");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>("/current-accounts");
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function collect() {
    setSaving(true);
    try {
      await api("/collections", { method: "POST", body: {
        customer_id: Number(form.customer_id), amount: Number(form.amount),
        payment_method: form.payment_method, cashbox_id: Number(form.cashbox_id), description: form.description || null,
      } });
      setModal(false); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Tahsilat alınamadı.");
    } finally { setSaving(false); }
  }

  async function openDetail(customerId: number) {
    try {
      const d = await api<{ customer: { id: number; name: string }; balance: number; transactions: { data: Txn[] } }>(`/current-accounts/${customerId}`);
      setDetail({ customer: d.customer, balance: Number(d.balance), txns: d.transactions.data });
    } catch (e) { alert(e instanceof ApiError ? e.message : "Cari yüklenemedi."); }
  }

  async function reverse(txId: number) {
    if (!detail) return;
    if (!(await confirm("Bu tahsilatı iade etmek istiyor musunuz? Kasa ve cari ters kayıtla düzeltilir.", { title: "Tahsilat İade", confirmText: "İade Et", danger: true }))) return;
    try {
      await api(`/collections/${txId}/reverse`, { method: "POST", body: {} });
      await openDetail(detail.customer.id);
      load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "İade edilemedi."); }
  }

  const reversedIds = new Set(detail?.txns.filter((t) => t.source_type === "collection_reversal").map((t) => t.source_id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cariler</h1>
          <p className="mt-1 text-sm text-muted">{total} müşteri hesabı</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Tahsilat Al</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((r) => {
                const bal = Number(r.balance);
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium">
                      <button onClick={() => openDetail(r.id)} className="text-primary hover:underline">{r.name}</button>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold"
                      style={{ color: bal > 0 ? "var(--color-danger)" : bal < 0 ? "var(--color-success)" : "var(--color-muted)" }}>
                      {TRY(bal)}
                      <span className="ml-1 text-xs font-normal text-muted">{bal > 0 ? "(borç)" : bal < 0 ? "(alacak)" : ""}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Pozitif bakiye müşterinin borcudur; negatif bakiye alacaklıdır. Müşteriye tıklayarak hareketleri görün ve tahsilat iade edin.</p>

      {/* Tahsilat Al */}
      {modal && (
        <Modal title="Tahsilat Al" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={collect} disabled={saving || !form.customer_id || !form.amount || !form.cashbox_id} className="btn-primary">
              {saving ? "Alınıyor…" : "Tahsilatı Kaydet"}
            </button>
          </>
        }>
          <Field label="Müşteri *">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tutar (₺) *">
              <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Ödeme Yöntemi">
              <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="cash">Nakit</option><option value="card">Kart</option>
                <option value="transfer">Havale</option><option value="check">Çek</option>
              </select>
            </Field>
          </div>
          <Field label="Kasa *">
            <select className="input" value={form.cashbox_id} onChange={(e) => setForm({ ...form, cashbox_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {cashboxes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Açıklama">
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </Modal>
      )}

      {/* Cari detay + hareketler */}
      {detail && (
        <div className="fade-in fixed inset-0 z-30 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="pop-in surface-pop flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-ink">{detail.customer.name}</h2>
                <p className="text-sm text-muted">Bakiye: <span className="font-semibold" style={{ color: detail.balance > 0 ? "var(--color-danger)" : detail.balance < 0 ? "var(--color-success)" : "var(--color-muted)" }}>{TRY(detail.balance)}</span> {detail.balance > 0 ? "(borç)" : detail.balance < 0 ? "(alacak)" : ""}</p>
              </div>
              <button onClick={() => setDetail(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {detail.txns.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">Hareket yok.</p>
              ) : (
                <div className="divide-y divide-line">
                  {detail.txns.map((t) => {
                    const isCollection = t.source_type === "collection";
                    const reversed = reversedIds.has(t.id);
                    const amt = Number(t.amount);
                    const credit = t.type === "credit";
                    return (
                      <div key={t.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-ink">{t.description || (credit ? "Tahsilat" : "Borç")}</div>
                          <div className="text-xs text-muted">{dateTR(t.created_at)}{reversed && <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">iade edildi</span>}</div>
                        </div>
                        <div className={`shrink-0 text-sm font-semibold tabular-nums ${credit ? "text-success" : "text-danger"}`}>{credit ? "−" : "+"}{TRY(amt)}</div>
                        {isCollection && !reversed && (
                          <button onClick={() => reverse(t.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/5" title="Tahsilatı iade et">
                            <Undo2 size={13} /> İade
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
