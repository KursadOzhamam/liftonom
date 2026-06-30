"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR, TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2, Wallet, CalendarClock, XCircle } from "lucide-react";

type Row = {
  id: number; type: string; direction: string; amount: number; bank: string | null;
  serial_no: string | null; due_date: string | null; status: string;
  customer?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };
type Summary = { portfolio_count: number; portfolio_total: number; due_15_count: number; due_15_total: number; bounced_count: number };

const STATUSES = [
  { v: "portfolio", l: "Portföyde" }, { v: "collected", l: "Tahsil Edildi" },
  { v: "paid", l: "Ödendi" }, { v: "bounced", l: "Karşılıksız" }, { v: "endorsed", l: "Ciro Edildi" },
];
const empty = { customer_id: "", type: "cek", direction: "received", amount: "", bank: "", serial_no: "", due_date: "", status: "portfolio", notes: "" };

export default function ChecksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const customers = useOptions("/customers");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (direction) qs.set("direction", direction);
      if (status) qs.set("status", status);
      const [r, s] = await Promise.all([
        api<Paginated>(`/checks?${qs}`),
        api<Summary>("/checks/summary"),
      ]);
      setRows(r.data); setTotal(r.meta.total); setSummary(s);
    } finally { setLoading(false); }
  }, [direction, status]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditId(null); setForm(empty); setModal(true); }
  function openEdit(r: Row) {
    setEditId(r.id);
    setForm({
      customer_id: "", type: r.type, direction: r.direction, amount: String(r.amount),
      bank: r.bank ?? "", serial_no: r.serial_no ?? "", due_date: r.due_date?.slice(0, 10) ?? "",
      status: r.status, notes: "",
    });
    setModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        type: form.type, direction: form.direction, amount: Number(form.amount) || 0,
        bank: form.bank || null, serial_no: form.serial_no || null,
        due_date: form.due_date || null, status: form.status, notes: form.notes || null,
      };
      await api(editId ? `/checks/${editId}` : "/checks", { method: editId ? "PUT" : "POST", body });
      setModal(false); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Kayıt silinsin mi?")) return;
    await api(`/checks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Çek & Senet</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt · portföy yönetimi</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat icon={<Wallet size={18} />} label="Portföyde" value={TRY(summary?.portfolio_total ?? 0)} sub={`${summary?.portfolio_count ?? 0} adet`} accent />
        <Stat icon={<CalendarClock size={18} />} label="15 Gün İçinde Vade" value={TRY(summary?.due_15_total ?? 0)} sub={`${summary?.due_15_count ?? 0} adet`} />
        <Stat icon={<XCircle size={18} />} label="Karşılıksız" value={String(summary?.bounced_count ?? 0)} sub="adet" tone="danger" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <select className="input max-w-xs" value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="">Tüm Yönler</option>
          <option value="received">Alınan (Portföy)</option>
          <option value="given">Verilen</option>
        </select>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Tür</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Banka / Seri</th>
              <th className="px-4 py-3 font-medium">Vade</th>
              <th className="px-4 py-3 font-medium text-right">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Kayıt yok.</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{c.type === "cek" ? "Çek" : "Senet"}</span>
                    <span className="ml-1 text-xs text-muted">{c.direction === "received" ? "(Alınan)" : "(Verilen)"}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.customer?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{c.bank ?? "—"}{c.serial_no ? ` · ${c.serial_no}` : ""}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(c.due_date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{TRY(c.amount)}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                      <button onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Çek/Senet Düzenle" : "Yeni Çek/Senet"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.amount} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tür">
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="cek">Çek</option><option value="senet">Senet</option>
              </select>
            </Field>
            <Field label="Yön">
              <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="received">Alınan (Portföy)</option><option value="given">Verilen</option>
              </select>
            </Field>
          </div>
          <Field label="Müşteri">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— (opsiyonel)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tutar (₺) *"><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Vade"><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Banka"><input className="input" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
            <Field label="Seri No"><input className="input" value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} /></Field>
          </div>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub, accent, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean; tone?: "danger" }) {
  return (
    <div className={`rounded-xl border border-line p-4 ${accent ? "bg-primary text-white" : "bg-card"}`}>
      <div className={`flex items-center gap-2 text-xs font-medium ${accent ? "text-white/80" : tone === "danger" ? "text-danger" : "text-muted"}`}>{icon} {label}</div>
      <div className={`mt-1.5 text-xl font-bold tabular-nums ${accent ? "text-white" : "text-ink"}`}>{value}</div>
      <div className={`text-xs ${accent ? "text-white/70" : "text-muted"}`}>{sub}</div>
    </div>
  );
}
