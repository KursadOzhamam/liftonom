"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { CalendarPlus, CheckCircle2 } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
type Result = { message: string; created: number; total_elevators: number };

export default function BulkMaintenancePage() {
  const [form, setForm] = useState({ planned_date: today(), type: "periodic", region_id: "", skip_existing: true });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const regions = useOptions("/regions");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setResult(null);
    try {
      const r = await api<Result>("/maintenance/bulk", { method: "POST", body: {
        planned_date: form.planned_date, type: form.type,
        region_id: form.region_id ? Number(form.region_id) : null, skip_existing: form.skip_existing,
      } });
      setResult(r);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Oluşturulamadı."); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><CalendarPlus size={18} /></div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Aylık Toplu Bakım Oluştur</h1>
          <p className="text-sm text-muted">Tüm (veya bölgedeki) asansörler için tek seferde planlı bakım oluşturur.</p>
        </div>
      </div>

      {result && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 size={20} className="mt-0.5 text-success" />
          <div className="text-sm">
            <div className="font-semibold text-ink">{result.message}</div>
            <div className="mt-1 text-ink-soft">{result.total_elevators} asansörden {result.created} tanesi için yeni bakım planlandı.</div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4 rounded-xl border border-line bg-card p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Planlanan Tarih *</span>
          <input className="input" type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Bakım Tipi</span>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="periodic">Periyodik</option>
            <option value="annual">Yıllık</option>
            <option value="inspection">Muayene</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Bölge (boş = tüm asansörler)</span>
          <select className="input" value={form.region_id} onChange={(e) => setForm({ ...form, region_id: e.target.value })}>
            <option value="">Tüm Bölgeler</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.skip_existing} onChange={(e) => setForm({ ...form, skip_existing: e.target.checked })} />
          Aynı gün zaten planlı bakımı olan asansörleri atla
        </label>
        <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Oluşturuluyor…" : "Toplu Bakım Oluştur"}</button>
      </form>
    </div>
  );
}
