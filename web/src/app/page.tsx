"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight, Building2, Wrench, CalendarClock, Boxes, Wallet, Users, FileText,
  ShieldCheck, MapPin, Bell, QrCode, Smartphone, Check, X, Menu, Gauge, Phone, Mail,
  WifiOff, Receipt, UserPlus, Upload, Rocket, Route, Zap, Sparkles, ChevronDown, Quote,
} from "lucide-react";

/* ── ikon eşlemesi (admin string → bileşen) ── */
const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Building2, Wrench, CalendarClock, Boxes, Wallet, Users, FileText, ShieldCheck, MapPin,
  Bell, QrCode, Smartphone, Gauge, WifiOff, Receipt, UserPlus, Upload, Rocket, Route, Zap,
};
function LucideIcon({ name, size = 20, className = "" }: { name?: string | null; size?: number; className?: string }) {
  const C = (name && ICONS[name]) || Sparkles;
  return <C size={size} className={className} />;
}

type Item = { id: number; section: string; title: string; description: string | null; icon: string | null };
type Landing = {
  settings: { hero_badge: string | null; hero_title: string | null; hero_title_accent: string | null; hero_subtitle: string | null; show_pricing: boolean };
  features: Item[]; modules: Item[]; steps: Item[]; compare_old: Item[]; compare_new: Item[];
  testimonials: Item[]; faqs: Item[];
};
type Plan = { id: number; code: string; name: string; monthly_price: number; max_users: number | null; max_elevators: number | null };

