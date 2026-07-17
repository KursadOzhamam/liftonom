"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight,
  Building2,
  Wrench,
  CalendarClock,
  Boxes,
  Wallet,
  Users,
  FileText,
  ShieldCheck,
  MapPin,
  Bell,
  QrCode,
  Smartphone,
  Check,
  Menu,
  X,
  Gauge,
  Phone,
  Mail,
} from "lucide-react";

/* Liftonom logosu — asansör kabini + hareket okları */
function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm">
        <Building2 size={19} strokeWidth={2.2} />
      </span>
      <span className="text-lg tracking-tight text-ink">Liftonom</span>
    </span>
  );
}

const NAV = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#moduller", label: "Modüller" },
  { href: "#mobil", label: "Mobil Saha" },
  { href: "#iletisim", label: "İletişim" },
];

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Bakım Takvimi",
    desc: "Periyodik bakımları planlayın, toplu atayın, kaçan bakım kalmasın. Bakım ücretleri ve geçmişi tek yerde.",
  },
  {
    icon: Wrench,
    title: "6 Aşamalı Arıza Yönetimi",
    desc: "Bildirim → sevk → inceleme → onarım → parça → tamamlandı. Her aşama zaman damgalı, teknisyen konumuyla izlenir.",
  },
  {
    icon: ShieldCheck,
    title: "TSE & Muayene Takibi",
    desc: "Muayene tarihleri, ATF ve DTR formları, kurtarma & eğitim belgeleri; yasal süreçleri eksiksiz yönetin.",
  },
  {
    icon: Boxes,
    title: "Stok & Depo",
    desc: "Ürün, kategori, lokasyon ve tedarikçi yönetimi. Düşük stok uyarıları ile parça hiç bitmesin.",
  },
  {
    icon: Wallet,
    title: "Finans & Cari",
    desc: "Tahsilat, cari hesaplar, kasa, çek & senet ve finansal özet. Nakit akışınızı anlık görün.",
  },
  {
    icon: Users,
    title: "Personel & Hakediş",
    desc: "Ekip, devamsızlık, hakediş ve araç takibi. Saha personelinin canlı konumu haritada.",
  },
  {
    icon: FileText,
    title: "Teklif & Sözleşme",
    desc: "Teklif, revizyon teklifi, sözleşme ve iş emri; müşteriye giden her belge tek akışta.",
  },
  {
    icon: Building2,
    title: "Müşteri · Bina · Asansör",
    desc: "Tüm portföyünüzü hiyerarşik yönetin. Her asansörün bakım, arıza ve belge geçmişi bir arada.",
  },
];

const MOBILE_FEATURES = [
  { icon: MapPin, title: "Canlı Konum", desc: "Aktif görev varken pil dostu arka plan konumu." },
  { icon: Bell, title: "Anlık Push", desc: "Yeni atanan arıza ve bakımlar için bildirim." },
  { icon: QrCode, title: "QR ile Asansör", desc: "Sahada QR okutup asansör kaydına anında ulaşın." },
  { icon: Wrench, title: "Görevlerim", desc: "Size atanan arıza ve bakımlar cebinizde." },
];

