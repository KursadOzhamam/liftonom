"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import Modal, { Field } from "@/components/Modal";
import { Tag, Plus, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

type Cat = { id: number; name: string };
type Stat = { category: string; product_count: number; total_stock: number };

export default function CategoriesPage() {
  const confirm = useConfirm();
  const [cats, setCats] = useState<Cat[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCats(await api<Cat[]>("/product-categories"));
      try { setStats(await api<Stat[]>("/inventory/categories")); } catch { /* opsiyonel */ }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const countFor = (n: string) => stats.find((s) => s.category === n)?.product_count ?? 0;

  function openNew() { setEditId(null); setName(""); setModal(true); }
  function openEdit(c: Cat) { setEditId(c.id); setName(c.name); setModal(true); }
  async function save() {
    setSaving(true);
    try {
      await api(editId ? `/product-categories/${editId}` : "/product-categories", { method: editId ? "PUT" : "POST", body: { name } });
      setModal(false); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }
  async function del(c: Cat) {
    if (!(await confirm(`"${c.name}" kategorisi silinsin mi?`))) return;
    try { await api(`/product-categories/${c.id}`, { method: "DELETE" }); load(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><Tag className="text-primary" size={22} /><h1 className="text-2xl font-bold text-ink">Stok Kategorileri</h1></div>
          <p className="mt-1 text-sm text-muted">Ürün kategorilerini yönetin. Kategori, ürün eklerken (Stok modülü) seçilir.</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Yeni Kategori</button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium text-center">Ürün Sayısı</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : cats.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted">Henüz kategori yok.</td></tr>
            ) : cats.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3 text-center text-ink-soft">{countFor(c.name)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" aria-label="Düzenle"><Pencil size={15} /></button>
                    <button onClick={() => del(c)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger" aria-label="Sil"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Kategori Düzenle" : "Yeni Kategori"} onClose={() => setModal(false)} footer={
          <>
            <button onClick={() => setModal(false)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !name.trim()} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Kategori Adı *"><input className="input" placeholder="Kabin Aksesuarları" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        </Modal>
      )}
    </div>
  );
}
