"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import Modal, { Field } from "@/components/Modal";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

type Item = { id: number; section: string; title: string; description: string | null; icon: string | null; sort_order: number; is_active: boolean };
type Settings = { hero_badge: string | null; hero_title: string | null; hero_title_accent: string | null; hero_subtitle: string | null; show_pricing: boolean };

const SECTIONS: { key: string; label: string; hasIcon: boolean }[] = [
  { key: "feature", label: "Özellikler", hasIcon: true },
  { key: "step", label: "Nasıl Çalışır Adımları", hasIcon: true },
  { key: "compare_old", label: "Karşılaştırma — Eski Yöntem", hasIcon: false },
  { key: "compare_new", label: "Karşılaştırma — Liftonom ile", hasIcon: false },
  { key: "faq", label: "Sıkça Sorulan Sorular (Başlık: soru · Açıklama: cevap)", hasIcon: false },
];
const ICON_NAMES = ["CalendarClock", "Wrench", "WifiOff", "QrCode", "ShieldCheck", "Wallet", "Smartphone", "Receipt", "Boxes", "Users", "UserPlus", "Upload", "Rocket", "Building2", "MapPin", "Bell", "Gauge", "FileText", "Route", "Zap"];

const emptyItem = { section: "feature", title: "", description: "", icon: "", sort_order: 0, is_active: true };

export default function AdminLandingPage() {
  const [settings, setSettings] = useState<Settings>({ hero_badge: "", hero_title: "", hero_title_accent: "", hero_subtitle: "", show_pricing: true });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingS, setSavingS] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ settings: Settings; items: Item[] }>("/admin/landing", { admin: true });
      setSettings({
        hero_badge: r.settings.hero_badge ?? "", hero_title: r.settings.hero_title ?? "",
        hero_title_accent: r.settings.hero_title_accent ?? "", hero_subtitle: r.settings.hero_subtitle ?? "",
        show_pricing: r.settings.show_pricing,
      });
      setItems(r.items ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setSavingS(true);
    try {
      await api("/admin/landing/settings", { method: "PUT", admin: true, body: settings });
      setMsg("Başlık ayarları kaydedildi.");
    } catch (err) { setMsg(err instanceof ApiError ? err.message : "Kaydedilemedi."); }
    finally { setSavingS(false); }
  }

  function openNew(section: string) {
    setEditId(null);
    setForm({ ...emptyItem, section, sort_order: items.filter((i) => i.section === section).length });
    setModal(true);
  }
  function openEdit(it: Item) {
    setEditId(it.id);
    setForm({ section: it.section, title: it.title, description: it.description ?? "", icon: it.icon ?? "", sort_order: it.sort_order, is_active: it.is_active });
    setModal(true);
  }
  async function saveItem() {
    setSaving(true);
    try {
      const body = { section: form.section, title: form.title, description: form.description || null, icon: form.icon || null, sort_order: Number(form.sort_order) || 0, is_active: form.is_active };
      await api(editId ? `/admin/landing/items/${editId}` : "/admin/landing/items", { method: editId ? "PUT" : "POST", admin: true, body });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }
  async function delItem(it: Item) {
    if (!confirm(`"${it.title}" silinsin mi?`)) return;
    try { await api(`/admin/landing/items/${it.id}`, { method: "DELETE", admin: true }); load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  const secHasIcon = SECTIONS.find((s) => s.key === form.section)?.hasIcon;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tanıtım Sayfası</h1>
          <p className="mt-1 text-sm text-muted">Landing içeriğini buradan yönet. Değişiklikler anında yayınlanır.</p>
        </div>
        <a href="https://liftonom.rslabsdev.site" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface">
          Sayfayı Aç <ExternalLink size={14} />
        </a>
      </div>

      {msg && <p className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">{msg}</p>}

      {/* Hero ayarları */}
      <form onSubmit={saveSettings} className="mt-5 space-y-4 rounded-xl border border-line bg-card p-5">
        <div className="text-sm font-semibold text-ink">Üst Bölüm (Hero)</div>
        <Field label="Rozet Metni"><input className="input" value={settings.hero_badge ?? ""} onChange={(e) => setSettings({ ...settings, hero_badge: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Başlık"><input className="input" value={settings.hero_title ?? ""} onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })} /></Field>
          <Field label="Vurgulu Kelime (mavi)"><input className="input" value={settings.hero_title_accent ?? ""} onChange={(e) => setSettings({ ...settings, hero_title_accent: e.target.value })} /></Field>
        </div>
        <Field label="Alt Başlık"><textarea className="input" rows={2} value={settings.hero_subtitle ?? ""} onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })} /></Field>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={settings.show_pricing} onChange={(e) => setSettings({ ...settings, show_pricing: e.target.checked })} /> Fiyatlandırma bölümünü göster</label>
          <button type="submit" disabled={savingS} className="btn-primary">{savingS ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </form>

      {/* Bölümler */}
      {loading ? (
        <p className="mt-6 text-center text-muted">Yükleniyor…</p>
      ) : (
        SECTIONS.map((sec) => {
          const list = items.filter((i) => i.section === sec.key);
          return (
            <div key={sec.key} className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{sec.label} <span className="text-muted/60">({list.length})</span></h2>
                <button onClick={() => openNew(sec.key)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"><Plus size={14} /> Ekle</button>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-card">
                {list.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">Bu bölümde öğe yok.</p>
                ) : list.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                    {sec.hasIcon && <span className="w-24 shrink-0 truncate font-mono text-[11px] text-muted">{it.icon ?? "—"}</span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{it.title}</span>
                        {!it.is_active && <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger">Pasif</span>}
                      </div>
                      {it.description && <p className="mt-0.5 truncate text-xs text-muted">{it.description}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted">#{it.sort_order}</span>
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
        <Modal title={editId ? "Öğe Düzenle" : "Yeni Öğe"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={saveItem} disabled={saving || !form.title} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Bölüm">
            <select className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Başlık *"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          {secHasIcon && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="İkon">
                <select className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                  <option value="">—</option>
                  {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Sıra"><input className="input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            </div>
          )}
          {!secHasIcon && <Field label="Sıra"><input className="input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>}
          <Field label="Açıklama"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Yayında (aktif)</label>
        </Modal>
      )}
    </div>
  );
}
