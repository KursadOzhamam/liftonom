"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearToken } from "@/lib/api";
import { NAV } from "./nav";
import ThemeToggle from "./ThemeToggle";
import { LogOut, Building2 } from "lucide-react";

type Me = { name: string; surname?: string; role: string };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<Me>("/auth/me")
      .then((m) => { setMe(m); setReady(true); })
      .catch(() => { clearToken(); router.replace("/login"); });
  }, [router]);

  function logout() {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">Yükleniyor…</div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-card md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm"><Building2 size={19} strokeWidth={2.2} /></span>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-ink">Liftonom</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Firma Paneli</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as never}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-primary-light font-semibold text-primary"
                          : "font-medium text-ink-soft hover:bg-surface hover:text-ink"
                      }`}
                    >
                      <Icon size={18} className={active ? "text-primary" : "text-muted transition group-hover:text-ink-soft"} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-card/80 px-6 backdrop-blur-md">
          <div className="text-sm font-bold text-ink md:hidden">Liftonom</div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {me && (
              <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                  {me.name?.[0] ?? "?"}
                </span>
                <span className="hidden text-sm font-medium text-ink sm:block">
                  {me.name} {me.surname} <span className="font-normal text-muted">· {me.role}</span>
                </span>
              </div>
            )}
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-danger/40 hover:text-danger" aria-label="Çıkış" title="Çıkış">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
