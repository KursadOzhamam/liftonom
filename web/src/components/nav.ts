// src/components/nav.ts
import {
  LayoutDashboard, Users, Building2, ArrowUpDown, ShieldCheck, MapPin,
  Wrench, AlertTriangle, ClipboardList, Wallet, Landmark, FileText,
  Receipt, Package, MessageSquare, Settings, Crown, MessageCircle,
  FileSignature, ClipboardCheck, FileCheck, ShoppingCart, FolderKanban,
  TrendingUp, Truck, Banknote, CalendarX, CalendarDays, HandCoins, PackageMinus,
  Rocket, Bell, CalendarPlus, CircleDollarSign, ScrollText, LifeBuoy, GraduationCap,
  Coins, Tags, Warehouse, Car, Navigation, UserCircle, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: "Ana",
    items: [
      { label: "Kontrol Paneli", href: "/dashboard", icon: LayoutDashboard },
      { label: "Hızlı Kurulum", href: "/quick-setup", icon: Rocket },
      { label: "Bildirimler", href: "/notifications", icon: Bell },
    ],
  },
  {
    title: "Müşteri & Saha",
    items: [
      { label: "Müşteriler", href: "/customers", icon: Users },
      { label: "Binalar", href: "/buildings", icon: Building2 },
      { label: "Asansörler", href: "/elevators", icon: ArrowUpDown },
      { label: "TSE Takip", href: "/tse", icon: ShieldCheck },
      { label: "Bölgeler", href: "/regions", icon: MapPin },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { label: "Bakım", href: "/maintenance", icon: Wrench },
      { label: "Bakım Takvimi", href: "/maintenance/calendar", icon: CalendarDays },
      { label: "Aylık Toplu Bakım", href: "/bulk-maintenance", icon: CalendarPlus },
      { label: "Bakım Ücretleri", href: "/maintenance-fees", icon: CircleDollarSign },
      { label: "Arıza Bildirimleri", href: "/faults", icon: AlertTriangle },
      { label: "İş Emirleri", href: "/work-orders", icon: ClipboardList },
      { label: "Asansör Siparişleri", href: "/elevator-orders", icon: ShoppingCart },
      { label: "Projeler / İşler", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    title: "Belgeler",
    items: [
      { label: "Sözleşmeler", href: "/contracts", icon: FileSignature },
      { label: "Teklifler", href: "/quotes", icon: FileText },
      { label: "Revizyon Teklifleri", href: "/revision-quotes", icon: ScrollText },
      { label: "Asansör Talep Formu", href: "/atf", icon: ClipboardCheck },
      { label: "Durum Tespit Raporu", href: "/dtr", icon: FileCheck },
      { label: "Kurtarma Formu", href: "/rescue-forms", icon: LifeBuoy },
      { label: "Eğitim Tutanağı", href: "/training-records", icon: GraduationCap },
    ],
  },
  {
    title: "Finans",
    items: [
      { label: "Tahsilat Al", href: "/collections", icon: HandCoins },
      { label: "Cariler", href: "/current-accounts", icon: Wallet },
      { label: "Kasalar", href: "/cashboxes", icon: Landmark },
      { label: "Çek & Senet", href: "/checks", icon: Coins },
      { label: "Faturalar", href: "/invoices", icon: Receipt },
      { label: "Finansal Özet", href: "/finance", icon: TrendingUp },
    ],
  },
  {
    title: "Envanter",
    items: [
      { label: "Stok", href: "/inventory", icon: Package },
      { label: "Düşük Stok", href: "/low-stock", icon: PackageMinus },
      { label: "Kategoriler", href: "/categories", icon: Tags },
      { label: "Lokasyonlar", href: "/locations", icon: Warehouse },
      { label: "Tedarikçiler", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Personel & Saha",
    items: [
      { label: "Personel", href: "/users", icon: Users },
      { label: "Hakedişler", href: "/payroll", icon: Banknote },
      { label: "Devamsızlık", href: "/attendance", icon: CalendarX },
      { label: "Araç Takip", href: "/vehicles", icon: Car },
      { label: "Personel Konum", href: "/staff-locations", icon: Navigation },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "SMS", href: "/sms", icon: MessageSquare },
      { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
      { label: "Abonelik", href: "/subscription", icon: Crown },
      { label: "Hesabım", href: "/account", icon: UserCircle },
      { label: "Ayarlar", href: "/settings", icon: Settings },
    ],
  },
];
