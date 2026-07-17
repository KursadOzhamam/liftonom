"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Building2, Menu, X } from "lucide-react";

const NAV = [
  { href: "/#ozellikler", label: "Özellikler" },
  { href: "/#moduller", label: "Çözümler" },
  { href: "/#fiyatlar", label: "Fiyatlar" },
  { href: "/rehber", label: "Rehber" },
  { href: "/#sss", label: "SSS" },
];

/** Tüm halka açık sayfalarda ortak üst menü. */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm"><Building2 size={19} strokeWidth={2.2} /></span>
          <span className="text-lg tracking-tight text-ink">Liftonom</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="text-sm text-ink-soft transition hover:text-primary">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark sm:inline-flex">Panele Giriş</Link>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menü" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-card px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface">{n.label}</Link>)}
            <Link href="/login" className="mt-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white">Panele Giriş</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
