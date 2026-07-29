"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Plus, ArrowUp, ArrowDown, X } from "lucide-react";

type Clause = { title: string; body: string; active: boolean };
type Variable = { key: string; label: string };

const PLACEHOLDERS = ["firma_adi", "firma_vkn", "firma_adres", "firma_telefon", "asansor_no", "muayene_eden", "belge_tarihi", "gecerlilik"];

export default function DtrTemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? null : Number(params.id);
  const router = useRouter();

  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [clauses, setClauses] = useState<Clause[]>([{ title: "Raporun Amacı ve Kapsamı", body: "", active: true }]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const t = await api<{ name: string; is_default: boolean; is_active: boolean; clauses: string; variables: string }>(`/quotes/templates/${id}`);
        setName(t.name); setIsDefault(t.is_default); setIsActive(t.is_active);
        const cl = JSON.parse(t.clauses || "[]") as Partial<Clause>[];
        setClauses(cl.map((x) => ({ title: x.title ?? "", body: x.body ?? "", active: x.active !== false })));
        setVariables(JSON.parse(t.variables || "[]"));
      } catch (e) { alert(e instanceof ApiError ? e.message : "Yüklenemedi."); }
      finally { setLoading(false); }
    })();
  }, [id, isNew]);

  const setClause = (i: number, p: Partial<Clause>) => setClauses((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setClauses((c) => {
    const j = i + d; if (j < 0 || j >= c.length) return c;
    const n = [...c]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const addClause = () => setClauses((c) => [...c, { title: "Yeni Madde", body: "", active: true }]);

  async function save() {
    if (!name.trim()) { alert("Şablon adı zorunludur."); return; }
    setSaving(true);
    try {
      const body = { name: name.trim(), kind: "dtr", type: "Durum Tespit Raporu", is_default: isDefault, is_active: isActive, clauses, variables };
      if (isNew) await api("/quotes/templates", { method: "POST", body });
      else await api(`/quotes/templates/${id}`, { method: "PUT", body });
      router.push("/dtr");
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function del() {
    if (isNew || !confirm("Bu şablon silinsin mi?")) return;
    try { await api(`/quotes/templates/${id}`, { method: "DELETE" }); router.push("/dtr"); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Silinemedi."); }
  }

  if (loading) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "Yeni Durum Tespit Raporu Şablonu" : `Şablon: ${name}`}</h1>
      <p className="mt-1 text-sm text-muted">Mevzuat maddelerini düzenleyin, açıp kapatın, sıralayın. Şablon sonradan değişse bile imzalanmış sözleşmeler etkilenmez.</p>

      <div className="mt-5 rounded-2xl border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm text-ink-soft">
        <b className="text-ink">Bilgi:</b> Maddeler örnek niteliğindedir; hukuki bağlayıcılık için firmanızın hukuk danışmanıyla gözden geçirmeniz önerilir.
        Müşteri ve bina bilgileri sözleşme oluşturulurken <code className="rounded bg-card px-1">{"{{musteri_adi}}"}</code> gibi yer tutucularla otomatik doldurulur.
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">Şablon Adı <span className="text-danger">*</span></span>
          <input className="input" placeholder="Örn. Standart Asansör Bakım Sözleşmesi" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Varsayılan şablon (yeni durum tespit raporu kaydında ön-seçili gelir)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Aktif (pasifse seçim listesinde görünmez)
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kullanılabilir Yer Tutucular (otomatik doldurulur)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => <code key={p} className="rounded-md border border-line bg-card px-2 py-0.5 text-xs text-primary">{`{{${p}}}`}</code>)}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Maddeler</h2>
          <button onClick={addClause} className="btn-ghost"><Plus size={15} /> Madde Ekle</button>
        </div>
        <div className="mt-4 space-y-3">
          {clauses.map((cl, i) => (
            <div key={i} className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2">
                <input className="input flex-1" value={cl.title} onChange={(e) => setClause(i, { title: e.target.value })} placeholder="Madde başlığı" />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft"><input type="checkbox" checked={cl.active} onChange={(e) => setClause(i, { active: e.target.checked })} /> Aktif</label>
                <button onClick={() => move(i, -1)} className="btn-ghost px-2 py-1.5" title="Yukarı"><ArrowUp size={14} /></button>
                <button onClick={() => move(i, 1)} className="btn-ghost px-2 py-1.5" title="Aşağı"><ArrowDown size={14} /></button>
                <button onClick={() => setClauses((c) => c.filter((_, j) => j !== i))} className="btn-danger px-2 py-1.5" title="Sil"><X size={14} /></button>
              </div>
              <textarea className="input mt-2 min-h-24" value={cl.body} onChange={(e) => setClause(i, { body: e.target.value })} placeholder="Madde metni…" />
            </div>
          ))}
          {clauses.length === 0 && <p className="text-sm text-muted">Henüz madde yok. &quot;Madde Ekle&quot; ile ekleyin.</p>}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Şablon Değişkenleri <span className="text-sm font-normal text-muted">(forma sorular)</span></h2>
          <button onClick={() => setVariables((v) => [...v, { key: "", label: "" }])} className="btn-ghost"><Plus size={15} /> Değişken Ekle</button>
        </div>
        <p className="mt-1 text-xs text-muted">Belge oluştururken sorulacak özel alanlar. Madde metninde <code className="rounded bg-surface px-1">{"{{anahtar}}"}</code> olarak kullanın. Anahtar küçük harf, rakam ve alt çizgi olmalı (örn. <code className="rounded bg-surface px-1">olay_tarihi</code>).</p>
        <div className="mt-3 space-y-2">
          {variables.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input className="input w-48" placeholder="anahtar" value={v.key}
                onChange={(e) => setVariables((arr) => arr.map((x, j) => (j === i ? { ...x, key: e.target.value.replace(/[^a-z0-9_]/g, "") } : x)))} />
              <input className="input flex-1" placeholder="Etiket (formda görünür)" value={v.label}
                onChange={(e) => setVariables((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <button onClick={() => setVariables((arr) => arr.filter((_, j) => j !== i))} className="btn-danger px-2.5"><X size={14} /></button>
            </div>
          ))}
          {variables.length === 0 && <p className="text-sm text-muted">Henüz değişken yok. &quot;Değişken Ekle&quot; ile ekleyin.</p>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        {!isNew ? <button onClick={del} className="btn-danger">Sil</button> : <span />}
        <div className="flex gap-2">
          <Link href="/dtr" className="btn-ghost">İptal</Link>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}
