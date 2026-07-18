"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, ApiError } from "@/lib/api";
import { Wrench, Bell, Wallet, Eye, EyeOff, LogIn } from "lucide-react";

type AuthResp = { token: string; user: { name: string }; tenant: { name: string } };
type Mode = "login" | "register";

const FEATURES = [
  { icon: Wrench, title: "Bakım & TSE takibi", desc: "Planlı bakım ve muayene vadesi tek yerde" },
  { icon: Bell, title: "Otomatik bildirimler", desc: "Vade yaklaşınca panelde uyarı" },
  { icon: Wallet, title: "Cari & finans", desc: "Tahsilat, kasa ve çek-senet takibi" },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // ortak
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // kayıt
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await api<AuthResp>("/auth/login", {
              method: "POST",
              auth: false,
              body: { email, password },
            })
          : await api<AuthResp>("/auth/register", {
              method: "POST",
              auth: false,
              body: { company_name: company, name, email, password },
            });
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : mode === "login" ? "Giriş başarısız." : "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md md:max-w-4xl overflow-hidden rounded-3xl border border-line bg-card surface-pop grid md:grid-cols-2">
        {/* SOL — marka paneli (masaüstü) */}
        <div className="hidden md:flex flex-col justify-between gap-10 bg-gradient-to-br from-primary to-primary-dark p-10 text-white">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">Liftonom</div>
            <p className="mt-4 max-w-xs text-lg font-medium leading-snug text-white/90">
              Asansör bakım, arıza ve servis yönetiminin en akıllı yolu.
            </p>
          </div>

          <ul className="space-y-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <div className="font-semibold text-white">{title}</div>
                  <div className="text-sm text-white/70">{desc}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="text-xs text-white/60">© 2026 Liftonom</div>
        </div>

        {/* SAĞ — form paneli */}
        <div className="bg-card p-8 sm:p-10">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-ink">
              {mode === "login" ? "Tekrar hoş geldin 👋" : "Hemen başla 🚀"}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {mode === "login"
                ? "Hesabına giriş yap, devam et."
                : "Firmanı oluştur, yönetmeye başla."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <>
                <Field label="Firma Adı">
                  <input
                    type="text"
                    placeholder="Örn. Yıldız Asansör Ltd."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    autoComplete="organization"
                    className="input"
                  />
                </Field>
                <Field label="Ad Soyad">
                  <input
                    type="text"
                    placeholder="Adınız Soyadınız"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="input"
                  />
                </Field>
              </>
            )}

            <Field label="E-posta">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="ornek@firma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
              />
            </Field>

            <Field label="Şifre">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                "Lütfen bekleyin…"
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Giriş Yap
                </>
              ) : (
                "Firma Oluştur"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {mode === "login" ? (
              <>
                Hesabın yok mu?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-primary hover:underline"
                >
                  Hemen kayıt ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-primary hover:underline"
                >
                  Giriş yap
                </button>
              </>
            )}
          </p>

          <p className="mt-6 text-center text-xs text-muted">
            Demo: demo@liftonom.com / demo1234
          </p>
        </div>
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
