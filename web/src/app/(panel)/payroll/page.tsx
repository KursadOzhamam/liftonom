"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { Plus } from "lucide-react";

type Row = {
  id: number; period: string; base_salary: number; bonus: number; deduction: number;
  net_paid: number; paid_at: string | null;
  user?: { name: string; surname?: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const empty = { user_id: "", period: "", base_salary: "", bonus: "", deduction: "", cashbox_id: "" };

export default function PayrollPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const users = useOptions("/users");
  const cashboxes = useOptions("/cashboxes");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>("/payroll");
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const net = (Number(form.base_salary) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0);

  async function create() {
    setSaving(true);
    try {
      await api("/payroll", { method: "POST", body: {
        user_id: Number(form.user_id), period: form.period,
        base_salary: Number(form.base_salary) || 0,
        bonus: form.bonus ? Number(form.bonus) : null,
        deduction: form.deduction ? Number(form.deduction) : null,
        cashbox_id: form.cashbox_id ? Number(form.cashbox_id) : null,
      } });
      setModal(false); setForm(empty); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Hakedişler / Bordro</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt · Kasa seçilirse ödeme kasadan düşülür.</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Dönem</th>
              <th className="px-4 py-3 font-medium">Personel</th>
              <th className="px-4 py-3 font-medium text-right">Maaş</th>
              <th className="px-4 py-3 font-medium text-right">Prim</th>
              <th className="px-4 py-3 font-medium text-right">Kesinti</th>
              <th className="px-4 py-3 font-medium text-right">Net</th>
              <th className="px-4 py-3 font-medium">Ödeme</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Henüz hakediş kaydı yok.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{p.period}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.user ? `${p.user.name} ${p.user.surname ?? ""}` : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{TRY(p.base_salary)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success">{TRY(p.bonus)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-danger">{TRY(p.deduction)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{TRY(p.net_paid)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{p.paid_at ? dateTR(p.paid_at) : "Ödenmedi"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Hakediş" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={create} disabled={saving || !form.user_id || !form.period || !form.base_salary} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Personel *">
            <select className="input" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Dönem * (örn. 2026-06)"><input className="input" type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></Field>
          <Field label="Maaş (₺) *"><input className="input" type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prim (₺)"><input className="input" type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} /></Field>
            <Field label="Kesinti (₺)"><input className="input" type="number" value={form.deduction} onChange={(e) => setForm({ ...form, deduction: e.target.value })} /></Field>
          </div>
          <Field label="Kasadan Öde (opsiyonel)">
            <select className="input" value={form.cashbox_id} onChange={(e) => setForm({ ...form, cashbox_id: e.target.value })}>
              <option value="">Ödeme yapma (sadece kaydet)</option>
              {cashboxes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div className="rounded-lg bg-surface px-3 py-2 text-sm">
            <span className="text-muted">Net ödenecek: </span>
            <span className="font-semibold tabular-nums text-ink">{TRY(net)}</span>
          </div>
        </Modal>
      )}
    </div>
  );
}
