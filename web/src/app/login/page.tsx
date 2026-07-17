"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, ApiError } from "@/lib/api";

type AuthResp = { token: string; user: { name: string }; tenant: { name: string } };
type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // ortak
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // kayıt
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");

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
          {/* Sekmeler */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-md py-2 text-sm font-medium transition ${
                  mode === m ? "bg-card text-primary shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </button>
            ))}
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
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 6 : undefined}
                className="input"
              />
            </Field>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Lütfen bekleyin…" : mode === "login" ? "Giriş Yap" : "Firma Oluştur"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            {mode === "login" ? (
              <>
                Hesabın yok mu?{" "}
                <button type="button" onClick={() => switchMode("register")} className="font-medium text-primary hover:underline">
                  Kayıt ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{" "}
                <button type="button" onClick={() => switchMode("login")} className="font-medium text-primary hover:underline">
                  Giriş yap
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          © 2026 Liftonom · Demo: demo@liftonom.com / demo1234
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
