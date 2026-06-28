// src/components/Badge.tsx

const MAP: Record<string, { bg: string; text: string; label: string }> = {
  // Bakım
  pending: { bg: "#DBEAFE", text: "#2563EB", label: "Bekliyor" },
  in_progress: { bg: "#FED7AA", text: "#EA580C", label: "Devam Ediyor" },
  completed: { bg: "#DCFCE7", text: "#16A34A", label: "Tamamlandı" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626", label: "İptal" },
  // Arıza — 6 aşamalı yaşam döngüsü
  reported: { bg: "#FEE2E2", text: "#DC2626", label: "Arıza Bildirildi" },
  acknowledged: { bg: "#FED7AA", text: "#EA580C", label: "İşleme Alındı" },
  dispatched: { bg: "#DBEAFE", text: "#2563EB", label: "Servis Yola Çıktı" },
  inspected: { bg: "#EDE9FE", text: "#7C3AED", label: "Kontrol Edildi" },
  repairing: { bg: "#FEF3C7", text: "#D97706", label: "Arıza Gideriliyor" },
  // eski durumlar (geriye uyum)
  new: { bg: "#FEE2E2", text: "#DC2626", label: "Yeni" },
  investigating: { bg: "#FED7AA", text: "#EA580C", label: "İnceleniyor" },
  resolved: { bg: "#DCFCE7", text: "#16A34A", label: "Çözüldü" },
  closed: { bg: "#F3F4F6", text: "#6B7280", label: "Kapatıldı" },
  // Öncelik
  urgent: { bg: "#FEE2E2", text: "#DC2626", label: "Acil" },
  high: { bg: "#FED7AA", text: "#EA580C", label: "Yüksek" },
  normal: { bg: "#DBEAFE", text: "#2563EB", label: "Normal" },
  low: { bg: "#F3F4F6", text: "#6B7280", label: "Düşük" },
  // Teklif/Fatura
  draft: { bg: "#F3F4F6", text: "#6B7280", label: "Taslak" },
  sent: { bg: "#DBEAFE", text: "#2563EB", label: "Gönderildi" },
  viewed: { bg: "#FEF3C7", text: "#D97706", label: "Görüntülendi" },
  approved: { bg: "#DCFCE7", text: "#16A34A", label: "Onaylandı" },
  rejected: { bg: "#FEE2E2", text: "#DC2626", label: "Reddedildi" },
  paid: { bg: "#DCFCE7", text: "#16A34A", label: "Ödendi" },
  overdue: { bg: "#FEE2E2", text: "#DC2626", label: "Gecikti" },
  active: { bg: "#DCFCE7", text: "#16A34A", label: "Aktif" },
};

export default function Badge({ status }: { status: string }) {
  const s = MAP[status] ?? { bg: "#F3F4F6", text: "#6B7280", label: status };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
