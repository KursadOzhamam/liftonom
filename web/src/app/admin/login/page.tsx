"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAdminToken, ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/admin/login", {
        method: "POST", auth: false, body: { email, password },
      });
      setAdminToken(res.token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş başarısız.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#0B1120] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-bold text-white">L</div>
          <h1 className="mt-3 text-xl font-bold text-white">Liftonom · Süper Admin</h1>
          <p className="text-sm text-gray-400">Platform yönetim paneli</p>
        </div>
        <form onSubmit={submit} className="rounded-xl bg-card p-6 shadow-lg space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">E-posta</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Şifre</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">Demo: admin@liftonom.com / admin123</p>
      </div>
    </div>
  );
}
