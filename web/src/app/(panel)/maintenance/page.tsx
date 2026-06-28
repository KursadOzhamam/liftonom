"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadFile } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, CheckCircle, FileDown } from "lucide-react";

type Row = {
  id: number; type: string; status: string;
  planned_date: string | null; completed_at: string | null;
  elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const TYPE: Record<string, string> = { periodic: "Periyodik", fault: "Arıza", revision: "Revizyon", annual: "Yıllık" };
const emptyForm = { elevator_id: "", type: "periodic", planned_date: "" };

export default function MaintenancePage() {
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
      const r = await api<Paginated>(`/maintenance${status ? `?status=${status}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/maintenance", { method: "POST", body: {
        elevator_id: Number(form.elevator_id), type: form.type, planned_date: form.planned_date,
      } });
      setModal(false); setForm(emptyForm); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function complete(id: number) {
    if (!confirm("Bu bakımı tamamlandı olarak işaretle?")) return;
    await api(`/maintenance/${id}/complete`, { method: "POST", body: {} });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bakım Kayıtları</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="in_progress">Devam Ediyor</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Planlanan</th>
              <th className="px-4 py-3 font-medium">Tamamlanma</th>
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
              rows.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{m.elevator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{TYPE[m.type] ?? m.type}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(m.planned_date)}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(m.completed_at)}</td>
                  <td className="px-4 py-3"><Badge status={m.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {m.status !== "completed" && m.status !== "cancelled" && (
                        <button onClick={() => complete(m.id)} className="inline-flex items-center gap-1 text-xs text-success hover:underline" title="Tamamla">
                          <CheckCircle size={14} /> Tamamla
                        </button>
                      )}
                      <button onClick={() => downloadFile(`/maintenance/${m.id}/pdf`, `bakim-${m.id}.pdf`)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline" title="Servis formu PDF">
                        <FileDown size={14} /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Bakım" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={create} disabled={saving || !form.elevator_id || !form.planned_date} className="btn-primary">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tip">
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="periodic">Periyodik</option>
                <option value="fault">Arıza</option>
                <option value="revision">Revizyon</option>
                <option value="annual">Yıllık</option>
              </select>
            </Field>
            <Field label="Planlanan Tarih *">
              <input type="date" className="input" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
