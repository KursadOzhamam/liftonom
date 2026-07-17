"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Field } from "@/components/Modal";
import { Settings2, MessageSquareOff, ShieldOff } from "lucide-react";

type Settings = { platform_name: string; support_email: string | null; default_plan: string; otp_enabled: boolean; sms_enabled: boolean };
type Plan = { id: number; code: string; name: string };

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ platform_name: "", support_email: "", default_plan: "" });
  const [info, setInfo] = useState({ otp: false, sms: false });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await api<Settings>("/admin/settings", { admin: true });
    setForm({ platform_name: s.platform_name ?? "", support_email: s.support_email ?? "", default_plan: s.default_plan ?? "" });
    setInfo({ otp: s.otp_enabled, sms: s.sms_enabled });
    try { setPlans(await api<Plan[]>("/admin/plans", { admin: true })); } catch { /* plan yoksa boş */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setSaving(true);
    try {
      await api("/admin/settings", { method: "PUT", admin: true, body: {
        platform_name: form.platform_name, support_email: form.support_email || null, default_plan: form.default_plan || null,
      } });
      setMsg("Ayarlar kaydedildi.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-ink">Global Ayarlar</h1>
        <p className="mt-1 text-sm text-muted">Platform geneli yapılandırma.</p>
      </div>

      {msg && <p className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">{msg}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Settings2 size={18} className="text-primary" /> Genel
          </div>
          <Field label="Platform Adı"><input className="input" value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} /></Field>
          <Field label="Destek E-postası"><input className="input" type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="info@liftonom.com" /></Field>
          <Field label="Varsayılan Plan (yeni kayıtlarda)">
            <select className="input" value={form.default_plan} onChange={(e) => setForm({ ...form, default_plan: e.target.value })}>
              <option value="trial">Deneme (trial)</option>
              {plans.map((p) => <option key={p.id} value={p.code}>{p.name} ({p.code})</option>)}
            </select>
          </Field>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Kaydediliyor…" : "Kaydet"}</button>
          </div>
        </form>

        {/* Salt-okunur durum */}
        <div className="space-y-3 rounded-xl border border-line bg-card p-5">
          <div className="text-sm font-semibold text-ink">Bildirim Kanalları</div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-danger/10 text-danger"><MessageSquareOff size={18} /></span>
            <div>
              <div className="text-sm font-medium text-ink">SMS</div>
              <div className="text-xs text-muted">Kapalı — maliyet nedeniyle devre dışı.</div>
            </div>
            <span className="ml-auto rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">{info.sms ? "Açık" : "Kapalı"}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-danger/10 text-danger"><ShieldOff size={18} /></span>
            <div>
              <div className="text-sm font-medium text-ink">OTP Doğrulama</div>
              <div className="text-xs text-muted">Kapalı — giriş e-posta + şifre ile doğrudan.</div>
            </div>
            <span className="ml-auto rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">{info.otp ? "Açık" : "Kapalı"}</span>
          </div>
          <p className="text-xs text-muted">SMS/OTP tekrar açmak istersen sunucu ortam değişkeni (`OTP_DISABLED=false`) + NETGSM gerekir.</p>
        </div>
      </div>
    </div>
  );
}
