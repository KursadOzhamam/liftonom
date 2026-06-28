"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getAdminToken, clearAdminToken, setToken, ApiError } from "@/lib/api";
import { dateTR } from "@/lib/format";
import { LogOut, LogIn } from "lucide-react";

type Stats = { tenants: number; active_tenants: number; users: number; elevators: number };
type Tenant = {
  id: number; name: string; slug: string; plan: string; plan_expires_at: string | null;
  is_active: boolean; users_count: number; elevators_count: number;
};
type Paginated = { data: Tenant[]; meta: { total: number } };

const PLAN: Record<string, string> = { trial: "Deneme", starter: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      api<Stats>("/admin/stats", { admin: true }),
      api<Paginated>("/admin/tenants", { admin: true }),
    ]);
    setStats(s); setTenants(t.data);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) { router.replace("/admin/login"); return; }
    load().then(() => setReady(true)).catch((e) => {
      if (e instanceof ApiError && e.status === 401) { clearAdminToken(); router.replace("/admin/login"); }
    });
  }, [router, load]);

  async function toggleActive(t: Tenant) {
    await api(`/admin/tenants/${t.id}`, { method: "PUT", admin: true, body: { is_active: !t.is_active } });
    load();
  }

  async function changePlan(t: Tenant, plan: string) {
    await api(`/admin/tenants/${t.id}`, { method: "PUT", admin: true, body: { plan } });
    load();
  }

  async function impersonate(t: Tenant) {
    if (!confirm(`${t.name} firmasına yönetici olarak giriş yapılacak. Devam?`)) return;
    const res = await api<{ token: string }>(`/admin/tenants/${t.id}/impersonate`, { method: "POST", admin: true });
    setToken(res.token);
    window.location.href = "/dashboard";
  }

  function logout() { clearAdminToken(); router.replace("/admin/login"); }

  if (!ready) return <div className="grid min-h-screen place-items-center text-muted">Yükleniyor…</div>;

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-line bg-ink px-6 text-white">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold">L</div>
          <span className="font-bold">Süper Admin</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white">
          <LogOut size={16} /> Çıkış
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-bold text-ink">Platform Yönetimi</h1>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats && [
            { l: "Firma", v: stats.tenants }, { l: "Aktif Firma", v: stats.active_tenants },
            { l: "Kullanıcı", v: stats.users }, { l: "Asansör", v: stats.elevators },
          ].map((c) => (
            <div key={c.l} className="rounded-xl border border-line bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted">{c.l}</div>
              <div className="mt-1 text-2xl font-bold text-primary">{c.v}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-lg font-semibold text-ink">Firmalar</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium text-center">Kullanıcı</th>
                <th className="px-4 py-3 font-medium text-center">Asansör</th>
                <th className="px-4 py-3 font-medium">Bitiş</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{t.name}</div>
                    <div className="text-xs text-muted">/{t.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={t.plan} onChange={(e) => changePlan(t, e.target.value)}
                      className="rounded-lg border border-line px-2 py-1 text-xs">
                      {Object.entries(PLAN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center text-ink-soft">{t.users_count}</td>
                  <td className="px-4 py-3 text-center text-ink-soft">{t.elevators_count}</td>
                  <td className="px-4 py-3 text-ink-soft">{dateTR(t.plan_expires_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(t)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {t.is_active ? "Aktif" : "Askıda"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => impersonate(t)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <LogIn size={14} /> Firma Adına Giriş
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
