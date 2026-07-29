"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";

type Tpl = { id: number; name: string; is_default: boolean };
type Detail = {
  template_id: number | null; elevator_id: number | null; created_at: string; inspector_name: string | null;
  defects: string[]; actions: string[];
};

const today = () => new Date().toISOString().slice(0, 10);
const empty = { template_id: "", elevator_id: "", issue_date: today(), inspector_name: "", defects: "", actions: "" };
type Form = typeof empty;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function DtrForm({ id }: { id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const elevators = useOptions("/elevators");
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ data: Tpl[] }>("/quotes/templates?kind=dtr");
        setTemplates(r.data);
        if (!id) { const d = r.data.find((t) => t.is_default); if (d) setForm((f) => ({ ...f, template_id: String(d.id) })); }
      } catch { /* ignore */ }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await api<Detail>(`/quotes/${id}`);
        setForm({
          template_id: d.template_id != null ? String(d.template_id) : "",
          elevator_id: d.elevator_id != null ? String(d.elevator_id) : "",
          issue_date: d.created_at ? d.created_at.slice(0, 10) : today(),
          inspector_name: d.inspector_name ?? "",
          defects: (d.defects ?? []).join("\n"), actions: (d.actions ?? []).join("\n"),
        });
      } catch (e) { alert(e instanceof ApiError ? e.message : "Kayıt yüklenemedi."); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function save() {
    if (!form.elevator_id) { alert("Asansör zorunludur."); return; }
    setSaving(true);
    try {
      const body = {
        type: "dtr", template_id: form.template_id ? Number(form.template_id) : null,
        elevator_id: Number(form.elevator_id), issue_date: form.issue_date,
        inspector_name: form.inspector_name.trim() || null,
        defects: lines(form.defects), actions: lines(form.actions), currency: "TRY",
      };
      const res = id
        ? await api<{ id: number }>(`/quotes/${id}`, { method: "PUT", body })
        : await api<{ id: number }>("/quotes", { method: "POST", body });
      router.push(`/dtr/${id ?? res.id}/preview`);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{id ? "Durum Tespit Raporu Düzenle" : "Yeni Durum Tespit Raporu"}</h1>

      <div className="mt-5 rounded-2xl border border-line bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <F label="Belge Şablonu">
              <select className="input" value={form.template_id} onChange={(e) => set({ template_id: e.target.value })}>
                <option value="">Şablon yok (serbest)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (varsayılan)" : ""}</option>)}
              </select>
            </F>
            <p className="mt-1.5 text-xs text-muted">Şablon maddeleri (amaç, mevzuat, sorumluluk, beyan) rapora otomatik eklenir. Asansör/bina bilgileri otomatik doldurulur.</p>
          </div>
          <F label="Asansör" req>
            <select className="input" value={form.elevator_id} onChange={(e) => set({ elevator_id: e.target.value })}>
              <option value="">Asansör seçin…</option>
              {elevators.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </F>

          <F label="Muayene Eden / Yetkili Servis"><input className="input" value={form.inspector_name} onChange={(e) => set({ inspector_name: e.target.value })} /></F>
          <F label="Rapor Tarihi" req><input className="input" type="date" value={form.issue_date} onChange={(e) => set({ issue_date: e.target.value })} /></F>
        </div>

        <div className="mt-4">
          <F label="Tespit Edilen Eksiklik / Kusurlar" hint="her satır bir madde">
            <textarea className="input min-h-28" value={form.defects} onChange={(e) => set({ defects: e.target.value })} placeholder="Her satıra bir eksiklik yazın…" />
          </F>
        </div>
        <div className="mt-4">
          <F label="Yapılması Gereken İşlemler" hint="her satır bir madde">
            <textarea className="input min-h-28" value={form.actions} onChange={(e) => set({ actions: e.target.value })} placeholder="Her satıra bir işlem yazın…" />
          </F>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Link href="/dtr" className="btn-ghost">İptal</Link>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}

function F({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}{req && <span className="text-danger"> *</span>}{hint && <span className="font-normal text-muted"> ({hint})</span>}</span>
      {children}
    </label>
  );
}
