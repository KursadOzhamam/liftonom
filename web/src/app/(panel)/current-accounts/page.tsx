"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { Plus } from "lucide-react";

type Row = { id: number; name: string; phone: string | null; balance: string };
type Paginated = { data: Row[]; meta: { total: number } };

const emptyForm = { customer_id: "", amount: "", payment_method: "cash", cashbox_id: "", description: "" };

export default function CurrentAccountsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
        customer_id: Number(form.customer_id),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        cashbox_id: Number(form.cashbox_id),
        description: form.description || null,
      } });
      setModal(false); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Tahsilat alınamadı.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cariler</h1>
          <p className="mt-1 text-sm text-muted">{total} müşteri hesabı</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Tahsilat Al</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
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
                    <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
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
      <p className="mt-3 text-xs text-muted">Pozitif bakiye müşterinin borcudur; negatif bakiye alacaklıdır.</p>

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
                <option value="cash">Nakit</option>
                <option value="card">Kart</option>
                <option value="transfer">Havale</option>
                <option value="check">Çek</option>
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
    </div>
  );
}
