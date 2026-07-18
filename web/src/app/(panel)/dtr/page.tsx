"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { Plus, Trash2, CheckCircle2, XCircle, Pencil } from "lucide-react";

type Row = {
  id: number; elevator_id: number; general_note: string | null;
  checklist_items: string | null; created_at: string;
  elevator?: { name: string } | null;
};
type Paginated = { data: Row[]; meta: { total: number } };
type DtrDetail = { elevator_id: number | null; general_note: string | null; checklist_items: string | null };
type ChecklistItem = { label: string; ok: boolean };

const CHECKLIST = [
  "Kabin aydınlatması", "Kapı kilitleri", "Acil durdurma butonu", "Fren sistemi",
  "Halat / askı durumu", "Kat seviyeleme", "Acil alarm / interkom", "Kuyu temizliği",
];
const empty = () => ({ elevator_id: "", general_note: "", items: CHECKLIST.map((label) => ({ label, ok: true })) });

function okCount(raw: string | null): { ok: number; total: number } {
  if (!raw) return { ok: 0, total: 0 };
  try {
    const arr = JSON.parse(raw) as { ok: boolean }[];
    return { ok: arr.filter((x) => x.ok).length, total: arr.length };
  } catch { return { ok: 0, total: 0 }; }
}

function parseChecklist(raw: string | null): ChecklistItem[] {
  if (raw) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && arr.length && arr.every((x) => x && typeof (x as ChecklistItem).label === "string")) {
        return (arr as ChecklistItem[]).map((x) => ({ label: String(x.label), ok: !!x.ok }));
      }
    } catch { /* ignore */ }
  }
  return CHECKLIST.map((label) => ({ label, ok: true }));
}

export default function DtrPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const elevators = useOptions("/elevators");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<Paginated>("/dtr");
      setRows(r.data); setTotal(r.meta.total);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(i: number) {
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ok: !it.ok } : it) }));
  }

  function openNew() { setForm(empty()); setEditId(null); setModal(true); }

  async function openEdit(id: number) {
    try {
      const d = await api<DtrDetail>(`/dtr/${id}`);
      setForm({
        elevator_id: d.elevator_id != null ? String(d.elevator_id) : "",
        general_note: d.general_note ?? "",
        items: parseChecklist(d.checklist_items),
      });
      setEditId(id); setModal(true);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi.");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        elevator_id: Number(form.elevator_id),
        general_note: form.general_note || null,
        checklist_items: form.items,
      };
      if (editId == null) await api("/dtr", { method: "POST", body });
      else await api(`/dtr/${editId}`, { method: "PUT", body });
      setModal(false); setForm(empty()); setEditId(null); load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Rapor silinsin mi?")) return;
    await api(`/dtr/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Durum Tespit Raporu</h1>
          <p className="mt-1 text-sm text-muted">{total} rapor · Asansör periyodik durum tespiti.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Asansör</th>
              <th className="px-4 py-3 font-medium">Kontrol</th>
              <th className="px-4 py-3 font-medium">Not</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Henüz rapor yok.</td></tr>
            ) : (
              rows.map((d) => {
                const c = okCount(d.checklist_items);
                return (
                  <tr key={d.id} className="border-b border-line last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted">#{d.id}</td>
                    <td className="px-4 py-3 font-medium text-ink">{d.elevator?.name ?? `#${d.elevator_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${c.ok === c.total ? "text-success" : "text-warning"}`}>{c.ok}/{c.total} uygun</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-ink-soft">{d.general_note ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted">{dateTR(d.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(d.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Görüntüle / Düzenle"><Pencil size={15} /></button>
                        <button onClick={() => remove(d.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId == null ? "Yeni Durum Tespit Raporu" : "Durum Tespit Raporu Düzenle"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !form.elevator_id} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Asansör *">
            <select className="input disabled:opacity-60" value={form.elevator_id} disabled={editId != null} onChange={(e) => setForm({ ...form, elevator_id: e.target.value })}>
              <option value="">Seçiniz…</option>
              {elevators.map((el) => <option key={el.id} value={el.id}>{el.label}</option>)}
            </select>
            {editId != null && <span className="mt-1 block text-xs text-muted">Rapor asansörü düzenlemede değiştirilemez.</span>}
          </Field>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Kontrol Listesi</span>
            <div className="space-y-1">
              {form.items.map((it, i) => (
                <button key={it.label} type="button" onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
                  <span>{it.label}</span>
                  {it.ok
                    ? <span className="flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 size={15} /> Uygun</span>
                    : <span className="flex items-center gap-1 text-xs font-medium text-danger"><XCircle size={15} /> Uygun Değil</span>}
                </button>
              ))}
            </div>
          </div>
          <Field label="Genel Not"><textarea className="input min-h-20" value={form.general_note} onChange={(e) => setForm({ ...form, general_note: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
