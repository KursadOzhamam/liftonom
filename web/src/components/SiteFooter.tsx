import Link from "next/link";
import { Building2, Mail, Phone } from "lucide-react";

const SOLUTIONS = [
  { slug: "bakim-takip", label: "Bakım Takip" },
  { slug: "ariza-yonetimi", label: "Arıza Yönetimi" },
  { slug: "teknisyen-mobil", label: "Teknisyen Mobil" },
  { slug: "fatura-tahsilat", label: "Fatura & Tahsilat" },
  { slug: "musteri-portali", label: "Müşteri Portalı" },
];
const LEGAL = [
  { slug: "mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
  { slug: "gizlilik-politikasi", label: "Gizlilik Politikası" },
  { slug: "kvkk-aydinlatma-metni", label: "KVKK Aydınlatma Metni" },
  { slug: "iptal-iade-kosullari", label: "İptal & İade" },
  { slug: "teslimat-ve-ifa", label: "Teslimat" },
];
const CITIES = [
  { slug: "istanbul", label: "İstanbul" },
  { slug: "ankara", label: "Ankara" },
  { slug: "izmir", label: "İzmir" },
  { slug: "bursa", label: "Bursa" },
];

/** Tüm halka açık sayfalarda ortak alt bilgi (footer). */
export default function SiteFooter() {
  return (
    <footer id="iletisim" className="border-t border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"><Building2 size={19} strokeWidth={2.2} /></span>
              <span className="text-lg tracking-tight text-ink">Liftonom</span>
            </span>
            <p className="mt-3 text-sm text-muted">Asansör bakım ve servis firmaları için uçtan uca operasyon yönetim platformu.</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a href="mailto:info@liftonom.com" className="inline-flex items-center gap-2 text-ink-soft hover:text-primary"><Mail size={15} /> info@liftonom.com</a>
              <span className="inline-flex items-center gap-2 text-ink-soft"><Phone size={15} /> +90 (500) 000 00 00</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">Ürün</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/#ozellikler" className="text-ink-soft hover:text-primary">Özellikler</Link></li>
              <li><Link href="/#fiyatlar" className="text-ink-soft hover:text-primary">Fiyatlar</Link></li>
              <li><Link href="/rehber" className="text-ink-soft hover:text-primary">Rehber (Blog)</Link></li>
              <li><Link href="/login" className="text-ink-soft hover:text-primary">Panele Giriş</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">Çözümler</div>
            <ul className="mt-3 space-y-2 text-sm">
              {SOLUTIONS.map((s) => <li key={s.slug}><Link href={`/cozumler/${s.slug}`} className="text-ink-soft hover:text-primary">{s.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">Yasal</div>
            <ul className="mt-3 space-y-2 text-sm">
              {LEGAL.map((l) => <li key={l.slug}><Link href={`/sayfa/${l.slug}`} className="text-ink-soft hover:text-primary">{l.label}</Link></li>)}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Liftonom. Tüm hakları saklıdır.</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-muted/70">Şehirler:</span>
            {CITIES.map((c) => <Link key={c.slug} href={`/sehir/${c.slug}`} className="hover:text-primary">{c.label}</Link>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
