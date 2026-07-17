"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Field } from "@/components/Modal";
import { UserCog, KeyRound } from "lucide-react";

type Me = { id: number; name: string | null; email: string };

export default function AdminAccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [savingP, setSavingP] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const m = await api<Me>("/admin/me", { admin: true });
    setMe(m);
    setProfile({ name: m.name ?? "", email: m.email });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setSavingP(true);
    try {
      await api("/admin/profile", { method: "PUT", admin: true, body: profile });
      setMsg("Profil güncellendi.");
      load();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally { setSavingP(false); }
  }

  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setSavingPw(true);
    try {
      await api("/admin/change-password", { method: "POST", admin: true, body: { current_password: pw.current, new_password: pw.next } });
      setMsg("Şifre güncellendi.");
      setPw({ current: "", next: "" });
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Şifre değiştirilemedi.");
    } finally { setSavingPw(false); }
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-ink">Hesabım</h1>
        <p className="mt-1 text-sm text-muted">Süper admin profilini güncelle ve şifreni değiştir.</p>
      </div>

      {msg && <p className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">{msg}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Profil */}
        <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UserCog size={18} className="text-primary" /> Profil Bilgileri
          </div>
          <Field label="Ad Soyad"><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="E-posta"><input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required /></Field>
          <div className="flex justify-end">
            <button type="submit" disabled={savingP} className="btn-primary">{savingP ? "Kaydediliyor…" : "Kaydet"}</button>
          </div>
        </form>

        {/* Şifre */}
        <form onSubmit={savePw} className="space-y-4 rounded-xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <KeyRound size={18} className="text-primary" /> Şifre Değiştir
          </div>
          <Field label="Mevcut Şifre"><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
          <Field label="Yeni Şifre (min 6)"><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></Field>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPw || !pw.current || pw.next.length < 6} className="btn-primary">{savingPw ? "Değiştiriliyor…" : "Şifreyi Değiştir"}</button>
          </div>
        </form>
      </div>

      {me && <p className="mt-4 text-xs text-muted">Hesap #{me.id} · {me.email}</p>}
    </div>
  );
}