/* ── varsayılan içerik (API'den önce SSR göstersin) ── */
const DEFAULT: Landing = {
  settings: {
    hero_badge: "Asansör bakım & servis yönetim platformu",
    hero_title: "Asansör operasyonunuzu", hero_title_accent: "tek panelden",
    hero_subtitle: "Bakım, arıza, muayene, stok, finans ve saha ekibi — hepsi Liftonom'da. Ofis paneli ve teknisyen mobil uygulamasıyla sahayı gerçek zamanlı takip edin.",
    show_pricing: true,
  },
  features: [
    { id: 1, section: "feature", title: "Akıllı Bakım Takvimi", description: "Periyodik bakımlar otomatik planlanır; 30/15/7/1 gün önce hatırlatma.", icon: "CalendarClock" },
    { id: 2, section: "feature", title: "6 Aşamalı Arıza Yönetimi", description: "Bildirim → sevk → inceleme → onarım → parça → tamamlandı; her aşama izlenir.", icon: "Wrench" },
    { id: 3, section: "feature", title: "Offline Mobil Çalışma", description: "Sinyalsiz bölgede bakım tamamlanır, bağlantı gelince senkronlanır.", icon: "WifiOff" },
    { id: 4, section: "feature", title: "QR ile Sıfır Temaslı Arıza", description: "Müşteri kabindeki QR'ı okutur, uygulama indirmeden arıza bildirir.", icon: "QrCode" },
    { id: 5, section: "feature", title: "TSE A/B/C/D Dijital Form", description: "Periyodik kontrol formları mobilde doldurulur, imzalanır, arşivlenir.", icon: "ShieldCheck" },
    { id: 6, section: "feature", title: "Sahada Mobil Tahsilat", description: "Teknisyen nakit/kart/online link ile anında tahsilat alır.", icon: "Wallet" },
  ],
  modules: [
    { id: 11, section: "module", title: "Bakım Takip", description: "Planla, ata, dijital form + fotoğraf + imzayla raporla.", icon: "CalendarClock" },
    { id: 12, section: "module", title: "Arıza Yönetimi", description: "Tek panele düşer, en yakın teknisyene atanır, SLA ölçülür.", icon: "Wrench" },
    { id: 13, section: "module", title: "Teknisyen Mobil", description: "iOS + Android native; sahada görev al, offline çalış.", icon: "Smartphone" },
    { id: 14, section: "module", title: "Fatura & Tahsilat", description: "Tek tıkla fatura; online ödeme linki ve vade takibi.", icon: "Receipt" },
    { id: 15, section: "module", title: "Stok & Depo", description: "Ürün, lokasyon, tedarikçi + düşük stok uyarıları.", icon: "Boxes" },
    { id: 16, section: "module", title: "Müşteri Portalı", description: "Bina yöneticisi bakım ve arızalarını görür.", icon: "Users" },
  ],
  steps: [
    { id: 21, section: "step", title: "60 Saniyede Kayıt", description: "E-posta ile firmanı oluştur; hesabın anında aktif.", icon: "UserPlus" },
    { id: 22, section: "step", title: "Verilerini Aktar", description: "Excel verilerini toplu yükle; transfer desteği sunarız.", icon: "Upload" },
    { id: 23, section: "step", title: "Ekibini Davet Et", description: "Teknisyen, ofis, finans — herkesi rolüne göre ekle.", icon: "Users" },
    { id: 24, section: "step", title: "Dijital Operasyona Geç", description: "Bakım, arıza, fatura tek panelde.", icon: "Rocket" },
  ],
  compare_old: [
    { id: 31, section: "compare_old", title: "Periyodik bakım takvimi unutulur, ceza riski doğar", description: null, icon: null },
    { id: 32, section: "compare_old", title: "Teknisyen sahada ne yaptı akşama kadar belirsiz", description: null, icon: null },
    { id: 33, section: "compare_old", title: "Servis formları kağıtta; denetimde belge bulunamaz", description: null, icon: null },
    { id: 34, section: "compare_old", title: "Fatura kesimi sarkar, tahsilat geç kalır", description: null, icon: null },
  ],
  compare_new: [
    { id: 41, section: "compare_new", title: "Bakım takvimi otomatik; 30/15/7/1 gün önce hatırlatma", description: null, icon: null },
    { id: 42, section: "compare_new", title: "Saha durumu canlı; konum, fotoğraf ve imza anında ofiste", description: null, icon: null },
    { id: 43, section: "compare_new", title: "Dijital form bulutta; denetimde 30 saniyede belge", description: null, icon: null },
    { id: 44, section: "compare_new", title: "Bakım kapanırken tek tıkla fatura + online ödeme", description: null, icon: null },
  ],
  testimonials: [
    { id: 51, section: "testimonial", title: "Mehmet Demir — Demir Asansör", description: "Bakım takvimini artık hiç kaçırmıyoruz. Teknisyenlerin sahadaki durumunu anlık görmek işimizi kökten değiştirdi.", icon: null },
    { id: 52, section: "testimonial", title: "Ayşe Kaya — Kaya Lift", description: "Kağıt formlardan kurtulduk; TSE denetiminde tüm belgeler saniyeler içinde elimizde. Tahsilat da hızlandı.", icon: null },
    { id: 53, section: "testimonial", title: "Kürşad Özhamam — Öz Asansör", description: "Tek panelden bakım, arıza ve faturayı yönetmek harika. Ekip verimliliğimiz belirgin arttı.", icon: null },
  ],
  faqs: [
    { id: 61, section: "faq", title: "Kurulum ve eğitim ücretli mi?", description: "Hayır. Kurulum, veri aktarımı ve ekip eğitimi abonelik fiyatına dahildir.", icon: null },
    { id: 62, section: "faq", title: "Mevcut Excel verilerimi aktarabilir miyim?", description: "Evet. Şablona dönüştürüp toplu yükleyebilirsiniz; ekibimiz transfer desteği sunar.", icon: null },
    { id: 63, section: "faq", title: "Teknisyen uygulaması internetsiz çalışır mı?", description: "Evet. Sinyalsiz bölgede bakım tamamlanır, imza alınır; bağlantı gelince otomatik senkronlanır.", icon: null },
    { id: 64, section: "faq", title: "İstediğim zaman iptal edebilir miyim?", description: "Aylık abonelikte taahhüt yoktur, dilediğiniz zaman iptal edebilirsiniz. Yıllık abonelik daha avantajlıdır.", icon: null },
    { id: 65, section: "faq", title: "Verilerim güvende mi?", description: "Her firmanın verisi izole tutulur (çok kiracılı mimari), düzenli yedeklenir ve şifreli saklanır.", icon: null },
  ],
};

const NAV = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#moduller", label: "Modüller" },
  { href: "#fiyatlar", label: "Fiyatlar" },
  { href: "#sss", label: "SSS" },
  { href: "#iletisim", label: "İletişim" },
];
const TRY0 = (n: number) => "₺" + Math.round(n).toLocaleString("tr-TR");

