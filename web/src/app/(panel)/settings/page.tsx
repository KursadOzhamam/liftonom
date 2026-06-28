"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";

type Settings = {
  name: string; phone: string | null; email: string | null; address: string | null;
  tax_number: string | null; tax_office: string | null;
  plan: string; plan_expires_at: string | null; sms_balance: number;
};

const PLAN: Record<string, string> = { trial: "Deneme", starter: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api<Settings>("/settings").then(setData); }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d));
    setSaved(false);
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await api("/settings", { method: "PUT", body: {
        name: data.name, phone: data.phone, email: data.email,
        address: data.address, tax_number: data.tax_number, tax_office: data.tax_office,
      } });
      setSaved(true);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  if (!data) return <div className="text-muted">Yükleniyor…</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Ayarlar</h1>
      <p className="mt-1 text-sm text-muted">Firma bilgileri ve abonelik.</p>

      {/* Abonelik */}
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Plan</div>
          <div className="mt-1 font-semibold text-ink">{PLAN[data.plan] ?? data.plan}</div>
        </div>
        <div className="border-l border-line pl-4">
          <div className="text-xs uppercase tracking-wide text-muted">Bitiş</div>
          <div className="mt-1 font-semibold text-ink">{dateTR(data.plan_expires_at)}</div>
        </div>
        <div className="border-l border-line pl-4">
          <div className="text-xs uppercase tracking-wide text-muted">SMS Bakiyesi</div>
          <div className="mt-1 font-semibold text-ink">{data.sms_balance}</div>
        </div>
      </div>

      {/* Firma bilgileri */}
      <div className="mt-5 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">Firma Bilgileri</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Firma Adı"><input className="input" value={data.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Telefon"><input className="input" value={data.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="E-posta"><input className="input" value={data.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Vergi No"><input className="input" value={data.tax_number ?? ""} onChange={(e) => set("tax_number", e.target.value)} /></Field>
          <Field label="Vergi Dairesi"><input className="input" value={data.tax_office ?? ""} onChange={(e) => set("tax_office", e.target.value)} /></Field>
          <Field label="Adres" full><textarea className="input min-h-20" value={data.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          {saved && <span className="text-sm text-success">✓ Kaydedildi</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
