// src/components/nav.ts
import {
  LayoutDashboard, Users, Building2, ArrowUpDown, ShieldCheck, MapPin,
  Wrench, AlertTriangle, ClipboardList, Wallet, Landmark, FileText,
  Receipt, Package, MessageSquare, Settings, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: "Ana",
    items: [{ label: "Kontrol Paneli", href: "/dashboard", icon: LayoutDashboard }],
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
      { label: "Arıza Bildirimleri", href: "/faults", icon: AlertTriangle },
      { label: "İş Emirleri", href: "/work-orders", icon: ClipboardList },
    ],
  },
  {
    title: "Finans",
    items: [
      { label: "Cariler", href: "/current-accounts", icon: Wallet },
      { label: "Kasalar", href: "/cashboxes", icon: Landmark },
      { label: "Teklifler", href: "/quotes", icon: FileText },
      { label: "Faturalar", href: "/invoices", icon: Receipt },
    ],
  },
  {
    title: "Envanter & Personel",
    items: [
      { label: "Stok", href: "/inventory", icon: Package },
      { label: "Personel", href: "/users", icon: Users },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "SMS", href: "/sms", icon: MessageSquare },
      { label: "Ayarlar", href: "/settings", icon: Settings },
    ],
  },
];