const STATS = [
  { value: "40+", label: "Hazır modül" },
  { value: "6", label: "Aşamalı arıza döngüsü" },
  { value: "Çok kiracılı", label: "İzole firma verisi" },
  { value: "iOS · Android", label: "Saha mobil app" },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-ink-soft transition hover:text-primary">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark sm:inline-flex"
            >
              Panele Giriş
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menü"
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-line bg-card px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface"
                >
                  {n.label}
                </a>
              ))}
              <Link
                href="/login"
                className="mt-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white"
              >
                Panele Giriş
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-light/50 to-transparent"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Asansör bakım & servis yönetim platformu
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Asansör operasyonunuzu <span className="text-primary">tek panelden</span> yönetin
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Bakım, arıza, muayene, stok, finans ve saha ekibi — hepsi Liftonom&apos;da. Ofis paneli ve
              teknisyen mobil uygulamasıyla sahayı gerçek zamanlı takip edin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                Panele Giriş <ArrowRight size={16} />
              </Link>
              <a
                href="#ozellikler"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
              >
                Özellikleri Keşfet
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-success" /> Çok kiracılı mimari
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-success" /> Kurulum gerekmez
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-success" /> Mobil saha desteği
              </span>
            </div>
          </div>

          {/* Ürün önizleme kartı */}
          <div className="relative">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-xl shadow-primary/5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={18} className="text-primary" />
                  <span className="text-sm font-semibold text-ink">Genel Bakış</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "Aktif Asansör", v: "1.284", c: "text-primary" },
                  { k: "Açık Arıza", v: "17", c: "text-danger" },
                  { k: "Bu Ay Bakım", v: "342", c: "text-success" },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl border border-line bg-surface p-3">
                    <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
                    <div className="mt-0.5 text-[11px] leading-tight text-muted">{s.k}</div>
                  </div>
                ))}
              </div>
              {/* Sahte grafik */}
              <div className="mt-4 flex h-28 items-end gap-2 rounded-xl border border-line bg-surface p-3">
                {[45, 62, 38, 78, 55, 84, 70, 92, 60, 74].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary/80" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { t: "Arıza #4821 · Bakırköy", s: "Onarımda", c: "bg-warning/15 text-warning" },
                  { t: "Bakım · Levent Plaza", s: "Tamamlandı", c: "bg-success/15 text-success" },
                ].map((r) => (
                  <div
                    key={r.t}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2"
                  >
                    <span className="text-xs text-ink-soft">{r.t}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${r.c}`}>{r.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── İstatistik şeridi ── */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-primary sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Özellikler ── */}
      <section id="ozellikler" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink">Sahadan ofise, tek platform</h2>
          <p className="mt-4 text-ink-soft">
            Asansör bakım firmasının ihtiyaç duyduğu her modül kutudan çıktığı gibi hazır.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-line bg-card p-6 transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary transition group-hover:bg-primary group-hover:text-white">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modüller vurgu ── */}
      <section id="moduller" className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Kağıt ve Excel&apos;e veda edin
            </h2>
            <p className="mt-4 text-ink-soft">
              Müşteriden tahsilata, teklife, iş emrine kadar tüm operasyon dijitalde. Her kayıt
              izlenebilir, her belge tek tıkla PDF.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Bina ve asansör bazlı bakım & arıza geçmişi",
                "TSE muayene, ATF, DTR, kurtarma ve eğitim formları",
                "Tahsilat, cari, kasa, çek & senet ile tam finans",
                "Stok, düşük stok uyarısı ve tedarikçi yönetimi",
                "Personel hakediş, devamsızlık ve araç takibi",
              ].map((li) => (
                <li key={li} className="flex items-start gap-3 text-sm text-ink-soft">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check size={13} />
                  </span>
                  {li}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Building2, k: "Portföy" },
              { icon: Wrench, k: "Arıza" },
              { icon: Wallet, k: "Finans" },
              { icon: Boxes, k: "Stok" },
              { icon: FileText, k: "Belgeler" },
              { icon: Users, k: "Personel" },
            ].map((m) => (
              <div
                key={m.k}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
                  <m.icon size={18} />
                </span>
                <span className="text-sm font-medium text-ink">{m.k}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobil saha ── */}
      <section id="mobil" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              {MOBILE_FEATURES.map((m) => (
                <div key={m.title} className="rounded-2xl border border-line bg-card p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/15 text-info">
                    <m.icon size={18} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{m.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft">
              <Smartphone size={13} className="text-info" /> Teknisyen mobil uygulaması
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink">
              Saha ekibiniz her zaman bağlı
            </h2>
            <p className="mt-4 text-ink-soft">
              Teknisyenler kendilerine atanan arıza ve bakımları mobil uygulamadan görür, QR ile asansöre
              ulaşır ve konumlarını canlı paylaşır. Yeni atamalar anında push bildirimiyle iletilir.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm text-ink-soft">
                <Check size={15} className="text-success" /> iOS & Android
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm text-ink-soft">
                <Check size={15} className="text-success" /> Pil dostu konum
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center shadow-lg sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">Demoyu hemen deneyin</h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-light">
            Liftonom paneline giriş yapın, asansör operasyonunun tek yerden nasıl yönetildiğini görün.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary-light"
          >
            Panele Giriş <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="iletisim" className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-sm text-muted">
                Asansör bakım ve servis firmaları için uçtan uca operasyon yönetim platformu.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-ink">İletişim</span>
              <a href="mailto:info@liftonom.com" className="inline-flex items-center gap-2 text-ink-soft hover:text-primary">
                <Mail size={15} /> info@liftonom.com
              </a>
              <span className="inline-flex items-center gap-2 text-ink-soft">
                <Phone size={15} /> +90 (500) 000 00 00
              </span>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
            <span>© {new Date().getFullYear()} Liftonom. Tüm hakları saklıdır.</span>
            <span>Asansör Servis Yönetimi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
