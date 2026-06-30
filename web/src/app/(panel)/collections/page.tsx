"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import { HandCoins, CheckCircle2 } from "lucide-react";

const METHODS = [
  { v: "nakit", l: "Nakit" }, { v: "pos", l: "Kredi Kartı / POS" },
  { v: "havale", l: "Havale / EFT" }, { v: "cek", l: "Çek" },
];
const empty = { customer_id: "", amount: "", payment_method: "nakit", cashbox_id: "", description: "" };

type Result = { account_balance: number; cashbox_balance: number; transaction_id: number };

export default function CollectionsPage() {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const customers = useOptions("/customers");
  const cashboxes = useOptions("/cashboxes");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setResult(null);
    try {
      const r = await api<Result>("/collections", { method: "POST", body: {
        customer_id: Number(form.customer_id), amount: Number(form.amount),
        payment_method: form.payment_method, cashbox_id: Number(form.cashbox_id),
        description: form.description || null,
      } });
      setResult(r);
      setForm({ ...empty });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Tahsilat alınamadı.");
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><HandCoins size={18} /></div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Tahsilat Al</h1>
          <p className="text-sm text-muted">Müşteriden hızlı tahsilat — cari ve kasa otomatik güncellenir.</p>
        </div>
      </div>

      {result && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 size={20} className="mt-0.5 text-success" />
          <div className="text-sm">
            <div className="font-semibold text-ink">Tahsilat alındı (#{result.transaction_id})</div>
            <div className="mt-1 text-ink-soft">Cari bakiye: <span className="font-medium tabular-nums">{TRY(result.account_balance)}</span> · Kasa bakiyesi: <span className="font-medium tabular-nums">{TRY(result.cashbox_balance)}</span></div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4 rounded-xl border border-line bg-card p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Müşteri *</span>
          <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
            <option value="">Seçiniz…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Tutar (₺) *</span>
          <input className="input" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Ödeme Yöntemi *</span>
            <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Kasa *</span>
            <select className="input" value={form.cashbox_id} onChange={(e) => setForm({ ...form, cashbox_id: e.target.value })} required>
              <option value="">Seçiniz…</option>
              {cashboxes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Açıklama</span>
          <input className="input" placeholder="örn. Haziran bakım bedeli" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <button type="submit" disabled={saving || !form.customer_id || !form.amount || !form.cashbox_id} className="btn-primary w-full">
          {saving ? "İşleniyor…" : "Tahsilatı Kaydet"}
        </button>
      </form>
    </div>
  );
}
