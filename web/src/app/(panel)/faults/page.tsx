"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus } from "lucide-react";

type Row = {
  id: number; priority: string; status: string; description: string; created_at: string;
  elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const STATUSES = [
  { v: "new", l: "Yeni" }, { v: "investigating", l: "İnceleniyor" }, { v: "repairing", l: "Onarımda" },
  { v: "resolved", l: "Çözüldü" }, { v: "closed", l: "Kapatıldı" },
];
const emptyForm = { elevator_id: "", priority: "normal", description: "" };

export default function FaultsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const elevators = useOptions("/elevators");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/fault-reports${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/fault-reports", { method: "POST", body: {
        elevator_id: Number(form.elevator_id), priority: form.priority, description: form.description,
      } });
      setModal(false); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function changeStatus(id: number, newStatus: string) {
    await api(`/fault-reports/${id}/status`, { method: "PUT", body: { status: newStatus } });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Arıza Bildirimleri</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Öncelik</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">Durum Değiştir</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((f) => (
                <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">#{f.id}</td>
                  <td className="px-4 py-3 font-medium text-ink">{f.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft max-w-xs truncate">{f.description}</td>
                  <td className="px-4 py-3"><Badge status={f.priority} /></td>
                  <td className="px-4 py-3"><Badge status={f.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <select value={f.status} onChange={(e) => changeStatus(f.id, e.target.value)}
                      className="rounded-lg border border-line px-2 py-1 text-xs">
                      {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Arıza" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={create} disabled={saving || !form.elevator_id || !form.description} className="btn-primary">
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </>
        }>
          <Field label="Asansör *">
            <select className="input" value={form.elevator_id} onChange={(e) => setForm({ ...form, elevator_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </Field>
          <Field label="Öncelik">
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="urgent">Acil</option><option value="high">Yüksek</option>
              <option value="normal">Normal</option><option value="low">Düşük</option>
            </select>
          </Field>
          <Field label="Açıklama *">
            <textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
