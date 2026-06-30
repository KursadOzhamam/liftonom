"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { UserCircle, KeyRound, CheckCircle2 } from "lucide-react";

type Me = { id: number; name: string; surname?: string | null; phone: string; email?: string | null; role: string };
const ROLE: Record<string, string> = { manager: "Yönetici", technician: "Teknisyen", accounting: "Muhasebe", office: "Ofis", viewer: "Görüntüleyici" };

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState({ name: "", surname: "", email: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [savingP, setSavingP] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [okP, setOkP] = useState(false);
  const [okPw, setOkPw] = useState(false);

  useEffect(() => {
    api<Me>("/auth/me").then((m) => { setMe(m); setProfile({ name: m.name ?? "", surname: m.surname ?? "", email: m.email ?? "" }); });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setSavingP(true); setOkP(false);
    try {
      await api("/auth/profile", { method: "PUT", body: { name: profile.name, surname: profile.surname || null, email: profile.email || null } });
      setOkP(true); setTimeout(() => setOkP(false), 2500);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Kaydedilemedi."); } finally { setSavingP(false); }
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault(); setSavingPw(true); setOkPw(false);
    try {
      await api("/auth/change-password", { method: "POST", body: { current_password: pw.current, new_password: pw.next } });
      setOkPw(true); setPw({ current: "", next: "" }); setTimeout(() => setOkPw(false), 2500);
    } catch (e) { alert(e instanceof ApiError ? e.message : "Değiştirilemedi."); } finally { setSavingPw(false); }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Hesabım</h1>
      <p className="mt-1 text-sm text-muted">Profil bilgilerini güncelle ve şifreni değiştir.</p>

      {me && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-card p-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-light text-lg font-bold text-primary">{me.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="font-semibold text-ink">{me.name} {me.surname}</div>
            <div className="text-sm text-muted">{me.phone} · {ROLE[me.role] ?? me.role}</div>
          </div>
        </div>
      )}

      <form onSubmit={saveProfile} className="mt-4 space-y-4 rounded-xl border border-line bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><UserCircle size={18} className="text-primary" /> Profil Bilgileri</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Ad</span><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Soyad</span><input className="input" value={profile.surname} onChange={(e) => setProfile({ ...profile, surname: e.target.value })} /></label>
        </div>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">E-posta</span><input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={savingP} className="btn-primary">{savingP ? "Kaydediliyor…" : "Kaydet"}</button>
          {okP && <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 size={15} /> Kaydedildi</span>}
        </div>
      </form>

      <form onSubmit={changePw} className="mt-4 space-y-4 rounded-xl border border-line bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><KeyRound size={18} className="text-primary" /> Şifre Değiştir</div>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Mevcut Şifre</span><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Yeni Şifre (min 6)</span><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={savingPw || !pw.current || pw.next.length < 6} className="btn-primary">{savingPw ? "Değiştiriliyor…" : "Şifreyi Değiştir"}</button>
          {okPw && <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 size={15} /> Güncellendi</span>}
        </div>
      </form>
    </div>
  );
}