function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm"><Building2 size={19} strokeWidth={2.2} /></span>
      <span className="text-lg tracking-tight text-ink">Liftonom</span>
    </span>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [d, setD] = useState<Landing>(DEFAULT);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    api<Landing>("/public/landing", { auth: false }).then((r) => {
      // boş bölümleri varsayılana düşür (içerik hiç yoksa boş görünmesin)
      setD({
        settings: r.settings ?? DEFAULT.settings,
        features: r.features?.length ? r.features : DEFAULT.features,
        modules: r.modules?.length ? r.modules : DEFAULT.modules,
        steps: r.steps?.length ? r.steps : DEFAULT.steps,
        compare_old: r.compare_old?.length ? r.compare_old : DEFAULT.compare_old,
        compare_new: r.compare_new?.length ? r.compare_new : DEFAULT.compare_new,
        testimonials: r.testimonials?.length ? r.testimonials : DEFAULT.testimonials,
        faqs: r.faqs?.length ? r.faqs : DEFAULT.faqs,
      });
    }).catch(() => {});
    api<Plan[]>("/public/plans", { auth: false }).then((p) => setPlans(p ?? [])).catch(() => {});
  }, []);

  const s = d.settings;

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => <a key={n.href} href={n.href} className="text-sm text-ink-soft transition hover:text-primary">{n.label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark sm:inline-flex">Panele Giriş</Link>
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menü" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-line bg-card px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface">{n.label}</a>)}
              <Link href="/login" className="mt-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white">Panele Giriş</Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-light/50 to-transparent" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />{s.hero_badge}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              {s.hero_title} <span className="text-primary">{s.hero_title_accent}</span> yönetin
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{s.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark">Ücretsiz Başla <ArrowRight size={16} /></Link>
              <a href="#ozellikler" className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface">Özellikleri Keşfet</a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-success" /> Kredi kartı gerekmez</span>
              <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-success" /> Kurulum yok</span>
              <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-success" /> Mobil saha desteği</span>
            </div>
          </div>

          {/* Ürün önizleme */}
          <div className="relative">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-xl shadow-primary/5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Gauge size={18} className="text-primary" /><span className="text-sm font-semibold text-ink">Operasyon Panosu</span></div>
                <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning/70" /><span className="h-2.5 w-2.5 rounded-full bg-success/70" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ k: "Bugünkü Bakım", v: "18", c: "text-primary" }, { k: "Açık Arıza", v: "3", c: "text-danger" }, { k: "Tahsilat", v: "₺42.8K", c: "text-success" }].map((x) => (
                  <div key={x.k} className="rounded-xl border border-line bg-surface p-3"><div className={`text-xl font-bold ${x.c}`}>{x.v}</div><div className="mt-0.5 text-[11px] leading-tight text-muted">{x.k}</div></div>
                ))}
              </div>
              <div className="mt-4 flex h-28 items-end gap-2 rounded-xl border border-line bg-surface p-3">
                {[45, 62, 38, 78, 55, 84, 70, 92, 60, 74].map((h, i) => <div key={i} className="flex-1 rounded-t bg-primary/80" style={{ height: `${h}%` }} />)}
              </div>
              <div className="mt-4 space-y-2">
                {[{ t: "Park Residence · A Blok", s: "Sahada", c: "bg-warning/15 text-warning" }, { t: "Mavişehir Sitesi · 2 Asansör", s: "Tamamlandı", c: "bg-success/15 text-success" }].map((r) => (
                  <div key={r.t} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2"><span className="text-xs text-ink-soft">{r.t}</span><span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${r.c}`}>{r.s}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {[{ v: "40+", l: "Hazır modül" }, { v: "6", l: "Aşamalı arıza döngüsü" }, { v: "Çok kiracılı", l: "İzole firma verisi" }, { v: "iOS · Android", l: "Saha mobil app" }].map((x) => (
            <div key={x.l} className="text-center"><div className="text-2xl font-bold text-primary sm:text-3xl">{x.v}</div><div className="mt-1 text-sm text-muted">{x.l}</div></div>
          ))}
        </div>
      </section>

      {/* ── Karşılaştırma ── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Neden geçmelisiniz?</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Excel, WhatsApp ve kağıttan kurtulun</h2>
          <p className="mt-4 text-ink-soft">Dağınık tablolar ve unutulan bakımlar yerine; otomatik takvim, dijital form ve tek tıkla fatura.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">Eski Yöntem</div>
            <ul className="space-y-3">
              {d.compare_old.map((c) => (
                <li key={c.id} className="flex items-start gap-3 text-sm text-ink-soft"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger/10 text-danger"><X size={13} /></span>{c.title}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary-light/40 p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Liftonom ile</div>
            <ul className="space-y-3">
              {d.compare_new.map((c) => (
                <li key={c.id} className="flex items-start gap-3 text-sm text-ink"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success"><Check size={13} /></span>{c.title}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Özellikler ── */}
      <section id="ozellikler" className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Sizi farklı kılan</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Sahada zaman ve para kazandıran özellikler</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.features.map((f) => (
              <div key={f.id} className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-primary/40 hover:shadow-md">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary transition group-hover:bg-primary group-hover:text-white"><LucideIcon name={f.icon} size={20} /></div>
                <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nasıl Çalışır ── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Nasıl çalışır</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">4 adımda dijital operasyon</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {d.steps.map((st, i) => (
            <div key={st.id} className="relative rounded-2xl border border-line bg-card p-6">
              <div className="absolute right-5 top-5 text-4xl font-bold text-primary/10">{i + 1}</div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary"><LucideIcon name={st.icon} size={20} /></div>
              <h3 className="mt-4 font-semibold text-ink">{st.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{st.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modüller ── */}
      <section id="moduller" className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Modüller</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Tüm ihtiyaç tek pakette</h2>
            <p className="mt-4 text-ink-soft">Modülleri ayrı ayrı satın almazsınız — tek abonelik, tüm modüller dahil.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.modules.map((m) => (
              <div key={m.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"><LucideIcon name={m.icon} size={20} /></span>
                <div><h3 className="font-semibold text-ink">{m.title}</h3><p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fiyatlandırma ── */}
      {s.show_pricing && plans.length > 0 && (
        <section id="fiyatlar" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Fiyatlandırma</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Şirketinizin boyutuna uygun plan</h2>
            <p className="mt-4 text-ink-soft">14 gün ücretsiz deneme. Kurulum, eğitim ve güncelleme dahildir.</p>
            <div className="mt-6 inline-flex rounded-lg border border-line bg-card p-1 text-sm">
              <button onClick={() => setYearly(false)} className={`rounded-md px-4 py-1.5 font-medium transition ${!yearly ? "bg-primary text-white" : "text-muted"}`}>Aylık</button>
              <button onClick={() => setYearly(true)} className={`rounded-md px-4 py-1.5 font-medium transition ${yearly ? "bg-primary text-white" : "text-muted"}`}>Yıllık <span className="text-xs opacity-80">(2 ay bedava)</span></button>
            </div>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((p, i) => {
              const featured = i === 1;
              const price = yearly ? p.monthly_price * 10 : p.monthly_price;
              return (
                <div key={p.id} className={`relative rounded-2xl border p-6 ${featured ? "border-primary bg-card shadow-lg shadow-primary/10" : "border-line bg-card"}`}>
                  {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">ÖNERİLEN</div>}
                  <h3 className="font-semibold text-ink">{p.name}</h3>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-3xl font-bold text-ink">{TRY0(price)}</span>
                    <span className="mb-1 text-sm text-muted">/{yearly ? "yıl" : "ay"}</span>
                  </div>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    <li className="flex items-center gap-2 text-ink-soft"><Check size={15} className="text-success" /> {p.max_elevators ? `${p.max_elevators.toLocaleString("tr-TR")} asansöre kadar` : "Sınırsız asansör"}</li>
                    <li className="flex items-center gap-2 text-ink-soft"><Check size={15} className="text-success" /> {p.max_users ? `${p.max_users} kullanıcı` : "Sınırsız kullanıcı"}</li>
                    <li className="flex items-center gap-2 text-ink-soft"><Check size={15} className="text-success" /> Tüm modüller dahil</li>
                    <li className="flex items-center gap-2 text-ink-soft"><Check size={15} className="text-success" /> Mobil + müşteri portalı</li>
                  </ul>
                  <Link href="/login" className={`mt-6 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${featured ? "bg-primary text-white hover:bg-primary-dark" : "border border-line text-ink hover:bg-surface"}`}>14 Gün Ücretsiz Başla</Link>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted">Fiyatlara KDV dahildir. Yıllık ödeme daha avantajlıdır.</p>
        </section>
      )}

      {/* ── Müşteri Yorumları ── */}
      {d.testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Referanslar</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Müşterilerimiz ne diyor?</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {d.testimonials.map((t) => (
              <div key={t.id} className="flex flex-col rounded-2xl border border-line bg-card p-6">
                <Quote size={22} className="text-primary/40" />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{t.description}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary">{t.title?.[0] ?? "?"}</span>
                  <span className="text-sm font-medium text-ink">{t.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SSS ── */}
      {d.faqs.length > 0 && (
        <section id="sss" className="border-y border-line bg-card">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">SSS</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Sıkça Sorulan Sorular</h2>
            </div>
            <div className="mt-10 space-y-3">
              {d.faqs.map((f) => (
                <div key={f.id} className="rounded-xl border border-line bg-surface">
                  <button onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-sm font-medium text-ink">{f.title}</span>
                    <ChevronDown size={18} className={`shrink-0 text-muted transition ${openFaq === f.id ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === f.id && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{f.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center shadow-lg sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">Demoyu hemen deneyin</h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-light">Firmanızı 60 saniyede oluşturun, asansör operasyonunu tek yerden yönetin.</p>
          <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary-light">Ücretsiz Başla <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="iletisim" className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-xs"><Logo /><p className="mt-3 text-sm text-muted">Asansör bakım ve servis firmaları için uçtan uca operasyon yönetim platformu.</p></div>
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-ink">İletişim</span>
              <a href="mailto:info@liftonom.com" className="inline-flex items-center gap-2 text-ink-soft hover:text-primary"><Mail size={15} /> info@liftonom.com</a>
              <span className="inline-flex items-center gap-2 text-ink-soft"><Phone size={15} /> +90 (500) 000 00 00</span>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
            <span>© {new Date().getFullYear()} Liftonom. Tüm hakları saklıdır.</span><span>Asansör Servis Yönetimi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
