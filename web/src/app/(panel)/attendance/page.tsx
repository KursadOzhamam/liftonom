"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Badge from "@/components/Badge";
import Modal, { Field } from "@/components/Modal";
import { Plus, Trash2 } from "lucide-react";

type Row = {
  id: number; user_id: number; date: string; type: string; note: string | null;
  user?: { name: string; surname?: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };

const TYPES = [
  { v: "present", l: "Geldi" }, { v: "absent", l: "Gelmedi" }, { v: "leave", l: "İzinli" },
  { v: "sick", l: "Raporlu" }, { v: "holiday", l: "Tatil" },
];
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ user_id: "", date: today(), type: "present", note: "" });

export default function AttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const users = useOptions("/users");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>(`/attendance${userFilter ? `?user_id=${userFilter}` : ""}`);
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, [userFilter]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/attendance", { method: "POST", body: {
        user_id: Number(form.user_id), date: form.date, type: form.type, note: form.note || null,
      } });
      setModal(false); setForm(emptyForm()); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Kayıt silinsin mi?")) return;
    await api(`/attendance/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Devamsızlık</h1>
          <p className="mt-1 text-sm text-muted">{total} kayıt</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-5">
        <select className="input max-w-xs" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">Tüm Personel</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Personel</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Not</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Henüz kayıt yok.</td></tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{dateTR(a.date)}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.user ? `${a.user.name} ${a.user.surname ?? ""}` : `#${a.user_id}`}</td>
                  <td className="px-4 py-3"><Badge status={a.type} /></td>
                  <td className="px-4 py-3 text-ink-soft">{a.note ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => remove(a.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Yeni Devamsızlık Kaydı" onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={create} disabled={saving || !form.user_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Personel *">
            <select className="input" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarih *"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Durum *">
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Not"><textarea className="input min-h-16" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
