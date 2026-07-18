"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TRY } from "@/lib/format";
import { Landmark, Wallet, Plus, Pencil } from "lucide-react";

type Cashbox = { id: number; name: string; type: string; balance: string; currency: string };
type Resp = { data: Cashbox[]; total: number };

const TYPES: Record<string, string> = { cash: "Nakit", bank: "Banka" };
const empty = { name: "", type: "cash", balance: "0", currency: "TRY" };

export default function CashboxesPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; id?: number; form: typeof empty }>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { api<Resp>("/cashboxes").then(setData); }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const body = {
        name: modal.form.name,
        type: modal.form.type,
        balance: Number(modal.form.balance) || 0,
        currency: modal.form.currency,
      };
      if (modal.mode === "create") {
        await api("/cashboxes", { method: "POST", body });
      } else {
        await api(`/cashboxes/${modal.id}`, { method: "PUT", body });
      }
      setModal(null);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Kasalar</h1>
          <p className="mt-1 text-sm text-muted">Nakit ve banka hesaplarınız.</p>
        </div>
        <button onClick={() => setModal({ mode: "create", form: { ...empty } })} className="btn-primary">
          <Plus size={16} /> Yeni
        </button>
      </div>

      {data && (
        <div className="mt-4 rounded-xl border border-line bg-primary p-5 text-white">
          <div className="text-xs uppercase tracking-wide opacity-80">Toplam Bakiye</div>
          <div className="mt-1 text-3xl font-bold">{TRY(data.total)}</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!data
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-card" />
            ))
          : data.data.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted">
                  {c.type === "bank" ? <Landmark size={18} /> : <Wallet size={18} />}
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs">
                    {TYPES[c.type] ?? c.type}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-2xl font-bold text-ink">{TRY(Number(c.balance))}</div>
                  <button
                    onClick={() => setModal({ mode: "edit", id: c.id, form: {
                      name: c.name, type: c.type, balance: String(c.balance), currency: c.currency ?? "TRY",
                    } })}
                    className="text-muted hover:text-primary" title="Düzenle"
                  ><Pencil size={16} /></button>
                </div>
              </div>
            ))}
        {data && data.data.length === 0 && (
          <p className="text-sm text-muted">Henüz kasa eklenmemiş.</p>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-ink">
              {modal.mode === "create" ? "Yeni Kasa" : "Kasa Düzenle"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Kasa Adı *</span>
                <input className="input" value={modal.form.name}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Tür</span>
                  <select className="input" value={modal.form.type} disabled={modal.mode === "edit"}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, type: e.target.value } })}>
                    <option value="cash">Nakit</option>
                    <option value="bank">Banka</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Para Birimi</span>
                  <select className="input" value={modal.form.currency} disabled={modal.mode === "edit"}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, currency: e.target.value } })}>
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  {modal.mode === "create" ? "Açılış Bakiyesi" : "Bakiye"}
                </span>
                <input className="input" type="number" step="0.01" value={modal.form.balance}
                  disabled={modal.mode === "edit"}
                  onChange={(e) => setModal({ ...modal, form: { ...modal.form, balance: e.target.value } })} />
              </label>
              {modal.mode === "edit" && (
                <p className="text-xs text-muted">
                  Tür, para birimi ve bakiye kasa oluşturulduktan sonra değiştirilemez; bakiye yalnızca işlem/transfer ile değişir.
                </p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-line px-4 py-2 text-sm">İptal</button>
              <button onClick={save} disabled={saving || !modal.form.name} className="btn-primary">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
