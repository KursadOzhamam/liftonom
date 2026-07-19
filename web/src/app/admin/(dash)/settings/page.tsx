"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Field } from "@/components/Modal";
import { Settings2, MessageSquareOff, ShieldOff, Mail } from "lucide-react";

type Settings = {
  platform_name: string; support_email: string | null; default_plan: string; otp_enabled: boolean; sms_enabled: boolean;
  smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_from: string | null;
  smtp_from_name: string | null; smtp_ssl: boolean; smtp_password_set: boolean;
};
type Plan = { id: number; code: string; name: string };

const emptySmtp = { smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "", smtp_from: "", smtp_from_name: "", smtp_ssl: true };

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ platform_name: "", support_email: "", default_plan: "" });
  const [smtp, setSmtp] = useState(emptySmtp);
  const [smtpSet, setSmtpSet] = useState(false);
  const [info, setInfo] = useState({ otp: false, sms: false });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [smtpMsg, setSmtpMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await api<Settings>("/admin/settings", { admin: true });
    setForm({ platform_name: s.platform_name ?? "", support_email: s.support_email ?? "", default_plan: s.default_plan ?? "" });
    setInfo({ otp: s.otp_enabled, sms: s.sms_enabled });
    setSmtp({
      smtp_host: s.smtp_host ?? "", smtp_port: s.smtp_port != null ? String(s.smtp_port) : "587",
      smtp_user: s.smtp_user ?? "", smtp_password: "", smtp_from: s.smtp_from ?? "",
      smtp_from_name: s.smtp_from_name ?? "", smtp_ssl: s.smtp_ssl ?? true,
    });
    setSmtpSet(s.smtp_password_set);
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

  async function saveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSmtpMsg(null); setSavingSmtp(true);
    try {
      await api("/admin/settings", { method: "PUT", admin: true, body: {
        platform_name: form.platform_name, support_email: form.support_email || null, default_plan: form.default_plan || null,
        smtp_host: smtp.smtp_host || null, smtp_port: smtp.smtp_port ? Number(smtp.smtp_port) : null,
        smtp_user: smtp.smtp_user || null, smtp_password: smtp.smtp_password || null,
        smtp_from: smtp.smtp_from || null, smtp_from_name: smtp.smtp_from_name || null, smtp_ssl: smtp.smtp_ssl,
      } });
      setSmtpMsg("SMTP ayarları kaydedildi.");
      if (smtp.smtp_password) setSmtpSet(true);
      setSmtp((v) => ({ ...v, smtp_password: "" }));
    } catch (err) {
      setSmtpMsg(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally { setSavingSmtp(false); }
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

      {/* SMTP / E-posta gönderimi */}
      <form onSubmit={saveSmtp} className="mt-5 space-y-4 rounded-xl border border-line bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Mail size={18} className="text-primary" /> SMTP — E-posta Gönderimi
          <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${smtp.smtp_host ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {smtp.smtp_host ? "Yapılandırıldı" : "Yapılandırılmadı"}
          </span>
        </div>
        <p className="text-xs text-muted">
          Sözleşme gönderimi ve bildirim e-postaları bu SMTP hesabıyla iletilir. Boşsa e-posta gönderilmez.
          (Örn. Hostinger: <code className="rounded bg-surface px-1">smtp.hostinger.com</code>, port <code className="rounded bg-surface px-1">465</code> SSL.)
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMTP Sunucu (host)"><input className="input" value={smtp.smtp_host} onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })} placeholder="smtp.hostinger.com" /></Field>
          <Field label="Port"><input className="input" type="number" value={smtp.smtp_port} onChange={(e) => setSmtp({ ...smtp, smtp_port: e.target.value })} placeholder="465 / 587" /></Field>
          <Field label="Kullanıcı"><input className="input" value={smtp.smtp_user} onChange={(e) => setSmtp({ ...smtp, smtp_user: e.target.value })} placeholder="info@firmani.com" /></Field>
          <Field label={`Şifre${smtpSet ? " (kayıtlı — değiştirmek için yaz)" : ""}`}>
            <input className="input" type="password" value={smtp.smtp_password} onChange={(e) => setSmtp({ ...smtp, smtp_password: e.target.value })} placeholder={smtpSet ? "••••••••" : "SMTP şifresi"} />
          </Field>
          <Field label="Gönderen Adres (from)"><input className="input" type="email" value={smtp.smtp_from} onChange={(e) => setSmtp({ ...smtp, smtp_from: e.target.value })} placeholder="info@firmani.com" /></Field>
          <Field label="Gönderen Adı"><input className="input" value={smtp.smtp_from_name} onChange={(e) => setSmtp({ ...smtp, smtp_from_name: e.target.value })} placeholder="Firma Adı" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={smtp.smtp_ssl} onChange={(e) => setSmtp({ ...smtp, smtp_ssl: e.target.checked })} />
          SSL/TLS kullan (genellikle açık)
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={savingSmtp} className="btn-primary">{savingSmtp ? "Kaydediliyor…" : "SMTP'yi Kaydet"}</button>
          {smtpMsg && <span className="text-sm text-success">{smtpMsg}</span>}
        </div>
      </form>
    </div>
  );
}
