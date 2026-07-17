"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

type Item = { id: number; type: string; slug: string; title: string; excerpt: string | null; body: string | null; cover_url: string | null; icon: string | null; sort_order: number; is_published: boolean; published_at: string | null };

const TYPES: { key: string; label: string; hasIcon: boolean }[] = [
  { key: "solution", label: "Çözümler", hasIcon: true },
  { key: "city", label: "Şehirler", hasIcon: false },
  { key: "blog", label: "Rehber (Blog)", hasIcon: false },
  { key: "legal", label: "Yasal Sayfalar", hasIcon: false },
];
const ICON_NAMES = ["CalendarClock", "Wrench", "Smartphone", "Receipt", "Boxes", "Users", "ShieldCheck", "Building2", "MapPin", "FileText"];

const emptyItem = { type: "solution", slug: "", title: "", excerpt: "", body: "", cover_url: "", icon: "", sort_order: 0, is_published: true, published_at: "" };

export default function AdminContentPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api<Item[]>("/admin/content", { admin: true })); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew(type: string) {
    setEditId(null);
    setForm({ ...emptyItem, type, sort_order: items.filter((i) => i.type === type).length });
    setModal(true);
  }
  function openEdit(it: Item) {
    setEditId(it.id);
    setForm({ type: it.type, slug: it.slug, title: it.title, excerpt: it.excerpt ?? "", body: it.body ?? "", cover_url: it.cover_url ?? "", icon: it.icon ?? "", sort_order: it.sort_order, is_published: it.is_published, published_at: it.published_at ?? "" });
    setModal(true);
  }
  async function saveItem() {
    setSaving(true);
    try {
      const body = { type: form.type, slug: form.slug, title: form.title, excerpt: form.excerpt || null, body: form.body || null, cover_url: form.cover_url || null, icon: form.icon || null, sort_order: Number(form.sort_order) || 0, is_published: form.is_published, published_at: form.published_at || null };
      await api(editId ? `/admin/content/${editId}` : "/admin/content", { method: editId ? "PUT" : "POST", admin: true, body });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }
  async function delItem(it: Item) {
    if (!confirm(`"${it.title}" silinsin mi?`)) return;
    try { await api(`/admin/content/${it.id}`, { method: "DELETE", admin: true }); load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  const typeHasIcon = TYPES.find((t) => t.key === form.type)?.hasIcon;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">İçerik Sayfaları</h1>
          <p className="mt-1 text-sm text-muted">Çözümler, şehirler, blog ve yasal sayfaları yönet. Değişiklikler anında yayınlanır.</p>
        </div>
        <a href="https://liftonom.rslabsdev.site" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
          Sayfayı Aç <ExternalLink size={14} />
        </a>
      </div>

      {loading ? (
        <p className="mt-6 text-center text-muted">Yükleniyor…</p>
      ) : (
        TYPES.map((t) => {
          const list = items.filter((i) => i.type === t.key);
          return (
            <div key={t.key} className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t.label} <span className="text-muted/60">({list.length})</span></h2>
                <button onClick={() => openNew(t.key)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"><Plus size={14} /> Ekle</button>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-card">
                {list.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">Bu türde içerik yok.</p>
                ) : list.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{it.title}</span>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${it.is_published ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{it.is_published ? "Yayında" : "Taslak"}</span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{it.slug}</p>
                    </div>
                    <button onClick={() => openEdit(it)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                    <button onClick={() => delItem(it)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {modal && (
        <Modal title={editId ? "İçerik Düzenle" : "Yeni İçerik"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={saveItem} disabled={saving || !form.title} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Tür">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Başlık *"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Slug"><input className="input" placeholder="boş = başlıktan üretilir" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Kısa Açıklama"><input className="input" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></Field>
          <Field label="İçerik"><textarea className="input" rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <p className="text-[11px] text-muted">Paragraflar için boş satır bırakın.</p>
          {typeHasIcon && (
            <Field label="İkon">
              <select className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                <option value="">—</option>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sıra"><input className="input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            <Field label="Yayın Tarihi"><input className="input" type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Yayında (aktif)</label>
        </Modal>
      )}
    </div>
  );
}
