"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, ApiError } from "@/lib/api";

type LoginResp = { requires_otp?: boolean; dev_code?: string | null; phone?: string; token?: string };
type VerifyResp = { token: string; user: { name: string }; tenant: { name: string } };

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "otp">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<LoginResp>("/auth/login", {
        method: "POST",
        auth: false,
        body: { phone, password },
      });
      // OTP kapalıysa API doğrudan token döner → giriş tamam.
      if (res.token) {
        setToken(res.token);
        router.push("/dashboard");
        return;
      }
      if (res.requires_otp) {
        setStep("otp");
        setDevCode(res.dev_code ?? null);
        if (res.dev_code) setCode(res.dev_code);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<VerifyResp>("/auth/verify-otp", {
        method: "POST",
        auth: false,
        body: { phone, code },
      });
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Doğrulama başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 justify-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white font-bold text-lg">
            L
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-none">Liftonom</div>
            <div className="text-xs text-muted mt-1">Asansör Servis Yönetimi</div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-6 shadow-sm">
          {step === "login" ? (
            <form onSubmit={submitLogin} className="space-y-4">
              <h1 className="text-lg font-semibold text-ink">Giriş Yap</h1>
              <Field label="Telefon">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="05XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input"
                />
              </Field>
              <Field label="Şifre">
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input"
                />
              </Field>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Gönderiliyor…" : "Devam Et"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="space-y-4">
              <h1 className="text-lg font-semibold text-ink">Doğrulama Kodu</h1>
              <p className="text-sm text-muted">
                {phone} numarasına gönderilen 6 haneli kodu girin.
              </p>
              {devCode && (
                <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">
                  Geliştirme kodu: <b>{devCode}</b>
                </p>
              )}
              <Field label="Kod">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="input tracking-[0.4em] text-center text-lg"
                />
              </Field>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Doğrulanıyor…" : "Giriş Yap"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("login"); setError(null); }}
                className="w-full text-sm text-muted hover:text-ink"
              >
                ← Geri dön
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          © 2026 Liftonom · Demo: 0543 123 45 67 / 123456
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
