"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getAdminToken, clearAdminToken } from "@/lib/api";
import ThemeToggle from "./ThemeToggle";
import { LayoutDashboard, Building2, ShieldCheck, TrendingUp, CreditCard, FileText, Receipt, Settings, UserCog, LogOut, type LucideIcon } from "lucide-react";

type Admin = { id: number; name: string | null; email: string };

const NAV: { label: string; href: string; icon: LucideIcon; exact?: boolean }[] = [
  { label: "Genel Bakış", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Firmalar", href: "/admin/tenants", icon: Building2 },
  { label: "Sözleşmeler", href: "/admin/contracts", icon: FileText },
  { label: "Gelir & Abonelik", href: "/admin/revenue", icon: TrendingUp },
  { label: "Ödemeler & Faturalar", href: "/admin/payments", icon: Receipt },
  { label: "Planlar", href: "/admin/plans", icon: CreditCard },
  { label: "Yöneticiler", href: "/admin/admins", icon: ShieldCheck },
  { label: "Global Ayarlar", href: "/admin/settings", icon: Settings },
  { label: "Hesabım", href: "/admin/account", icon: UserCog },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) { router.replace("/admin/login"); return; }
    api<Admin>("/admin/me", { admin: true })
      .then((m) => { setMe(m); setReady(true); })
      .catch(() => { clearAdminToken(); router.replace("/admin/login"); });
  }, [router]);

  function logout() {
    clearAdminToken();
    router.replace("/admin/login");
  }

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Yükleniyor…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar — admin kimliği belli olsun diye koyu yüzey */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-[#0B1120] text-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">L</div>
          <div className="leading-tight">
            <div className="text-sm font-bold">Liftonom</div>
            <div className="text-[10px] uppercase tracking-wider text-primary">Süper Admin</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-primary/20 font-medium text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-primary" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-3 text-xs text-gray-500">
          Platform yönetim paneli
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-card px-6">
          <div className="text-sm font-bold text-ink md:hidden">Süper Admin</div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            {me && (
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-light text-xs font-bold text-primary">
                  {(me.name ?? me.email)[0]?.toUpperCase()}
                </div>
                <span className="hidden text-sm text-ink-soft sm:block">{me.name ?? me.email}</span>
              </div>
            )}
            <button onClick={logout} className="flex items-center gap-1 text-sm text-danger hover:underline">
              <LogOut size={16} /> Çıkış
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
