"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { useOptions } from "@/lib/hooks";
import Modal, { Field } from "@/components/Modal";
import { Plus, Search, Pencil, Trash2, AlertCircle, ArrowLeftRight } from "lucide-react";

type Row = {
  id: number;
  supplier_id: number | null;
  code: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  stock_quantity: number | string;
  min_stock: number | string;
  unit_price: number | string | null;
};
type Paginated = { data: Row[]; meta: { current_page: number; last_page: number; total: number } };

const emptyForm = { supplier_id: "", code: "", name: "", category: "", unit: "", stock_quantity: "0", min_stock: "0", unit_price: "" };
type Form = typeof emptyForm;

const emptyMove = { type: "in" as "in" | "out", quantity: "", unit_price: "", note: "" };

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Paginated["meta"] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: Form }>(null);
  const [move, setMove] = useState<null | { id: number; name: string; form: typeof emptyMove }>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const suppliers = useOptions("/suppliers");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated>(`/inventory?search=${encodeURIComponent(search)}&page=${page}`);
      setRows(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ category: string }[]>("/inventory/categories")
      .then((r) => setCategories(r.map((c) => c.category).filter((c) => c && c !== "Kategorisiz")))
      .catch(() => {});
  }, []);

  function openCreate() { setModal({ mode: "create", form: { ...emptyForm } }); }
  function openEdit(r: Row) {
    setModal({
      mode: "edit", id: r.id, form: {
        supplier_id: r.supplier_id != null ? String(r.supplier_id) : "",
        code: r.code ?? "", name: r.name, category: r.category ?? "", unit: r.unit ?? "",
        stock_quantity: String(Number(r.stock_quantity) || 0), min_stock: String(Number(r.min_stock) || 0),
        unit_price: r.unit_price != null ? String(r.unit_price) : "",
      },
    });
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const f = modal.form;
      const body = {
        supplier_id: f.supplier_id ? Number(f.supplier_id) : null,
        code: f.code || null,
        name: f.name,
        category: f.category || null,
        unit: f.unit || null,
        stock_quantity: Number(f.stock_quantity) || 0,
        min_stock: Number(f.min_stock) || 0,
        unit_price: f.unit_price === "" ? null : Number(f.unit_price),
      };
      if (modal.mode === "create") await api("/inventory", { method: "POST", body });
      else await api(`/inventory/${modal.id}`, { method: "PUT", body });
      setModal(null); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    await api(`/inventory/${id}`, { method: "DELETE" });
    load();
  }

  async function saveMove() {
    if (!move) return;
    setSaving(true);
    try {
      await api(`/inventory/${move.id}/stock-${move.form.type}`, {
        method: "POST", body: {
          quantity: Number(move.form.quantity) || 0,
          unit_price: move.form.unit_price === "" ? null : Number(move.form.unit_price),
          note: move.form.note || null,
        },
      });
      setMove(null); load();
    } catch (e) { alert(e instanceof ApiError ? e.message : "İşlem başarısız."); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Stok</h1>
          <p className="mt-1 text-sm text-muted">{meta?.total ?? 0} ürün</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Yeni</button>
      </div>

      {/* Filtre */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Ürün adı, kod, kategori…"
            className="input pl-9"
          />
        </div>
      </div>

      {/* Tablo */}
      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium text-right">Stok</th>
              <th className="px-4 py-3 font-medium text-right">Min.</th>
              <th className="px-4 py-3 font-medium text-right">Birim Fiyat</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Yükleniyor…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Kayıt bulunamadı.</td></tr>
            ) : (
              rows.map((p) => {
                const low = Number(p.stock_quantity) < Number(p.min_stock);
                return (
                  <tr key={p.id} className={`border-b border-line last:border-0 ${low ? "bg-warning/5" : "hover:bg-surface"}`}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {p.name}
                      {p.code && <span className="ml-2 text-xs text-muted">{p.code}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={low ? "font-semibold text-warning" : "text-ink-soft"}>
                        {Number(p.stock_quantity)} {p.unit ?? ""}
                      </span>
                      {low && <AlertCircle size={14} className="ml-1 inline text-warning" />}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{Number(p.min_stock)}</td>
                    <td className="px-4 py-3 text-right text-ink-soft">{p.unit_price != null && p.unit_price !== "" ? TRY(p.unit_price) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setMove({ id: p.id, name: p.name, form: { ...emptyMove } })} className="text-muted hover:text-primary" title="Stok Hareketi">
                          <ArrowLeftRight size={16} />
                        </button>
                        <button onClick={() => openEdit(p)} className="text-muted hover:text-primary" title="Düzenle">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => remove(p.id)} className="text-muted hover:text-danger" title="Sil">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Önceki</button>
          <span className="text-muted">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">Sonraki</button>
        </div>
      )}

      {/* Ürün ekle/düzenle */}
      {modal && (
        <Modal title={modal.mode === "create" ? "Yeni Ürün" : "Ürün Düzenle"} onClose={() => setModal(null)} footer={
          <>
            <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={save} disabled={saving || !modal.form.name} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </>
        }>
          <Field label="Ürün Adı *">
            <input className="input" value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ürün Kodu">
              <input className="input disabled:opacity-60" value={modal.form.code} disabled={modal.mode === "edit"}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, code: e.target.value } })} />
            </Field>
            <Field label="Birim">
              <input className="input" placeholder="adet, mt, kg…" value={modal.form.unit}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, unit: e.target.value } })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori">
              <input className="input" list="inv-categories" value={modal.form.category}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, category: e.target.value } })} />
              <datalist id="inv-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Tedarikçi">
              <select className="input" value={modal.form.supplier_id}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, supplier_id: e.target.value } })}>
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={modal.mode === "create" ? "Başlangıç Stok" : "Mevcut Stok"}>
              <input className="input disabled:opacity-60" type="number" step="any" value={modal.form.stock_quantity} disabled={modal.mode === "edit"}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, stock_quantity: e.target.value } })} />
            </Field>
            <Field label="Min. Stok">
              <input className="input" type="number" step="any" value={modal.form.min_stock}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, min_stock: e.target.value } })} />
            </Field>
            <Field label="Birim Fiyat">
              <input className="input" type="number" step="any" value={modal.form.unit_price}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, unit_price: e.target.value } })} />
            </Field>
          </div>
          {modal.mode === "edit" && (
            <p className="text-xs text-muted">Stok miktarı yalnızca &quot;Stok Hareketi&quot; ile değiştirilir.</p>
          )}
        </Modal>
      )}

      {/* Stok hareketi */}
      {move && (
        <Modal title={`Stok Hareketi · ${move.name}`} onClose={() => setMove(null)} footer={
          <>
            <button onClick={() => setMove(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
            <button onClick={saveMove} disabled={saving || !move.form.quantity} className="btn-primary">{saving ? "İşleniyor…" : "Kaydet"}</button>
          </>
        }>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tür">
              <select className="input" value={move.form.type}
                onChange={(e) => setMove({ ...move, form: { ...move.form, type: e.target.value as "in" | "out" } })}>
                <option value="in">Giriş (+)</option>
                <option value="out">Çıkış (−)</option>
              </select>
            </Field>
            <Field label="Miktar *">
              <input className="input" type="number" step="any" min={0} value={move.form.quantity}
                onChange={(e) => setMove({ ...move, form: { ...move.form, quantity: e.target.value } })} />
            </Field>
          </div>
          <Field label="Birim Fiyat">
            <input className="input" type="number" step="any" value={move.form.unit_price}
              onChange={(e) => setMove({ ...move, form: { ...move.form, unit_price: e.target.value } })} />
          </Field>
          <Field label="Not">
            <input className="input" value={move.form.note}
              onChange={(e) => setMove({ ...move, form: { ...move.form, note: e.target.value } })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
