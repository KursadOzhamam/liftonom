"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearToken } from "@/lib/api";
import { NAV } from "./nav";
import { LogOut } from "lucide-react";

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
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-line px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">L</div>
          <span className="font-bold text-ink">Liftonom</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.title} className="mb-5">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {group.title}
              </div>
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-primary-light font-medium text-primary border-l-[3px] border-primary"
                        : "text-ink-soft hover:bg-surface"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-primary" : "text-muted"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-white px-6">
          <div className="text-sm text-muted md:hidden font-bold text-ink">Liftonom</div>
          <div className="ml-auto flex items-center gap-4">
            {me && (
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-light text-xs font-bold text-primary">
                  {me.name?.[0] ?? "?"}
                </div>
                <span className="hidden text-sm text-ink-soft sm:block">
                  {me.name} {me.surname} · <span className="text-muted">{me.role}</span>
                </span>
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
