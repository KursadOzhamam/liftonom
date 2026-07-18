"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearToken } from "@/lib/api";
import { NAV } from "./nav";
import ThemeToggle from "./ThemeToggle";
import { ConfirmProvider } from "./ConfirmDialog";
import { LogOut, Building2, ChevronDown, Bell } from "lucide-react";

type Me = { name: string; surname?: string; role: string };

const OPEN_KEY = "panel_nav_open";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const activeGroup = NAV.find((g) => g.items.some((i) => i.href === pathname))?.title;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // İlk yüklemede: kayıtlı durum varsa onu, yoksa yalnızca aktif grubu aç
  useEffect(() => {
    try {
      const s = localStorage.getItem(OPEN_KEY);
      if (s) { setOpen(JSON.parse(s)); return; }
    } catch { /* yok say */ }
    setOpen(activeGroup ? { [activeGroup]: true } : { [NAV[0].title]: true });
    // yalnızca ilk montajda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sayfa değişince aktif grubu aç (diğerlerini kapatmadan)
  useEffect(() => {
    if (activeGroup) setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);

  function toggleGroup(title: string) {
    setOpen((o) => {
      const next = { ...o, [title]: !o[title] };
      try { localStorage.setItem(OPEN_KEY, JSON.stringify(next)); } catch { /* yok say */ }
      return next;
    });
  }

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
    <ConfirmProvider>
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
          {NAV.map((group) => {
            const isOpen = !!open[group.title];
            const hasActive = group.items.some((i) => i.href === pathname);
            return (
              <div key={group.title} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.title)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted transition hover:bg-surface hover:text-ink-soft"
                >
                  <span className="flex items-center gap-2">
                    {group.title}
                    {!isOpen && hasActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                {/* Yumuşak açılıp kapanma (grid satır hilesi) */}
                <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-0.5 py-0.5">
                      {group.items.map((item) => {
                        const active = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href as never}
                            tabIndex={isOpen ? 0 : -1}
                            className={`group flex items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm transition ${
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
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-card/80 px-6 backdrop-blur-md">
          <div className="text-sm font-bold text-ink md:hidden">Liftonom</div>
          <div className="ml-auto flex items-center gap-3">
            <Link href={"/notifications" as never} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-primary/40 hover:text-primary" aria-label="Bildirimler" title="Bildirimler">
              <Bell size={16} />
            </Link>
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
    </ConfirmProvider>
  );
}
