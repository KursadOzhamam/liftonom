# LİFTONOM — TAM SİSTEM DOKÜMANTASYONU
> Asansör Servis Yönetimi SaaS Platformu  
> Web: Next.js 14 + TypeScript + Tailwind CSS  
> Mobil: Flutter (iOS & Android — Tek Codebase)  
> Backend: Laravel 11 REST API  
> DB: PostgreSQL (Multi-Tenant)  
> Hazırlama: Haziran 2026 · **Revizyon: v1.1** (eksik şema + tutarsızlık düzeltmeleri — bkz. Bölüm 26)

---

## İÇİNDEKİLER

1. Global Tasarım Sistemi
2. Global Layout — Web & Flutter
3. UI Bileşenleri Kütüphanesi
4. Sayfalar & Modüller (52 sayfa)
5. API Endpoint Şeması
6. Veritabanı Şeması
7. Rol & Yetki Matrisi
8. Multi-Tenant Mimari
9. Güvenlik Kuralları
10. Test Stratejisi
11. CI/CD & Deployment
12. Environment Variables
13. Zamanlanmış Görevler
14. Road Map (13 Faz)
15. Kodlama Standartları
16. Super Admin Paneli
17. Onboarding Deneyimi
18. Flutter Mimari
19. Hata Yönetimi
20. Performans Optimizasyon
21. Lokalizasyon & Türkçe Standartlar
22. Bağımlılıklar — Paket Listesi
23. Claude Max Başlangıç Promptu
24. Flutter — Deep Link & Push
25. Hızlı Referans — URL Haritalama
26. ⭐ v1.1 — Eksik Şema, Düzeltmeler & Ek Bölümler (KVKK, e-Fatura, SaaS faturalandırma)

---

## 1. GLOBAL TASARIM SİSTEMİ

### 1.1 Renk Paleti

```css
/* Ana Renkler */
--primary:       #2563EB;   /* Mavi — CTA, aktif menü, link */
--primary-dark:  #1D4ED8;   /* Hover state */
--primary-light: #DBEAFE;   /* Açık arka plan, badge */

/* Durum Renkleri */
--success:  #16A34A;  /* Yeşil — aktif, tamamlandı */
--warning:  #D97706;  /* Turuncu — beklemede, uyarı */
--danger:   #DC2626;  /* Kırmızı — hata, kritik, arıza */
--info:     #0891B2;  /* Cyan — bilgi, nötr durum */

/* Nötr */
--gray-50:  #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-700: #374151;
--gray-900: #111827;

/* TSE Renk Sistemi (Asansör Durumu) */
--tse-green:  #16A34A;  /* Geçerli belge */
--tse-yellow: #D97706;  /* 30 gün içinde sona erecek */
--tse-red:    #DC2626;  /* Süresi dolmuş */
--tse-gray:   #6B7280;  /* Belge yok */
```

### 1.2 Tipografi

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Ölçek */
--text-xs:   12px / line-height: 16px
--text-sm:   14px / line-height: 20px
--text-base: 16px / line-height: 24px
--text-lg:   18px / line-height: 28px
--text-xl:   20px / line-height: 28px
--text-2xl:  24px / line-height: 32px
--text-3xl:  30px / line-height: 36px

/* Ağırlıklar */
--font-normal:   400
--font-medium:   500
--font-semibold: 600
--font-bold:     700
```

### 1.3 Spacing & Border

```css
--radius-sm: 6px;
--radius:    8px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-xl: 16px;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow:    0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
```

---

## 2. GLOBAL LAYOUT — WEB & FLUTTER

### 2.1 Web Layout

```
┌─────────────────────────────────────────────┐
│  SIDEBAR (240px sabit)  │  MAIN CONTENT      │
│  ┌─────────────────┐    │  ┌──────────────┐  │
│  │ Logo + Firma    │    │  │ Top Bar      │  │
│  │ adı + Plan      │    │  │ (breadcrumb, │  │
│  ├─────────────────┤    │  │  kullanıcı)  │  │
│  │ Nav Menü        │    │  ├──────────────┤  │
│  │ (gruplar        │    │  │              │  │
│  │  halinde)       │    │  │  Sayfa       │  │
│  ├─────────────────┤    │  │  İçeriği     │  │
│  │ Alt: Hesap      │    │  │              │  │
│  │ + Çıkış         │    │  └──────────────┘  │
│  └─────────────────┘    │                    │
└─────────────────────────────────────────────┘
```

**Sidebar Özellikleri:**
- Genişlik: 240px (sabit, collapsible değil — masaüstü)
- Mobil web: hamburger menü ile drawer olarak açılır
- Arka plan: #FFFFFF, sağ kenar: 1px solid #E5E7EB
- Logo alanı: 64px yükseklik, "Liftonom" yazısı + mavi asansör ikonu
- Firma adı: font-semibold, plan badge (Deneme/Başlangıç/Pro/Kurumsal)
- Nav item height: 40px, padding: 0 12px, border-radius: 8px
- Aktif item: bg-primary-light, text-primary, sol border 3px solid primary
- Hover: bg-gray-50
- İkon + metin yan yana (ikon 18px, Lucide React / Flutter Icons)

**Top Bar:**
- Yükseklik: 64px
- Sol: Breadcrumb (sayfa hiyerarşisi)
- Sağ: Bildirim ikonu (badge), kullanıcı avatarı + adı + dropdown

### 2.2 Flutter Layout (AppScaffold)

```dart
class AppScaffold extends StatelessWidget {
  // Tablet (>= 768px): Web ile aynı — sol drawer kalıcı açık
  // Telefon (< 768px): Bottom Navigation Bar (5 ana sekme)
  
  // Bottom Nav sekmeleri (telefon):
  // 1. Gösterge (Dashboard) — BarChart ikonu
  // 2. Bakım — Build ikonu  
  // 3. Arızalar — Warning ikonu
  // 4. Müşteriler — People ikonu
  // 5. Daha Fazla — Menu ikonu (drawer açar)
}
```

### 2.3 Menü Grupları & İkonları

| Grup | Öğeler | İkon |
|------|--------|------|
| Ana | Dashboard | LayoutDashboard |
| Müşteri & Saha | Müşteriler, Binalar, Asansörler, TSE Takip, Bölgeler | Users, Building2, Elevator, Shield, MapPin |
| Operasyon | Bakım Kayıtları, Bakım Takvimi, Rota Planlayıcı, Bakım Ücretleri | Wrench, Calendar, Route, Receipt |
| Arıza & İş | Arıza Bildirimleri, İş Emirleri, Asansör Siparişleri | AlertTriangle, ClipboardList, ShoppingCart |
| Finans | Cariler, Kasalar, Finans Özeti, Teklifler, Sözleşmeler, Faturalar, Tahsilat | Wallet, Landmark, TrendingUp, FileText, FileSignature, Receipt, Banknote |
| Belge | ATF, DTR | FileCheck, ClipboardCheck |
| Stok & Proje | Stok, Projeler | Package, FolderKanban |
| Personel | Kullanıcılar, Vardiya, Devamsızlık, Personele Ödeme | Users, Clock, UserX, Banknote |
| Raporlar | Günlük Özet, Tahsilat Özeti, Personel Performans, Stok Hareketleri | BarChart2 |
| Sistem | SMS, Ayarlar, Abonelik, Hesabım | MessageSquare, Settings, CreditCard, User |

---

## 3. UI BİLEŞENLERİ KÜTÜPHANESİ

### 3.1 Bileşen Eşleştirme Tablosu (Web ↔ Flutter)

| Web Bileşeni | Flutter Karşılığı | Açıklama |
|---|---|---|
| `<KpiCard>` | `AppKpiCard` | Dashboard istatistik kartı |
| `<DataTable>` | `AppDataTable` | Sayfalandırmalı veri tablosu |
| `<FilterBar>` | `AppFilterBar` | Arama + filtre satırı |
| `<StatusBadge>` | `AppStatusBadge` | Renkli durum etiketi |
| `<PageLayout>` | `AppScaffold` | Sayfa iskeleti |
| `<EmptyState>` | `AppEmptyState` | Boş liste gösterimi |
| `<ConfirmDialog>` | `AppConfirmDialog` | Silme/onay diyaloğu |
| `<FormModal>` | `AppBottomSheet / AppDialog` | Form içeren modal |
| `<Breadcrumb>` | `AppBreadcrumb` | Sayfa yolu |
| `<Skeleton>` | `AppSkeleton` | Yükleme animasyonu |
| `<Avatar>` | `AppAvatar` | Kullanıcı/firma avatarı |
| `<FileUpload>` | `AppFilePicker` | Dosya yükleme alanı |
| `<SearchInput>` | `AppSearchBar` | Arama kutusu |
| `<DatePicker>` | `AppDatePicker` | Tarih seçici |
| `<SelectInput>` | `AppDropdown` | Seçim kutusu |

### 3.2 KpiCard

**Web:**
```tsx
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string; positive: boolean };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  onClick?: () => void;
}
// Arka plan: beyaz kart, gölge-sm, border-radius-lg
// İkon: 48x48px renkli yuvarlak arka plan içinde 24px ikon
// Value: text-2xl font-bold
// Trend: küçük ok ikonu + yüzde değişim
```

**Flutter:**
```dart
class AppKpiCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? trendText;
  final bool? trendPositive;
  // Container: beyaz, borderRadius: 12, boxShadow: hafif
  // Padding: 16px tüm kenar
}
```

### 3.3 DataTable

**Web:**
```tsx
// Kolon tanımı: { key, label, sortable?, render?: (row) => JSX }
// Özellikler:
// - Checkbox ile çoklu seçim
// - Kolon başlığına tıkla → sort
// - Satır hover: bg-gray-50
// - Actions kolonu: sağ hizalı, hover'da görünür
// - Sayfalama: önceki/sonraki + sayfa numaraları + "25 kayıt göster" dropdown
// - Responsive: yatay scroll (overflow-x-auto)
```

**Flutter:**
```dart
// AppDataTable: CustomScrollView + SliverList
// Her satır: InkWell (onTap → detay sayfası)
// Swipe-to-action: sağa kaydır → düzenle, sola kaydır → sil
// Pull-to-refresh: RefreshIndicator
// Infinite scroll: son öğeye gelince otomatik sayfa yükle
```

### 3.4 StatusBadge

```
Durum → Renk → Metin
aktif / tamamlandı / onaylı  → green  → yeşil badge
beklemede / devam ediyor     → yellow → sarı badge  
iptal / red / pasif          → red    → kırmızı badge
taslak / yeni                → gray   → gri badge
bilgi / planlandı            → blue   → mavi badge
```

---


## 4. SAYFALAR & MODÜLLER

### 4.1 DASHBOARD — /dashboard

**URL:** `/{tenant}/dashboard`  
**Flutter Route:** `/dashboard`  
**Erişim:** Tüm roller (içerik role göre değişir)

**KPI Kartları (üst satır):**
| Kart | Değer | İkon | Renk |
|------|-------|------|------|
| Toplam Müşteri | Sayı | Users | Mavi |
| Aktif Asansör | Sayı | Elevator | Yeşil |
| Bu Ay Bakım | Sayı | Wrench | Turuncu |
| Açık Arıza | Sayı | AlertTriangle | Kırmızı |
| Bu Ay Hasılat | ₺ | TrendingUp | Yeşil |
| Tahsil Edilemeyen | ₺ | Wallet | Kırmızı |

**Alt Bölümler:**
- Hasılat Özeti Grafiği: Son 6 ay çubuk grafik (Recharts / fl_chart)
- Kasa Durumu Tablosu: Kasa adı | Tür | Bakiye
- Son Bakımlar Listesi: Son 5 bakım kaydı
- Yaklaşan Bakımlar: Önümüzdeki 7 gün
- TSE Uyarıları: 30 gün içinde dolacak belgeler
- Son Arızalar: Açık 5 arıza bildirimi

**Filtre:** Tarih aralığı seçici (bu ay / bu hafta / özel)

---

### 4.2 MÜŞTERİLER — /customers

**URL:** `/{tenant}/customers`  
**Flutter Route:** `/customers`  
**Erişim:** Admin, Ofis Personeli

**Tablo Kolonları:**
| Kolon | Tip | Sıralanabilir |
|-------|-----|---------------|
| Müşteri Adı / Firma | text | ✅ |
| Telefon | text | ❌ |
| E-posta | text | ❌ |
| Bina Sayısı | number | ✅ |
| Asansör Sayısı | number | ✅ |
| Bakiye | currency | ✅ |
| Durum | badge | ✅ |
| İşlemler | actions | ❌ |

**Filtreler:**
- Arama: ad, telefon, e-posta
- Durum: Aktif / Pasif
- Bölge: dropdown

**Müşteri Detay Sayfası** (/customers/:id):
- Sekme 1: Genel Bilgiler (form)
- Sekme 2: Binalar (liste)
- Sekme 3: Asansörler (liste)
- Sekme 4: Bakım Geçmişi
- Sekme 5: Cari Hesap (borç/alacak)
- Sekme 6: Sözleşmeler
- Sekme 7: Dökümanlar

**Form Alanları (Yeni/Düzenle):**
- Müşteri Tipi: Bireysel / Kurumsal (radio)
- Ad Soyad / Firma Adı
- TC Kimlik No / Vergi No
- Vergi Dairesi
- Telefon (zorunlu)
- E-posta
- Adres (textarea)
- İlçe, İl (dropdown)
- Bölge (dropdown)
- Notlar (textarea)

---

### 4.3 BİNALAR — /buildings

**URL:** `/{tenant}/buildings`  
**Flutter Route:** `/buildings`

**Tablo Kolonları:**
| Kolon | Açıklama |
|-------|----------|
| Bina Adı | Tıklanabilir link |
| Müşteri | |
| Adres | |
| Asansör Sayısı | |
| Aktif Sözleşme | badge |
| İşlemler | |

**Bina Detay** (/buildings/:id):
- Genel bilgiler
- Asansör listesi
- Bakım geçmişi
- Konum (Google Maps embed)

**Form Alanları:**
- Bina Adı (zorunlu)
- Müşteri (dropdown — arama destekli)
- Adres
- İl / İlçe
- Kat Sayısı
- Yönetici Adı / Telefonu
- Notlar
- Konum (lat/lng — harita tıklamayla)

---

### 4.4 ASANSÖRLER — /elevators

**URL:** `/{tenant}/elevators`  
**Flutter Route:** `/elevators`

**TSE Renk Sistemi:**
- 🟢 Yeşil: TSE geçerli
- 🟡 Sarı: 30 gün içinde dolacak
- 🔴 Kırmızı: Süresi dolmuş
- ⚫ Gri: Belge yok

**Tablo Kolonları:**
| Kolon | |
|-------|-|
| Asansör No / Adı | |
| Bina | |
| Müşteri | |
| Tip (Hidrolik/Elektrikli) | badge |
| Durum | badge (Aktif/Pasif/Arızalı) |
| TSE Bitiş | renk kodlu tarih |
| Son Bakım | tarih |
| Sonraki Bakım | tarih |
| İşlemler | |

**Filtreler:**
- Arama: asansör no, bina, müşteri
- Durum: Aktif/Pasif/Arızalı
- TSE: Geçerli/Uyarı/Süresi Dolmuş/Yok
- Bölge
- Asansör tipi

**Asansör Detay** (/elevators/:id):
- Teknik bilgiler (marka, model, kapasite, hız, kat sayısı)
- TSE belgesi (tarih + dosya upload)
- Bakım geçmişi
- Arıza geçmişi
- QR Kod (mobil için — arıza bildir)

---

### 4.5 TSE TAKİP — /elevators/tse

**URL:** `/{tenant}/elevators/tse`  
**Flutter Route:** `/elevators/tse`

**Özet KPI'lar:**
- Toplam Asansör
- TSE Geçerli (yeşil)
- 30 Gün İçinde Dolacak (sarı)
- Süresi Dolmuş (kırmızı)
- Belgesi Yok (gri)

**Liste:** TSE durumuna göre gruplandırılmış, her satırda toplu güncelleme imkânı

---

### 4.6 BÖLGELER — /bolgeler

**URL:** `/{tenant}/bolgeler`  
**Flutter Route:** `/regions`

**Özellikler:**
- Bölge adı + açıklama
- Atanan teknisyen sayısı
- Bölgedeki asansör sayısı
- CRUD işlemleri

---

### 4.7 BAKIM KAYITLARI — /maintenance

**URL:** `/{tenant}/maintenance`  
**Flutter Route:** `/maintenance`  
**Erişim:** Tüm roller (Teknisyen sadece kendi kayıtları)

**KPI Bar:**
- Bu Ay: Toplam / Tamamlanan / Bekleyen / Geciken

**Tablo Kolonları:**
| Kolon | |
|-------|-|
| Bakım No | #1234 |
| Asansör | |
| Müşteri | |
| Bakım Tipi | Periyodik/Arıza Bakımı/Revizyon |
| Teknisyen | |
| Planlanan Tarih | |
| Tamamlanma | tarih veya — |
| Durum | badge |
| İşlemler | |

**Filtreler:**
- Arama
- Durum: Bekliyor / Devam Ediyor / Tamamlandı / İptal
- Tür: Periyodik / Arıza / Revizyon
- Teknisyen
- Tarih aralığı
- Bölge

**Bakım Detay** (/maintenance/:id):
- Bakım bilgileri
- Kontrol listesi (checklist — her madde tik/çarpı)
- Kullanılan malzemeler (stoktan seçim)
- Teknisyen notu
- Müşteri imzası (canvas — Flutter signature pad)
- Fotoğraflar (çoklu upload)
- PDF rapor indir butonu

**Yeni Bakım Formu:**
- Asansör seçimi (arama dropdown)
- Bakım tipi
- Planlanan tarih/saat
- Teknisyen atama (çoklu seçim mümkün)
- Tekrarlayan bakım (haftalık/aylık/3 aylık/6 aylık/yıllık)
- Notlar

---

### 4.8 BAKIM TAKVİMİ — /maintenance/calendar

**URL:** `/{tenant}/maintenance/calendar`  
**Flutter Route:** `/maintenance/calendar`

**Görünümler:** Ay / Hafta / Liste (FullCalendar / table_calendar)

**Takvim Özellikleri:**
- Her bakım: renkli blok (tür ve duruma göre)
- Tıkla: detay popover
- Sürükle-bırak: tarih değiştir (web)
- Teknisyene göre filtre
- Yeni bakım: takvimde boş alana tıkla

---

### 4.9 ROTA PLANLAYICI — /operations/rota-planlayici

**URL:** `/{tenant}/operations/rota-planlayici`  
**Flutter Route:** `/operations/route-planner`

**Özellikler:**
- Sol panel: Bekleyen bakımlar listesi (drag-able)
- Sağ panel: Google Maps (harita)
- Teknisyen seçimi → rotası haritada görünür
- Rota optimize et butonu (Google Directions API)
- Toplam mesafe ve süre özeti
- "Rotayı Kaydet" → teknisyene bildirim gönder

---

### 4.10 BAKIM ÜCRETLERİ — /bakim-ucretleri

**URL:** `/{tenant}/bakim-ucretleri`  
**Flutter Route:** `/maintenance/prices`

**Tablo:**
- Sözleşme | Müşteri | Asansör Sayısı | Aylık Ücret | Yıllık Toplam | Sonraki Fatura | Durum

**Özellik:** Sözleşme bazlı otomatik fatura oluşturma ayarı

---

### 4.11 ARIZA BİLDİRİMLERİ — /fault-reports

**URL:** `/{tenant}/fault-reports`  
**Flutter Route:** `/fault-reports`

**Görünümler:** Kanban / Liste (toggle)

**Kanban Sütunları:**
1. Yeni (kırmızı başlık)
2. İnceleniyor (turuncu)
3. Onarımda (mavi)
4. Çözüldü (yeşil)
5. Kapatıldı (gri)

**KPI Bar:**
- Toplam Açık | Bugün Açılan | Çözülen | Ort. Çözüm Süresi

**Arıza Kart Bilgileri:**
- Arıza No, Asansör, Müşteri
- Öncelik: Acil/Yüksek/Normal/Düşük (renk kodlu)
- Açılma zamanı
- Atanan teknisyen avatarı
- Yorum sayısı ikonu

**Arıza Detay** (/fault-reports/:id):
- Zaman çizelgesi (timeline — durum değişimleri)
- Yorum/not ekleme
- Fotoğraf galerisi
- İş emrine dönüştür butonu
- Teknisyen atama
- Çözüm notu

---

### 4.12 İŞ EMİRLERİ — /operations/work-orders

**URL:** `/{tenant}/operations/work-orders`  
**Flutter Route:** `/work-orders`

**Tablo Kolonları:**
- İş Emri No | Kaynak (Arıza/Bakım/Manuel) | Asansör | Teknisyen | Planlanan | Durum | İşlemler

---

### 4.13 ASANSÖR SİPARİŞLERİ — /elevator-orders

**URL:** `/{tenant}/elevator-orders`  
**Flutter Route:** `/elevator-orders`

**Tablo:**
- Sipariş No | Müşteri | Asansör Tipi | Adet | Tutar | Durum | Tarih

**Durum Akışı:** Teklif → Onaylandı → Üretimde → Teslimatta → Kurulumda → Tamamlandı

---

### 4.14 CARİLER — /cariler

**URL:** `/{tenant}/cariler`  
**Flutter Route:** `/current-accounts`

**KPI Kartları:**
- Toplam Alacak | Toplam Borç | Net Bakiye | Vadesi Geçen

**Tablo:**
- Müşteri | Alacak | Borç | Bakiye | Son İşlem | İşlemler

**Cari Hesap Detay** (/cariler/:id):
- Hesap özeti (KPI kartları)
- İşlem tablosu: Tarih | Açıklama | Borç | Alacak | Bakiye
- Filtre: tarih aralığı, tür
- PDF/Excel export

**Tahsilat Al** butonu → TahsilatModal:
- Tutar
- Ödeme yöntemi (Nakit/Kart/Havale/Çek)
- Kasa seçimi
- Tarih
- Açıklama

---

### 4.15 KASALAR — /kasalar

**URL:** `/{tenant}/kasalar`  
**Flutter Route:** `/cashboxes`

**KPI:**
- Toplam Bakiye (tüm kasalar toplamı)
- Nakit Toplam | Banka Toplam

**Kasa Kartları:**
- Her kasa için: Ad | Tür (Nakit/Banka) | Bakiye | Son İşlem tarihi
- Tıkla → kasa detayı (işlem geçmişi)

**Kasa Transferi:** Kasalar arası para transferi formu

---

### 4.16 FİNANS ÖZETİ — /finance

**URL:** `/{tenant}/finance`  
**Flutter Route:** `/finance`

**KPI Kartları:**
- Bu Ay Gelir | Bu Ay Gider | Net Kar | Geçen Aya Göre %

**Grafikler:**
- Aylık Gelir/Gider çubuk grafik (son 12 ay)
- Gelir Dağılımı pasta grafik (bakım/arıza/yeni kurulum/diğer)

**Gider Kategorileri Tablosu:**
- Kategori | Bu Ay | Bu Yıl | Geçen Yıl

---

### 4.17 TEKLİFLER — /quotes

**URL:** `/{tenant}/quotes`  
**Flutter Route:** `/quotes`

**Tablo:**
- Teklif No | Müşteri | Tutar | Oluşturma Tarihi | Geçerlilik | Durum

**Durum Akışı:** Taslak → Gönderildi → Görüntülendi → Onaylandı / Reddedildi

**Teklif Oluşturma:**
- Müşteri seçimi
- Geçerlilik tarihi
- Kalemler (ürün/hizmet + miktar + birim fiyat + KDV)
- İndirim
- Notlar
- Şablon seçimi (önceden kayıtlı şablonlar)
- PDF önizleme

---

### 4.18 SÖZLEŞMELER — /contracts

**URL:** `/{tenant}/contracts`  
**Flutter Route:** `/contracts`

**Tablo:**
- Sözleşme No | Müşteri | Kapsam | Başlangıç | Bitiş | Aylık Bedel | Durum

**Sözleşme Detay:**
- Kapsam dahil asansörler listesi
- Ödeme planı
- Otomatik yenileme ayarı
- İmzalı belge upload

---

### 4.19 FATURALAR — /invoices

**URL:** `/{tenant}/invoices`  
**Flutter Route:** `/invoices`

**Tablo:**
- Fatura No | Müşteri | Tutar | KDV | Toplam | Tarih | Vade | Durum

**Durum:** Taslak / Gönderildi / Ödendi / Gecikti / İptal

**Fatura Oluşturma:**
- Tekliften oluştur veya sıfırdan
- e-Fatura / e-Arşiv seçimi
- PDF indir butonu

---

### 4.20 TAHSİLAT — /tahsilat

**URL:** `/{tenant}/tahsilat`  
**Flutter Route:** `/collection`

**Hızlı Tahsilat Formu:**
- Müşteri seçimi (arama)
- Fatura seçimi (müşterinin açık faturaları listelenir)
- Tutar
- Ödeme yöntemi
- Kasa
- Tarih + açıklama

---

### 4.21 ATF — /atf

**URL:** `/{tenant}/atf`  
**Flutter Route:** `/atf`

**Asansör Talep Formu** — yeni asansör kurulumu için müşteri talep belgesi

**Form Alanları:**
- Müşteri bilgileri
- Bina bilgileri
- Asansör teknik özellikleri (tip, kapasite, hız, kat, durak sayısı)
- Özel istekler (textarea)
- Ek dosyalar

---

### 4.22 DTR — /dtr

**URL:** `/{tenant}/dtr`  
**Flutter Route:** `/dtr`

**Durum Tespit Raporu** — mevcut asansörün teknik durum değerlendirmesi

**Bölümler:**
- Asansör seçimi
- Kontrol kalemleri listesi (her biri: İyi/Kusurlu/Değişmeli/Yok)
- Fotoğraflar
- Genel değerlendirme notu
- Teknisyen imzası

---

### 4.23 STOK — /inventory

**URL:** `/{tenant}/inventory`  
**Flutter Route:** `/inventory`

**Tablo:**
- Ürün Kodu | Ürün Adı | Kategori | Birim | Stok Miktarı | Min. Stok | Birim Fiyat | İşlemler

**Uyarı:** Stok miktarı < minimum stok ise satır sarı ile vurgulanır

**Stok Hareketleri:**
- Giriş (satın alma)
- Çıkış (bakımda kullanım)
- Transfer (depo arası)

---

### 4.24 PROJELER — /projeler

**URL:** `/{tenant}/projeler`  
**Flutter Route:** `/projects`

**Görünümler:** Kart / Liste / Kanban

**Proje Kartı:**
- Proje adı, müşteri, başlangıç/bitiş
- İlerleme çubuğu (%)
- Atanan personel avatarları
- Durum badge

**Proje Detay:**
- Görev listesi (alt görevler — checkbox)
- Zaman çizelgesi (Gantt benzeri)
- Dökümanlar
- Notlar

---

### 4.25 KULLANICILAR / PERSONEL — /users

**URL:** `/{tenant}/users`  
**Flutter Route:** `/users`

**Tablo:**
- Ad Soyad | Rol | Telefon | E-posta | Bölge | Durum | Son Giriş | İşlemler

**Roller:**
1. Firma Yöneticisi (tam yetki)
2. Ofis Personeli
3. Teknisyen
4. Muhasebe
5. Sadece Görüntüleme

**Kullanıcı Formu:**
- Ad, Soyad, Telefon, E-posta
- Rol seçimi
- Bölge atama
- Profil fotoğrafı upload
- Şifre (oluşturulurken SMS ile gönderilir)

---

### 4.26 SMS — /sms

**URL:** `/{tenant}/sms`  
**Flutter Route:** `/sms`

**Sekmeler:**
1. SMS Bakiyem: Kalan SMS adedi, paketi yenile butonu
2. Gönderim Geçmişi: Tarih | Alıcı | Mesaj | Durum

---

### 4.27 SMS TERCİHLERİ — /sms/preferences

**Otomatik Bildirim Tetikleyicileri (toggle on/off):**
- Bakım hatırlatması (bakımdan X gün önce müşteriye)
- Bakım tamamlandı bildirimi
- Yeni arıza bildirimi (müşteriye)
- Arıza çözüldü bildirimi
- Fatura oluşturuldu bildirimi
- Ödeme alındı bildirimi
- TSE belgesi sona eriyor uyarısı

---

### 4.28 RAPORLAR

**4.28.1 Günlük Özet — /raporlar/gunluk-ozet**
- Tarih seçici
- O günün bakım sayısı, tahsilat, arıza özeti
- PDF olarak indir

**4.28.2 Tahsilat Özeti — /raporlar/tahsilat-ozeti**
- Tarih aralığı + personel filtresi
- Ödeme yöntemine göre gruplandırma
- Toplam + kasa dağılımı

**4.28.3 Personel Performans — /raporlar/personel-performans**
- Dönem + personel filtresi
- Her teknisyen: Tamamlanan bakım | Kapatılan arıza | Ort. süre | Puan

**4.28.4 Stok Hareketleri — /raporlar/stok-hareketleri**
- Tarih aralığı + ürün filtresi
- Giriş/çıkış tablosu

---

### 4.29 AYARLAR — /settings

**Sekmeler:**

**Firma Bilgileri:**
- Firma adı, adres, vergi bilgileri
- Logo upload
- İletişim bilgileri

**Fatura Şablonu:**
- Fatura başlık/alt yazı
- Ödeme koşulları metni
- Logo konumu
- Renk seçimi

**SMS Ayarları:**
- Gönderici adı (alfa-numerik, max 11 karakter)
- Test SMS gönder

**Rol & Yetki Yönetimi:**
- Her rol için modül bazlı yetki matrisi (tablo + checkbox)

**Entegrasyon:**
- API Key görüntüle/yenile
- Webhook URL tanımla
- e-Fatura GIB entegrasyon ayarları

---

### 4.30 ABONELİK — /subscription

**Planlar:**

| Özellik | Deneme | Başlangıç | Pro | Kurumsal |
|---------|--------|-----------|-----|----------|
| Süre | 30 gün | - | - | - |
| Kullanıcı | 2 | 5 | 15 | Sınırsız |
| Asansör | 20 | 50 | 250 | Sınırsız |
| SMS | 100 | 500 | 2000 | Sınırsız |
| Rapor | Temel | Temel | Gelişmiş | Özel |
| Fiyat/ay | Ücretsiz | 499₺ | 999₺ | Özel |

**Ödeme:** iyzico entegrasyonu

---

### 4.31 HESABIM — /account

**Bölümler:**
- Profil bilgileri (ad, soyad, e-posta, telefon, fotoğraf)
- Şifre değiştir
- İki faktörlü doğrulama (2FA)
- Oturum geçmişi
- Bildirim tercihleri (e-posta / SMS / push)

---


## 5. API ENDPOINT ŞEMASI

**Base URL:** `https://api.liftonom.com/api/v1`  
**Auth:** Bearer Token (Laravel Sanctum)  
**Format:** JSON  
**Sayfalama:** `?page=1&per_page=25`

### 5.1 Auth

```
POST   /auth/login              → { phone, password } → { token, user, tenant }
POST   /auth/verify-otp         → { phone, otp }
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password    → { phone }
POST   /auth/reset-password     → { token, password }
GET    /auth/me                  → Oturum kullanıcı bilgisi
```

### 5.2 Müşteriler

```
GET    /customers                → Liste (paginate)
POST   /customers                → Yeni müşteri
GET    /customers/:id            → Detay
PUT    /customers/:id            → Güncelle
DELETE /customers/:id            → Sil (soft delete)
GET    /customers/:id/buildings  → Müşterinin binaları
GET    /customers/:id/elevators  → Müşterinin asansörleri
GET    /customers/:id/account    → Cari hesap
GET    /customers/:id/contracts  → Sözleşmeler
```

### 5.3 Binalar

```
GET    /buildings
POST   /buildings
GET    /buildings/:id
PUT    /buildings/:id
DELETE /buildings/:id
GET    /buildings/:id/elevators
```

### 5.4 Asansörler

```
GET    /elevators
POST   /elevators
GET    /elevators/:id
PUT    /elevators/:id
DELETE /elevators/:id
GET    /elevators/tse-report     → TSE durum özeti
PUT    /elevators/:id/tse        → TSE belgesi güncelle
GET    /elevators/:id/qr         → QR kod oluştur
GET    /elevators/:id/maintenance-history
GET    /elevators/:id/fault-history
```

### 5.5 Bakımlar

```
GET    /maintenance
POST   /maintenance
GET    /maintenance/:id
PUT    /maintenance/:id
DELETE /maintenance/:id
POST   /maintenance/:id/complete          → Bakımı tamamla
POST   /maintenance/:id/materials         → Kullanılan malzeme ekle
POST   /maintenance/:id/photos            → Fotoğraf yükle
POST   /maintenance/:id/signature         → Müşteri imzası
GET    /maintenance/:id/pdf               → PDF rapor
GET    /maintenance/calendar              → Takvim verisi (start, end param)
```

### 5.6 Arıza Bildirimleri

```
GET    /fault-reports
POST   /fault-reports
GET    /fault-reports/:id
PUT    /fault-reports/:id
DELETE /fault-reports/:id
POST   /fault-reports/:id/comments        → Yorum ekle
PUT    /fault-reports/:id/status          → Durum değiştir
POST   /fault-reports/:id/assign          → Teknisyen ata
POST   /fault-reports/:id/convert-to-work-order
GET    /fault-reports/public/:token       → Müşteri portal (token ile)
```

### 5.7 İş Emirleri

```
GET    /work-orders
POST   /work-orders
GET    /work-orders/:id
PUT    /work-orders/:id
POST   /work-orders/:id/complete
```

### 5.8 Cariler & Finans

```
GET    /current-accounts                  → Cari listesi
GET    /current-accounts/:id             → Cari detay
GET    /current-accounts/:id/transactions → İşlem geçmişi
POST   /collections                       → Tahsilat al
GET    /cashboxes                         → Kasa listesi
GET    /cashboxes/:id                     → Kasa detay + işlemler
POST   /cashboxes/transfer               → Kasa transferi
GET    /finance/summary                   → Finans özeti
GET    /finance/monthly                   → Aylık gelir/gider
```

### 5.9 Teklifler & Sözleşmeler & Faturalar

```
GET    /quotes
POST   /quotes
GET    /quotes/:id
PUT    /quotes/:id
DELETE /quotes/:id
POST   /quotes/:id/send                   → E-posta ile gönder
POST   /quotes/:id/approve
POST   /quotes/:id/reject
GET    /quotes/:id/pdf

GET    /contracts
POST   /contracts
GET    /contracts/:id
PUT    /contracts/:id
POST   /contracts/:id/renew

GET    /invoices
POST   /invoices
GET    /invoices/:id
PUT    /invoices/:id
POST   /invoices/:id/send
POST   /invoices/:id/pay
GET    /invoices/:id/pdf
```

### 5.10 Stok

```
GET    /inventory
POST   /inventory
GET    /inventory/:id
PUT    /inventory/:id
DELETE /inventory/:id
POST   /inventory/:id/stock-in            → Stok girişi
POST   /inventory/:id/stock-out           → Stok çıkışı
GET    /inventory/low-stock               → Düşük stok uyarıları
GET    /inventory/movements               → Tüm hareketler
```

### 5.11 Personel & Vardiya

```
GET    /users
POST   /users
GET    /users/:id
PUT    /users/:id
DELETE /users/:id
GET    /users/:id/schedule
POST   /users/:id/schedule               → Vardiya ata
GET    /attendance                        → Devamsızlık listesi
POST   /attendance                        → Devamsızlık ekle
GET    /payroll                           → Personele ödeme listesi
POST   /payroll                           → Ödeme kaydı
```

### 5.12 Raporlar

```
GET    /reports/daily-summary?date=       → Günlük özet
GET    /reports/collection-summary?start=&end=
GET    /reports/staff-performance?start=&end=&user_id=
GET    /reports/inventory-movements?start=&end=
GET    /reports/tse-tracking
```

### 5.13 SMS

```
GET    /sms/balance                       → Bakiye
GET    /sms/history                       → Gönderim geçmişi
POST   /sms/send                          → Manuel SMS gönder
GET    /sms/preferences                   → Tercihler
PUT    /sms/preferences                   → Tercihler güncelle
```

### 5.14 Dashboard

```
GET    /dashboard/kpis?period=            → KPI verileri
GET    /dashboard/revenue-chart?months=   → Hasılat grafiği
GET    /dashboard/upcoming-maintenance    → Yaklaşan bakımlar
GET    /dashboard/open-faults            → Açık arızalar
GET    /dashboard/tse-warnings           → TSE uyarıları
GET    /dashboard/cashbox-summary        → Kasa özeti
```

### 5.15 ATF & DTR

```
GET    /atf
POST   /atf
GET    /atf/:id
PUT    /atf/:id
GET    /atf/:id/pdf

GET    /dtr
POST   /dtr
GET    /dtr/:id
PUT    /dtr/:id
GET    /dtr/:id/pdf
```

### 5.16 Ayarlar & Hesap

```
GET    /settings                          → Firma ayarları
PUT    /settings                          → Güncelle
POST   /settings/logo                     → Logo yükle
GET    /account                           → Hesabım
PUT    /account                           → Güncelle
POST   /account/change-password
POST   /account/avatar

GET    /subscription                      → Mevcut plan
GET    /subscription/plans               → Tüm planlar
POST   /subscription/upgrade              → Plan yükselt (iyzico)
```

### 5.17 Bölgeler & Rota

```
GET    /regions
POST   /regions
GET    /regions/:id
PUT    /regions/:id
DELETE /regions/:id

POST   /route-planner/optimize            → Google Directions API wrapper
POST   /route-planner/save               → Rota kaydet
```

---

## 6. VERİTABANI ŞEMASI

### 6.1 Tenants (Firmalar)

```sql
CREATE TABLE tenants (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    address     TEXT,
    tax_number  VARCHAR(20),
    tax_office  VARCHAR(100),
    logo_url    VARCHAR(500),
    plan        VARCHAR(50) DEFAULT 'trial',
    plan_expires_at TIMESTAMPTZ,
    sms_balance INTEGER DEFAULT 100,
    is_active   BOOLEAN DEFAULT TRUE,
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Users (Kullanıcılar)

```sql
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    surname     VARCHAR(255) NOT NULL,
    phone       VARCHAR(20) NOT NULL,   -- v1.1: global UNIQUE kaldırıldı; (tenant_id,phone) benzersiz (bkz. 26.1)
    email       VARCHAR(255),
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL, -- manager|office|technician|accounting|viewer (super_admin AYRI tabloda — bkz. 26.3)
    region_id   BIGINT,
    avatar_url  VARCHAR(500),
    is_active   BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    fcm_token   VARCHAR(500),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE UNIQUE INDEX uq_users_tenant_phone ON users(tenant_id, phone); -- v1.1
```

### 6.3 Customers (Müşteriler)

```sql
CREATE TABLE customers (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    type            VARCHAR(20) DEFAULT 'corporate', -- individual|corporate
    name            VARCHAR(255) NOT NULL,
    tax_number      VARCHAR(20),
    tax_office      VARCHAR(100),
    id_number       VARCHAR(20),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    district        VARCHAR(100),
    city            VARCHAR(100),
    region_id       BIGINT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
```

### 6.4 Buildings (Binalar)

```sql
CREATE TABLE buildings (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    customer_id     BIGINT REFERENCES customers(id),
    region_id       BIGINT REFERENCES regions(id),  -- v1.1: UI bölge filtresi/rota planlayıcı için
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    district        VARCHAR(100),
    city            VARCHAR(100),
    floor_count     INTEGER,
    manager_name    VARCHAR(255),
    manager_phone   VARCHAR(20),
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_buildings_tenant ON buildings(tenant_id);
CREATE INDEX idx_buildings_customer ON buildings(customer_id);
```

### 6.5 Elevators (Asansörler)

```sql
CREATE TABLE elevators (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT REFERENCES tenants(id),
    building_id         BIGINT REFERENCES buildings(id),
    code                VARCHAR(100),
    name                VARCHAR(255),
    type                VARCHAR(50), -- hydraulic|electric|escalator
    brand               VARCHAR(100),
    model               VARCHAR(100),
    capacity_kg         INTEGER,
    speed               DECIMAL(4,2),
    floor_count         INTEGER,
    stop_count          INTEGER,
    production_year     INTEGER,
    serial_number       VARCHAR(100),
    tse_certificate_no  VARCHAR(100),
    tse_start_date      DATE,
    tse_end_date        DATE,
    tse_document_url    VARCHAR(500),
    status              VARCHAR(50) DEFAULT 'active', -- active|passive|faulty
    last_maintenance_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ,
    maintenance_period  INTEGER DEFAULT 30, -- gün
    qr_token            VARCHAR(100) UNIQUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_elevators_tenant ON elevators(tenant_id);
CREATE INDEX idx_elevators_tse ON elevators(tse_end_date);
```

### 6.6 Maintenance (Bakım Kayıtları)

```sql
CREATE TABLE maintenance_records (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    elevator_id     BIGINT REFERENCES elevators(id),
    type            VARCHAR(50), -- periodic|fault|revision|annual
    planned_date    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(50) DEFAULT 'pending', -- pending|in_progress|completed|cancelled
    assigned_users  JSONB DEFAULT '[]', -- user_id array
    checklist       JSONB DEFAULT '[]', -- [{item, status, note}]
    materials_used  JSONB DEFAULT '[]', -- [{product_id, quantity, unit_price}]
    technician_note TEXT,
    customer_signature_url VARCHAR(500),
    photos          JSONB DEFAULT '[]',
    is_recurring    BOOLEAN DEFAULT FALSE,
    recurring_period VARCHAR(50), -- weekly|monthly|3monthly|6monthly|annual
    parent_id       BIGINT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.7 Fault Reports (Arıza Bildirimleri)

```sql
CREATE TABLE fault_reports (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    elevator_id     BIGINT REFERENCES elevators(id),
    reported_by_type VARCHAR(20) DEFAULT 'user', -- user|customer|qr
    reported_by_id  BIGINT,
    priority        VARCHAR(20) DEFAULT 'normal', -- urgent|high|normal|low
    status          VARCHAR(50) DEFAULT 'new', -- new|investigating|repairing|resolved|closed
    description     TEXT,
    resolution_note TEXT,
    assigned_user_id BIGINT REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    photos          JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.8 Current Accounts & Transactions

```sql
CREATE TABLE current_accounts (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    customer_id     BIGINT REFERENCES customers(id),
    balance         DECIMAL(12,2) DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE account_transactions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    account_id      BIGINT REFERENCES current_accounts(id),
    type            VARCHAR(20), -- debit|credit
    amount          DECIMAL(12,2) NOT NULL,
    balance_after   DECIMAL(12,2),
    description     VARCHAR(500),
    source_type     VARCHAR(50), -- invoice|collection|manual
    source_id       BIGINT,
    cashbox_id      BIGINT,
    payment_method  VARCHAR(50), -- cash|card|transfer|check
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.9 Cashboxes (Kasalar)

```sql
CREATE TABLE cashboxes (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(20) DEFAULT 'cash', -- cash|bank
    balance         DECIMAL(12,2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'TRY',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cashbox_transactions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    cashbox_id      BIGINT REFERENCES cashboxes(id),
    type            VARCHAR(20), -- in|out|transfer
    amount          DECIMAL(12,2),
    balance_after   DECIMAL(12,2),
    description     VARCHAR(500),
    source_type     VARCHAR(50),
    source_id       BIGINT,
    transfer_to_id  BIGINT REFERENCES cashboxes(id),
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.10 Quotes, Contracts, Invoices

```sql
CREATE TABLE quotes (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    customer_id     BIGINT REFERENCES customers(id),
    quote_number    VARCHAR(50),
    status          VARCHAR(50) DEFAULT 'draft',
    valid_until     DATE,
    items           JSONB DEFAULT '[]',
    subtotal        DECIMAL(12,2),
    tax_rate        DECIMAL(5,2) DEFAULT 20,
    tax_amount      DECIMAL(12,2),
    discount        DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2),
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contracts (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    customer_id     BIGINT REFERENCES customers(id),
    contract_number VARCHAR(50),
    type            VARCHAR(50), -- maintenance|installation|mixed
    start_date      DATE,
    end_date        DATE,
    monthly_fee     DECIMAL(12,2),
    auto_renew      BOOLEAN DEFAULT FALSE,
    status          VARCHAR(50) DEFAULT 'active',
    elevators       JSONB DEFAULT '[]',
    document_url    VARCHAR(500),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    customer_id     BIGINT REFERENCES customers(id),
    invoice_number  VARCHAR(50),
    type            VARCHAR(20) DEFAULT 'e-archive',
    status          VARCHAR(50) DEFAULT 'draft',
    issue_date      DATE,
    due_date        DATE,
    items           JSONB DEFAULT '[]',
    subtotal        DECIMAL(12,2),
    tax_rate        DECIMAL(5,2) DEFAULT 20,
    tax_amount      DECIMAL(12,2),
    discount        DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2),
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    notes           TEXT,
    source_type     VARCHAR(50),
    source_id       BIGINT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.11 Inventory (Stok)

```sql
CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    code            VARCHAR(100),
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    unit            VARCHAR(20),
    stock_quantity  DECIMAL(10,2) DEFAULT 0,
    min_stock       DECIMAL(10,2) DEFAULT 0,
    unit_price      DECIMAL(12,2),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_movements (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    product_id      BIGINT REFERENCES products(id),
    type            VARCHAR(20), -- in|out|transfer
    quantity        DECIMAL(10,2),
    unit_price      DECIMAL(12,2),
    total_price     DECIMAL(12,2),
    reference_type  VARCHAR(50), -- maintenance|purchase|adjustment
    reference_id    BIGINT,
    note            TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.12 Diğer Tablolar

```sql
-- Bölgeler
CREATE TABLE regions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Geçmişi
CREATE TABLE sms_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    recipient VARCHAR(20),
    message TEXT,
    status VARCHAR(20),
    provider_id VARCHAR(100),
    trigger_type VARCHAR(100),
    cost INTEGER DEFAULT 1,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bildirimler
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    user_id BIGINT REFERENCES users(id),
    type VARCHAR(100),
    title VARCHAR(255),
    body TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ATF
CREATE TABLE atf_forms (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    customer_id BIGINT REFERENCES customers(id),
    building_id BIGINT,
    form_data JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    attachments JSONB DEFAULT '[]',
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DTR
CREATE TABLE dtr_reports (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    elevator_id BIGINT REFERENCES elevators(id),
    technician_id BIGINT REFERENCES users(id),
    checklist_items JSONB DEFAULT '[]',
    general_note TEXT,
    photos JSONB DEFAULT '[]',
    signature_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projeler
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    customer_id BIGINT REFERENCES customers(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    assigned_users JSONB DEFAULT '[]',
    tasks JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fault Report Yorumları
CREATE TABLE fault_report_comments (
    id BIGSERIAL PRIMARY KEY,
    fault_report_id BIGINT REFERENCES fault_reports(id),
    user_id BIGINT REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. ROL & YETKİ MATRİSİ

| Modül | Firma Yöneticisi | Ofis Personeli | Teknisyen | Muhasebe | Görüntüleme |
|-------|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✅ Tam | ✅ Tam | ⚡ Kısmi | ⚡ Kısmi | 👁 Yalnız görüntüle |
| Müşteriler | ✅ CRUD | ✅ CRUD | 👁 Görüntüle | 👁 Görüntüle | 👁 |
| Binalar | ✅ CRUD | ✅ CRUD | 👁 | ❌ | 👁 |
| Asansörler | ✅ CRUD | ✅ CRUD | 👁 | ❌ | 👁 |
| Bakımlar | ✅ CRUD | ✅ CRUD | ✅ Kendi | ❌ | 👁 |
| Arıza Bildirimleri | ✅ CRUD | ✅ CRUD | ✅ Kendi | ❌ | 👁 |
| İş Emirleri | ✅ CRUD | ✅ CRUD | ✅ Kendi | ❌ | 👁 |
| Cariler | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | 👁 |
| Kasalar | ✅ CRUD | ❌ | ❌ | ✅ CRUD | 👁 |
| Teklifler | ✅ CRUD | ✅ CRUD | ❌ | 👁 | 👁 |
| Sözleşmeler | ✅ CRUD | ✅ CRUD | 👁 | 👁 | 👁 |
| Faturalar | ✅ CRUD | ✅ Create | ❌ | ✅ CRUD | 👁 |
| Tahsilat | ✅ | ✅ | ❌ | ✅ | ❌ |
| Stok | ✅ CRUD | ✅ CRUD | ⚡ Çıkış | ❌ | 👁 |
| Personel | ✅ CRUD | 👁 | ❌ | ❌ | ❌ |
| Raporlar | ✅ Tümü | ⚡ Sınırlı | ❌ | ✅ Finans | 👁 |
| Ayarlar | ✅ | ❌ | ❌ | ❌ | ❌ |
| SMS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Abonelik | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 8. MULTİ-TENANT MİMARİ

### 8.1 Tenant İzolasyon Stratejisi

**Strateji:** Shared Database + Row-Level Security (RLS)

```sql
-- Her tabloya tenant_id eklenir
-- PostgreSQL RLS politikaları:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customers
    USING (tenant_id = current_setting('app.tenant_id')::BIGINT);

-- Laravel'de tenant_id otomatik set etme:
-- AppServiceProvider::boot() içinde:
DB::statement("SET app.tenant_id = " . auth()->user()->tenant_id);
```

### 8.2 URL Yapısı

```
Web:    https://liftonom.com/{tenant_slug}/dashboard
API:    https://api.liftonom.com/api/v1/customers
        (tenant_id Bearer Token'dan alınır)
Admin:  https://admin.liftonom.com
```

### 8.3 Laravel Tenant Middleware

```php
class TenantMiddleware {
    public function handle($request, Closure $next) {
        $slug = $request->route('tenant');
        $tenant = Tenant::where('slug', $slug)->firstOrFail();
        
        if (!$tenant->is_active) abort(403, 'Hesabınız askıya alınmıştır.');
        if ($tenant->plan_expires_at < now()) abort(402, 'Abonelik süresi dolmuştur.');
        
        app()->instance('tenant', $tenant);
        DB::statement("SET app.tenant_id = {$tenant->id}");
        
        return $next($request);
    }
}
```

---

## 9. GÜVENLİK KURALLARI

```
✅ Tüm API endpoint'leri auth:sanctum middleware'i gerektirir
✅ Her sorguda tenant_id WHERE koşulu (RLS desteğiyle)
✅ Şifreler: bcrypt (cost factor 12)
✅ SMS OTP: 6 haneli, 3 dakika geçerli, max 3 deneme
✅ Rate limiting: login 5/dakika, API 60/dakika per user
✅ HTTPS zorunlu (HSTS header)
✅ XSS: Content-Security-Policy header
✅ SQL Injection: Eloquent ORM (parameterized queries)
✅ CORS: sadece izin verilen originler
✅ File upload: sadece jpg/png/pdf/xlsx, max 10MB
✅ Sensitive data: log'larda maskeleme (telefon, TC)
✅ API Key rotation: /settings/integration'dan yapılabilir
```

---

## 10. TEST STRATEJİSİ

### 10.1 Web (Jest + Playwright)

```
Unit Tests:     utility fonksiyonları, formatters
Integration:    API client, form validation  
E2E:            Kritik akışlar (login, bakım oluştur, tahsilat al)
Coverage hedef: %80
```

### 10.2 Flutter (flutter_test + integration_test)

```
Widget Tests:   Tüm AppX bileşenleri
Integration:    Giriş akışı, bakım tamamlama, offline sync
Golden Tests:   UI snapshot testi
```

### 10.3 Laravel (PHPUnit)

```
Feature Tests:  Her API endpoint için happy path + error cases
Unit Tests:     Service sınıfları, hesaplamalar
DB Tests:       Tenant izolasyonu kontrol
Coverage hedef: %85
```

---

## 11. CI/CD & DEPLOYMENT

### 11.1 GitHub Actions Pipeline

```yaml
# .github/workflows/deploy.yml
on: [push to main]

jobs:
  test:
    - PHP tests (PHPUnit)
    - Next.js tests (Jest)
    - Flutter tests

  deploy-api:
    - Laravel → AWS EC2 (Docker)
    - php artisan migrate --force
    - php artisan config:cache
    
  deploy-web:
    - Next.js → Vercel (otomatik preview + production)
    
  deploy-mobile:
    - Flutter → Fastlane → TestFlight (iOS) + Play Store (Android)
```

### 11.2 Sunucu Mimarisi

```
CDN (CloudFront)
    ↓
Load Balancer (AWS ALB)
    ↓
API Servers (Laravel — EC2 Auto Scaling)
    ↓
PostgreSQL (AWS RDS — Multi-AZ)
Redis (AWS ElastiCache)
S3 (dosya depolama)
```

---

## 12. ENVIRONMENT VARIABLES

### 12.1 Laravel .env.example

```env
APP_NAME=Liftonom
APP_ENV=production
APP_KEY=
APP_URL=https://api.liftonom.com

DB_CONNECTION=pgsql
DB_HOST=
DB_PORT=5432
DB_DATABASE=liftonom
DB_USERNAME=
DB_PASSWORD=

REDIS_HOST=
REDIS_PASSWORD=
REDIS_PORT=6379

QUEUE_CONNECTION=redis

MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@liftonom.com

NETGSM_USER=
NETGSM_PASSWORD=
NETGSM_MSGHEADER=LIFTONOM

GOOGLE_MAPS_API_KEY=
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-central-1
AWS_BUCKET=

SENTRY_DSN=

FIREBASE_CREDENTIALS=
```

### 12.2 Next.js .env.example

```env
NEXT_PUBLIC_API_URL=https://api.liftonom.com/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://liftonom.com
```

### 12.3 Flutter — dart-define

```
API_URL=https://api.liftonom.com/api/v1
GOOGLE_MAPS_KEY=
FIREBASE_PROJECT_ID=
ENV=production
```

---

## 13. ZAMANLANMIŞ GÖREVLER

```php
// App\Console\Kernel.php

// Her gece 00:01 — Periyodik bakım oluştur (recurring)
$schedule->command('maintenance:create-recurring')->dailyAt('00:01');

// Her gece 08:00 — TSE uyarısı SMS gönder (30 gün kala)
$schedule->command('tse:send-warnings')->dailyAt('08:00');

// Her gece 08:30 — Yaklaşan bakım SMS hatırlatması (3 gün kala)
$schedule->command('maintenance:send-reminders')->dailyAt('08:30');

// Her ayın 1'i — Sözleşme bazlı otomatik fatura oluştur
$schedule->command('invoices:create-recurring')->monthlyOn(1, '09:00');

// Her saat — Ödeme durumlarını iyzico'dan sorgula
$schedule->command('payments:sync-status')->hourly();

// Her gece 23:50 — Günlük özet raporu hazırla (cache'e al)
$schedule->command('reports:generate-daily')->dailyAt('23:50');

// Her 5 dakika — Offline queue'yu işle
$schedule->command('queue:work --max-jobs=50')->everyFiveMinutes();
```

---


## 14. ROAD MAP (13 FAZ)

| Faz | Konu | Süre | Öncelik |
|-----|------|------|---------|
| PHASE 0 | Setup & Altyapı | 1 gün | 🔴 Kritik |
| PHASE 1 | Auth & Multi-tenant | 2 gün | 🔴 Kritik |
| PHASE 2 | Dashboard & KPI | 2 gün | 🔴 Kritik |
| PHASE 3 | Müşteri & Bina & Asansör | 3 gün | 🔴 Kritik |
| PHASE 4 | Bakım & Takvim & Rota | 3 gün | 🔴 Kritik |
| PHASE 5 | Arıza & İş Emri | 2 gün | 🟠 Yüksek |
| PHASE 6 | Cari & Kasa & Finans | 3 gün | 🟠 Yüksek |
| PHASE 7 | Teklif & Sözleşme & Fatura | 3 gün | 🟠 Yüksek |
| PHASE 8 | Stok & Proje | 2 gün | 🟡 Orta |
| PHASE 9 | Personel & Devamsızlık | 2 gün | 🟡 Orta |
| PHASE 10 | ATF & DTR & Sipariş | 2 gün | 🟡 Orta |
| PHASE 11 | Raporlar & Analitik | 3 gün | 🟡 Orta |
| PHASE 12 | SMS & Bildirim & Entegrasyon | 2 gün | 🟡 Orta |
| PHASE 13 | Super Admin & Onboarding & Polish | 3 gün | 🟢 Düşük |
| **TOPLAM** | | **~33 iş günü** | |

### PHASE 0 — Setup & Altyapı
```
✅ Next.js 14 projesi (app router, TypeScript, Tailwind, ESLint, Prettier)
✅ Flutter projesi (Riverpod, GoRouter, Dio, klasör yapısı)
✅ Laravel 11 API projesi (Sanctum, Telescope, Horizon)
✅ PostgreSQL veritabanı + migration'lar
✅ Redis konfigürasyonu
✅ .env dosyaları
✅ GitHub Actions CI/CD temel pipeline
✅ Docker Compose (local development)
```

### PHASE 1 — Auth & Multi-tenant
```
✅ Telefon + şifre girişi
✅ SMS OTP doğrulama (netgsm)
✅ Sanctum token yönetimi (tek standart — JWT değil; bkz. 26.1)
✅ Multi-tenant middleware
✅ Rol bazlı yetkilendirme (middleware + policy)
✅ Web: Login sayfası, korumalı route'lar
✅ Flutter: Güvenli token saklama (flutter_secure_storage)
✅ Oturumu hatırla (30 gün)
```

### PHASE 2 — Dashboard & KPI
```
✅ KPI endpoint'leri
✅ Dashboard sayfası (web + Flutter)
✅ Recharts / fl_chart entegrasyonu
✅ Gerçek zamanlı güncelleme (30 sn auto-refresh)
✅ Kasa özeti widget'ı
✅ TSE uyarıları widget'ı
```

---

## 15. KODLAMA STANDARTLARI (Claude Max'e Talimatlar)

### 15.1 Genel Kurallar

```
1. Her dosyanın ilk satırı: // path/to/file.tsx (yorum olarak dosya yolu)
2. TypeScript strict mode — 'any' kullanma
3. Türkçe UI metinleri, İngilizce kod (değişken, fonksiyon, component adları)
4. Her API çağrısı try/catch ile sarmalanmalı
5. Loading state: her data-fetch işleminde skeleton göster
6. Error state: her sayfada hata boundary
7. Empty state: boş listeler için AppEmptyState kullan
8. Tüm formlar: react-hook-form + zod (web), reactive_forms (Flutter)
9. Tüm listeler: paginate(25), infinite scroll (Flutter) / pagination button (web)
10. Para formatı: formatCurrency() fonksiyonu kullan, hardcode etme
```

### 15.2 Laravel Kuralları

```php
// 1. Her controller method'u FormRequest ile validate et
// 2. Business logic → Service sınıfına taşı (Controller ince olmalı)
// 3. Her model'de tenant_id scope tanımla:

trait HasTenant {
    protected static function bootHasTenant() {
        static::addGlobalScope('tenant', function($query) {
            if (auth()->check()) {
                $query->where('tenant_id', auth()->user()->tenant_id);
            }
        });
        static::creating(function($model) {
            $model->tenant_id = auth()->user()->tenant_id;
        });
    }
}

// 4. API Resource (Transformer) kullan — model'i doğrudan return etme
// 5. Soft delete: tüm ana tablolarda
// 6. Activity log: kritik işlemleri logla (spatie/laravel-activitylog)
```

### 15.3 Next.js / React Kuralları

```tsx
// 1. Server Component default, gerektiğinde 'use client'
// 2. Data fetching: TanStack Query (useQuery, useMutation)
// 3. Global state: Zustand (auth store, ui store)
// 4. Form: react-hook-form + zod resolver
// 5. API client: axios instance (baseURL, interceptor ile token inject)

// apiClient.ts
const apiClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
apiClient.interceptors.request.use(config => {
    const token = getToken(); // localStorage veya cookie
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
apiClient.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) router.push('/login');
        return Promise.reject(err);
    }
);
```

### 15.4 Flutter / Dart Kuralları

```dart
// 1. Her feature için klasör yapısı:
//    lib/features/{feature}/
//      presentation/screens/
//      presentation/widgets/
//      data/repositories/
//      data/models/
//      domain/providers/

// 2. Riverpod provider naming:
//    customersProvider → AsyncNotifierProvider<CustomersNotifier, List<Customer>>
//    customerDetailProvider(id) → FutureProvider.family

// 3. GoRouter tanımı:
//    Her route için GuardedRoute (token kontrolü)

// 4. Dio instance (singleton):
final dio = Dio(BaseOptions(baseUrl: Env.apiUrl));
dio.interceptors.add(AuthInterceptor()); // token inject

// 5. Hive model:
//    @HiveType(typeId: X) — typeId'leri belgede sabitle
```

### 15.5 Klasör Yapısı

**Next.js:**
```
src/
  app/
    [tenant]/
      dashboard/
        page.tsx
      customers/
        page.tsx
        [id]/
          page.tsx
      ...
    login/
      page.tsx
  components/
    ui/          ← Temel bileşenler (Button, Input, Badge...)
    shared/      ← AppX bileşenleri (AppDataTable, AppKpiCard...)
    layout/      ← Sidebar, TopBar, PageLayout
  lib/
    api/         ← API client + endpoint fonksiyonları
    hooks/       ← Custom hooks
    utils/       ← formatCurrency, formatDate...
    validations/ ← Zod şemaları
  stores/        ← Zustand stores
  types/         ← TypeScript interface'leri
```

**Flutter:**
```
lib/
  core/
    constants/
    router/
    theme/
    utils/
    widgets/     ← AppX widget'ları
  features/
    auth/
    dashboard/
    customers/
    buildings/
    elevators/
    maintenance/
    fault_reports/
    finance/
    inventory/
    users/
    reports/
    settings/
  data/
    models/
    repositories/
  main.dart
  app.dart
```

---

## 16. SUPER ADMIN PANELİ

**Domain:** `admin.liftonom.com`  
**Stack:** Next.js (ayrı proje) veya aynı projede /admin route'ları  
**Erişim:** Sadece super_admin rolü

**Modüller:**

| Modül | Özellikler |
|-------|-----------|
| Firma Yönetimi | Tüm tenant'lar listesi, detay, plan değiştir, askıya al |
| Firma Adına Giriş | İmpersonate — firma hesabına destek amaçlı giriş |
| Plan Yönetimi | Plan oluştur/düzenle, özellik sınırları ayarla |
| Fatura & Tahsilat | Tüm tenant fatura geçmişi, ödeme durumları |
| SMS Havuzu | Toplam SMS bakiyesi, tenant bazlı kullanım |
| Sistem Logları | API hata logları, slow query logları |
| Duyurular | Tüm tenant'lara duyuru gönder |
| Destek | Destek talepleri yönetimi |
| Platform Ayarları | Global ayarlar, bakım modu |

---

## 17. ONBOARDING DENEYİMİ

**URL:** `/{tenant}/hizli-kurulum`  
**Flutter Route:** `/onboarding`  
**Tetikleyici:** İlk girişte veya onboarding tamamlanmamışsa

**Adımlar:**

```
Adım 1 — Firma Bilgileri (3/10 form alanı)
  - Firma adı, vergi no, telefon, adres
  - Logo yükle

Adım 2 — İlk Müşteri Ekle
  - Müşteri adı, telefon
  - "Sonra ekleyeceğim" atlama seçeneği

Adım 3 — İlk Bina & Asansör
  - Bina adı, adres
  - Asansör tipi, kat sayısı
  - "Sonra ekleyeceğim" atlama

Adım 4 — SMS Ayarları
  - netgsm hesap bağla (opsiyonel)
  - Gönderici adı belirle

Adım 5 — Tamamlandı 🎉
  - Konfeti animasyonu (Lottie)
  - "Dashboard'a Git" butonu
  - Tamamlanan adımların özeti
```

**Progress:** Üstte step indicator (1/5, 2/5...)  
**Atlama:** Her adımda "Sonra Yap" linki  
**Kayıt:** Her adım ayrı kayıt (partial save)

---

## 18. FLUTTER MİMARİ — DETAY

### 18.1 State Management Katmanları

```dart
// 1. AuthNotifier — token, user bilgisi, login/logout
// 2. TenantNotifier — aktif tenant bilgisi
// 3. Feature Notifier'ları — her modül için ayrı

// Örnek: CustomersNotifier
class CustomersNotifier extends AsyncNotifier<PaginatedResult<Customer>> {
  @override
  Future<PaginatedResult<Customer>> build() => _fetch();
  
  Future<void> refresh() async { state = await AsyncValue.guard(_fetch); }
  Future<void> create(CreateCustomerDto dto) async { ... }
  Future<void> update(int id, UpdateCustomerDto dto) async { ... }
}
```

### 18.2 Repository Katmanı

```dart
abstract class CustomerRepository {
  Future<PaginatedResult<Customer>> getCustomers({int page, String? search});
  Future<Customer> getCustomer(int id);
  Future<Customer> createCustomer(CreateCustomerDto dto);
  Future<Customer> updateCustomer(int id, UpdateCustomerDto dto);
  Future<void> deleteCustomer(int id);
}

class CustomerRepositoryImpl implements CustomerRepository {
  final Dio _dio;
  // Hive cache entegrasyonu
}
```

### 18.3 Offline Sync

```dart
// Offline iken yapılan işlemler Hive'a kaydedilir:
class OfflineQueue {
  Future<void> enqueue(QueuedAction action) async { ... }
  Future<void> processAll() async { ... } // online olunca çalıştır
}

// QueuedAction tipleri:
// - CreateMaintenance
// - UpdateFaultReportStatus
// - AddMaintenancePhoto
// - CompleteChecklist
```

---

## 19. HATA YÖNETİMİ

### 19.1 HTTP Hata Kodları → Kullanıcı Mesajı

| HTTP Kodu | Türkçe Mesaj | Aksiyon |
|-----------|-------------|---------|
| 400 | "Geçersiz istek. Lütfen bilgileri kontrol edin." | Form hatalarını göster |
| 401 | "Oturumunuz sona erdi. Lütfen tekrar giriş yapın." | Login sayfasına yönlendir |
| 403 | "Bu işlem için yetkiniz bulunmuyor." | Toast error |
| 404 | "Kayıt bulunamadı." | EmptyState göster |
| 409 | "Bu kayıt zaten mevcut." | Form hatası |
| 422 | Validation hataları | Her field altında hata mesajı |
| 429 | "Çok fazla istek. Lütfen bekleyin." | Retry countdown |
| 500 | "Sunucu hatası oluştu. Lütfen tekrar deneyin." | Toast + Sentry log |
| 503 | "Sistem geçici olarak kullanım dışı." | Maintenance sayfası |

### 19.2 Offline Durumu (Flutter)

```dart
// connectivity_plus ile internet durumu izlenir
// Offline iken:
// - Okuma: cache'den serve edilir (Hive)
// - Yazma: queue'ya alınır, online olunca gönderilir
// - UI: AppBar altında sarı "Çevrimdışı mod" banner

class OfflineBanner extends StatelessWidget {
  // Gösterim koşulu: ConnectivityResult.none
  // Renk: Colors.amber[700]
}
```

---

## 20. PERFORMANS OPTİMİZASYON

### 20.1 Web (Next.js)
```
✅ next/image — WebP formatı
✅ dynamic() lazy load
✅ ISR: revalidate: 60 (rapor sayfaları)
✅ Redis cache (rapor verisi 5 dk)
✅ Bundle < 200KB initial JS
✅ Core Web Vitals: LCP < 2.5s
✅ Skeleton loader — tüm data-fetch sayfalarda
```

### 20.2 Flutter
```
✅ ListView.builder (virtualization)
✅ const Widget
✅ CachedNetworkImage
✅ Infinite scroll (25'er kayıt)
✅ compute() — büyük JSON parse için
✅ Hive — offline cache
✅ 60fps hedef — Consumer yerine select()
```

---

## 21. LOKALİZASYON & TÜRKÇE STANDARTLAR

### 21.1 Para Formatı

```dart
// Flutter
final currencyFormatter = NumberFormat.currency(locale: 'tr_TR', symbol: '₺', decimalDigits: 2);
// Çıktı: ₺1.250,00
```

```ts
// TypeScript
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
```

### 21.2 Tarih Formatı

```dart
final dateFormatter = DateFormat('dd.MM.yyyy', 'tr_TR');
// API: ISO 8601 — Gösterim: "28.06.2026"
// Timezone: Europe/Istanbul
```

### 21.3 Türkçe UI Sözlüğü

| Teknik Terim | Türkçe |
|---|---|
| Dashboard | Gösterge Paneli |
| Customer | Müşteri |
| Building | Bina |
| Elevator | Asansör |
| Maintenance | Bakım |
| Fault Report | Arıza Bildirimi |
| Work Order | İş Emri |
| Quote | Teklif |
| Contract | Sözleşme |
| Invoice | Fatura |
| Collection | Tahsilat |
| Current Account | Cari Hesap |
| Cash Register | Kasa |
| Inventory | Stok |
| Staff | Personel |
| Role | Rol |
| Subscription | Abonelik |
| Tenant | Firma |
| Route Plan | Rota Planı |
| TSE Certificate | TSE Belgesi |

---

## 22. BAĞIMLILIKLAR

### 22.1 Flutter pubspec.yaml

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  go_router: ^14.2.0
  dio: ^5.4.3
  retrofit: ^4.1.0
  hive_flutter: ^1.1.0
  shared_preferences: ^2.2.3
  flutter_secure_storage: ^9.0.0
  flutter_screenutil: ^5.9.3
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  flutter_svg: ^2.0.10
  lottie: ^3.1.0
  google_maps_flutter: ^2.6.0
  geolocator: ^11.0.0
  reactive_forms: ^17.0.0
  file_picker: ^8.0.0
  open_file: ^3.3.2
  pdf: ^3.10.8
  path_provider: ^2.1.3
  image_picker: ^1.1.2
  camera: ^0.10.5+9
  firebase_messaging: ^15.0.0
  flutter_local_notifications: ^17.2.1
  firebase_analytics: ^11.2.0
  firebase_crashlytics: ^4.0.3
  intl: ^0.19.0
  connectivity_plus: ^6.0.3
  package_info_plus: ^8.0.0
  url_launcher: ^6.3.0
  share_plus: ^10.0.0
  qr_flutter: ^4.1.0
  fl_chart: ^0.68.0
  table_calendar: ^3.1.2
  signature: ^5.4.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.11
  riverpod_generator: ^2.4.0
  retrofit_generator: ^8.1.0
  hive_generator: ^2.0.1
  mockito: ^5.4.4
```

### 22.2 Next.js package.json (ana bağımlılıklar)

```json
{
  "dependencies": {
    "next": "^14.2.5",
    "react": "^18.3.1",
    "typescript": "^5.5.0",
    "@tanstack/react-query": "^5.51.0",
    "@tanstack/react-table": "^8.19.3",
    "axios": "^1.7.2",
    "tailwindcss": "^3.4.6",
    "@headlessui/react": "^2.1.1",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "react-hook-form": "^7.52.1",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "@fullcalendar/react": "^6.1.14",
    "@fullcalendar/daygrid": "^6.1.14",
    "@fullcalendar/timegrid": "^6.1.14",
    "recharts": "^2.12.7",
    "@google-maps/react-wrapper": "^1.1.35",
    "react-dropzone": "^14.2.3",
    "react-toastify": "^10.0.5",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.3",
    "next-auth": "^4.24.7",
    "puppeteer": "^22.14.0",
    "bull": "^4.15.0",
    "ioredis": "^5.4.1",
    "@sentry/nextjs": "^8.21.0",
    "zustand": "^4.5.4"
  }
}
```

---

## 23. HIZLI REFERANS — URL HARITALAMA

| Web URL | Flutter Route | Sayfa Adı |
|---------|--------------|-----------|
| /dashboard | /dashboard | Gösterge Paneli |
| /customers | /customers | Müşteriler |
| /customers/:id | /customers/:id | Müşteri Detayı |
| /buildings | /buildings | Binalar |
| /buildings/:id | /buildings/:id | Bina Detayı |
| /elevators | /elevators | Asansörler |
| /elevators/:id | /elevators/:id | Asansör Detayı |
| /elevators/tse | /elevators/tse | TSE Takip |
| /bolgeler | /regions | Bölgeler |
| /maintenance | /maintenance | Bakım Kayıtları |
| /maintenance/:id | /maintenance/:id | Bakım Detayı |
| /maintenance/calendar | /maintenance/calendar | Bakım Takvimi |
| /operations/rota-planlayici | /operations/route-planner | Rota Planlayıcı |
| /bakim-ucretleri | /maintenance/prices | Bakım Ücretleri |
| /fault-reports | /fault-reports | Arıza Bildirimleri |
| /fault-reports/:id | /fault-reports/:id | Arıza Detayı |
| /operations/work-orders | /work-orders | İş Emirleri |
| /elevator-orders | /elevator-orders | Asansör Siparişleri |
| /cariler | /current-accounts | Cariler |
| /cariler/:id | /current-accounts/:id | Cari Detayı |
| /kasalar | /cashboxes | Kasalar |
| /kasalar/:id | /cashboxes/:id | Kasa Detayı |
| /finance | /finance | Finans Özeti |
| /quotes | /quotes | Teklifler |
| /quotes/:id | /quotes/:id | Teklif Detayı |
| /contracts | /contracts | Sözleşmeler |
| /contracts/:id | /contracts/:id | Sözleşme Detayı |
| /invoices | /invoices | Faturalar |
| /invoices/:id | /invoices/:id | Fatura Detayı |
| /tahsilat | /collection | Tahsilat Al |
| /atf | /atf | ATF Formları |
| /dtr | /dtr | DTR Raporları |
| /inventory | /inventory | Stok Yönetimi |
| /projeler | /projects | Projeler |
| /users | /users | Kullanıcılar / Personel |
| /sms | /sms | SMS Yönetimi |
| /sms/preferences | /sms/preferences | SMS Tercihleri |
| /raporlar/gunluk-ozet | /reports/daily-summary | Günlük Özet |
| /raporlar/tahsilat-ozeti | /reports/collection-summary | Tahsilat Özeti |
| /raporlar/personel-performans | /reports/staff-performance | Personel Performans |
| /raporlar/stok-hareketleri | /reports/inventory-movements | Stok Hareketleri |
| /settings | /settings | Firma Ayarları |
| /subscription | /subscription | Abonelik & Plan |
| /account | /account | Hesabım |
| /hizli-kurulum | /onboarding | Hızlı Kurulum |

---

## 24. FLUTTER — DEEP LINK & PUSH BİLDİRİM

### 24.1 Deep Link Şeması
```
liftonom://dashboard
liftonom://maintenance/:id
liftonom://fault-reports/:id
liftonom://customers/:id
liftonom://notifications
```

### 24.2 Push Notification Payload

```json
{
  "notification": { "title": "Yeni Arıza", "body": "Merkez Plaza'da arıza raporu açıldı." },
  "data": { "type": "fault_report", "id": "456", "tenant_slug": "gokce" }
}
```

| type | Yönlendirme |
|------|------------|
| fault_report | /fault-reports/:id |
| maintenance | /maintenance/:id |
| payment_received | /current-accounts/:id |
| tse_expiry | /elevators/tse |
| new_order | /elevator-orders/:id |
| quote_approved | /quotes/:id |
| contract_expiry | /contracts/:id |

---

## 25. CLAUDE MAX BAŞLANGIÇ PROMPTU

Tüm MD dosyasını Claude Max'e verdikten sonra şu prompt ile başlayın:

---

```
Bu MD dosyası Liftonom platformunun tam sistem dokümantasyonudur.
Asansör servis yönetimi SaaS sistemidir.

Teknoloji Stack:
- Web: Next.js 14 + TypeScript + Tailwind CSS
- Mobil: Flutter (iOS & Android — tek codebase, Riverpod + GoRouter)
- Backend: Laravel 11 REST API
- DB: PostgreSQL (multi-tenant, row-level security)

ZORUNLU Kurallar:
1. PHASE 0'dan başla, her phase onayımdan sonra ilerle
2. Web ve Flutter bileşenlerini aynı anda yaz (birebir UI eşleşmesi)
3. Her dosya başına dosya yolunu yorum olarak ekle
4. Türkçe UI metinleri kullan
5. Multi-tenant: Her sorguda tenant_id filtresi ZORUNLU
6. Para formatı: "1.250,00 ₺" | Tarih: "28.06.2026" | Timezone: Europe/Istanbul
7. TypeScript strict mode — any kullanma
8. Tüm listeler paginate(25)

İlk Görev — PHASE 0 Setup:
- Next.js projesi kur (app router, TypeScript, Tailwind)
- Flutter projesi kur (Riverpod, GoRouter, Dio)
- Laravel 11 API projesi kur
- PostgreSQL multi-tenant schema migration yaz
- Ortak .env.example dosyaları hazırla
- Klasör yapılarını göster

Hazır olduğunda PHASE 0 çıktısını göster, devam için onayımı bekle.
```

---

## 26. v1.1 — EKSİK ŞEMA, DÜZELTMELER & EK BÖLÜMLER

> Bu bölüm, ilk sürümdeki eksik tabloları, SaaS faturalandırmasını, KVKK/e-Fatura
> gereksinimlerini ve iç tutarsızlıkların kesin çözümlerini içerir. **Çelişki halinde
> bu bölüm önceki bölümleri geçersiz kılar (authoritative).**

### 26.1 Karar Günlüğü (tutarsızlık çözümleri)

| Konu | Önceki belirsizlik | **v1.1 Kesin Karar** |
|------|-------------------|----------------------|
| Auth | "JWT" vs "Sanctum" | **Laravel Sanctum** personal access token. JWT kullanılmayacak. |
| Tenant kaynağı | URL slug vs Bearer token | **Tek doğruluk kaynağı: token'daki `tenant_id`.** URL slug yalnızca UI/routing/SEO içindir; her istekte `slug→tenant` ile token'ın `tenant_id`'si **eşleşmiyorsa 403**. |
| `users.phone` | global UNIQUE | **`UNIQUE(tenant_id, phone)`** — aynı telefon farklı firmalarda olabilir. |
| Soft delete | "tüm ana tablolar" ama sadece customers'ta | **Tüm ana iş tablolarına `deleted_at`** (liste 26.4). |
| super_admin | role enum'unda yok | **Ayrı `platform_admins` tablosu + ayrı `admin` guard** (26.3). users.role'e eklenMEZ. |
| Bölge–personel | `users.region_id` (1:1) ama UI çok teknisyen | **`region_user` pivot (M:N)** (26.2). `buildings.region_id` eklendi. |
| Push token | `users.fcm_token` (tek cihaz) | **`user_devices` tablosu** (çoklu cihaz) (26.2). |
| Telefon formatı | tanımsız | **DB'de E.164 (`+905XXXXXXXXX`)**, UI'da `05XX XXX XX XX` maskesi. Girişte normalize et. |
| Eşzamanlı düzenleme | yok | **Optimistic lock:** her ana tabloda `updated_at` karşılaştırması (If-Unmodified-Since mantığı), uyuşmazsa 409. |
| PgBouncer | belirtilmemiş | RLS `SET app.tenant_id` session-level olduğundan: **session pooling kullan**, VEYA transaction pooling'de `set_config('app.tenant_id', :id, true)` ile *local* (transaction-scope) set et. Karar: **transaction-local set_config** (en güvenli). |

### 26.2 Eksik Tablolar (ekran/endpoint vardı, şema yoktu)

```sql
-- İş Emirleri
CREATE TABLE work_orders (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    elevator_id BIGINT REFERENCES elevators(id),
    source_type VARCHAR(20),                 -- fault|maintenance|manual
    source_id BIGINT,
    assigned_user_id BIGINT REFERENCES users(id),
    planned_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'open',        -- open|in_progress|done|cancelled
    description TEXT,
    completed_at TIMESTAMPTZ,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_work_orders_tenant ON work_orders(tenant_id);

-- Asansör Siparişleri
CREATE TABLE elevator_orders (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    customer_id BIGINT REFERENCES customers(id),
    order_number VARCHAR(50),
    elevator_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'quote',       -- quote|approved|production|shipping|installing|completed|cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_elevator_orders_tenant ON elevator_orders(tenant_id);

-- Tedarikçiler (+ products.supplier_id eklenecek)
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    tax_number VARCHAR(20),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE products ADD COLUMN supplier_id BIGINT REFERENCES suppliers(id);

-- Personel: Vardiya
CREATE TABLE staff_schedules (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    user_id BIGINT REFERENCES users(id),
    work_date DATE NOT NULL,
    shift_start TIME,
    shift_end TIME,
    note VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personel: Devamsızlık
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    user_id BIGINT REFERENCES users(id),
    date DATE NOT NULL,
    type VARCHAR(30),                         -- present|absent|leave|sick|holiday
    note VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personel: Maaş/Ödeme
CREATE TABLE payroll (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    user_id BIGINT REFERENCES users(id),
    period VARCHAR(7),                        -- 2026-06
    base_salary DECIMAL(12,2),
    bonus DECIMAL(12,2) DEFAULT 0,
    deduction DECIMAL(12,2) DEFAULT 0,
    net_paid DECIMAL(12,2),
    paid_at TIMESTAMPTZ,
    cashbox_id BIGINT REFERENCES cashboxes(id),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merkezi Döküman/Medya (polymorphic) — müşteri/bina/asansör/sözleşme ekleri
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    documentable_type VARCHAR(100),           -- Customer|Building|Elevator|Contract|Quote...
    documentable_id BIGINT,
    name VARCHAR(255),
    file_url VARCHAR(500),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    uploaded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_documents_poly ON documents(documentable_type, documentable_id);

-- Bölge–Personel (M:N) + bina bölge bağı buildings.region_id ile sağlandı
CREATE TABLE region_user (
    region_id BIGINT REFERENCES regions(id) ON DELETE CASCADE,
    user_id   BIGINT REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT REFERENCES tenants(id),
    is_primary BOOLEAN DEFAULT FALSE,         -- bölge sorumlusu
    PRIMARY KEY (region_id, user_id)
);

-- Çoklu cihaz push (users.fcm_token yerine asıl kaynak)
CREATE TABLE user_devices (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    fcm_token VARCHAR(500),
    platform VARCHAR(20),                     -- ios|android|web
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, fcm_token)
);

-- SMS Otomatik Tercihleri (Bölüm 4.27 sayfası buraya yazar)
CREATE TABLE sms_preferences (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id) UNIQUE,
    maintenance_reminder BOOLEAN DEFAULT TRUE,
    maintenance_completed BOOLEAN DEFAULT TRUE,
    new_fault BOOLEAN DEFAULT TRUE,
    fault_resolved BOOLEAN DEFAULT TRUE,
    invoice_created BOOLEAN DEFAULT FALSE,
    payment_received BOOLEAN DEFAULT TRUE,
    tse_expiry BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 26.3 SaaS Faturalandırma & Süper Admin (kritik — eksikti)

```sql
-- Planlar (Bölüm 4.30 tablosunun veri kaynağı)
CREATE TABLE plans (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,                   -- trial|starter|pro|enterprise
    name VARCHAR(100),
    monthly_price DECIMAL(10,2),
    max_users INTEGER,                         -- NULL = sınırsız
    max_elevators INTEGER,
    sms_quota INTEGER,
    features JSONB DEFAULT '{}',               -- {"advanced_reports":true,...}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    plan_id BIGINT REFERENCES plans(id),
    status VARCHAR(30) DEFAULT 'trialing',     -- trialing|active|past_due|cancelled|expired
    started_at TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    iyzico_subscription_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);

CREATE TABLE subscription_payments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    subscription_id BIGINT REFERENCES subscriptions(id),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'TRY',
    status VARCHAR(30),                        -- success|failed|pending|refunded
    iyzico_payment_id VARCHAR(255),
    raw_response JSONB,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ek SMS paketi satın alımları (tenants.sms_balance'ı artırır)
CREATE TABLE sms_purchases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    quantity INTEGER,
    amount DECIMAL(10,2),
    status VARCHAR(30),
    iyzico_payment_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Süper Admin (Bölüm 16) — AYRI guard, tenant_id YOK
CREATE TABLE platform_admins (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Plan limiti zorlaması:** Kullanıcı/asansör/SMS ekleme servislerinde, ilgili `plans.max_*`
sınırı aşılırsa **402/422** dön ve "Plan limitiniz doldu, yükseltin" mesajı göster.
`TenantMiddleware`'e abonelik kontrolü: `subscriptions.status IN ('trialing','active')` değilse
salt-okunur moda al (yazma işlemleri 402).

### 26.4 Soft Delete & Eksik Index'ler

`deleted_at TIMESTAMPTZ` **şu tablolara eklenecek** (Eloquent `SoftDeletes`):
`buildings, elevators, maintenance_records, fault_reports, quotes, contracts, invoices,
products, projects, work_orders, elevator_orders, suppliers, current_accounts`.
(NOT: `*_transactions`, `*_movements`, `sms_logs`, `notifications` gibi **ledger/log tabloları
silinmez** — değişmez kayıt.)

Eksik `tenant_id` index'leri (multi-tenant performans için **zorunlu**):
```sql
CREATE INDEX idx_maintenance_tenant   ON maintenance_records(tenant_id);
CREATE INDEX idx_faults_tenant        ON fault_reports(tenant_id);
CREATE INDEX idx_invoices_tenant      ON invoices(tenant_id);
CREATE INDEX idx_quotes_tenant        ON quotes(tenant_id);
CREATE INDEX idx_contracts_tenant     ON contracts(tenant_id);
CREATE INDEX idx_products_tenant      ON products(tenant_id);
CREATE INDEX idx_acct_tx_tenant       ON account_transactions(tenant_id);
CREATE INDEX idx_cashbox_tx_tenant    ON cashbox_transactions(tenant_id);
-- Sık filtreler için bileşik index'ler:
CREATE INDEX idx_maintenance_status   ON maintenance_records(tenant_id, status, planned_date);
CREATE INDEX idx_faults_status        ON fault_reports(tenant_id, status, priority);
```

### 26.5 Para Bütünlüğü (ledger) Kuralı

Bir **tahsilat** tek bir DB transaction'ında atomik olarak şunları yazar:
1. `account_transactions` → `type='credit'`, `balance_after` hesapla
2. `cashbox_transactions` → `type='in'`, `balance_after` hesapla
3. `current_accounts.balance` ve `cashboxes.balance` güncelle
Herhangi biri başarısızsa **tümü geri alınır** (`DB::transaction`). Bakiye kolonları
"cache"dir; gerçeklik hareket tablolarındadır. **Gece job'ı** bakiyeleri hareketlerden
yeniden hesaplayıp tutarsızlık varsa uyarır (`reconcile:balances`).

### 26.6 Demo/Örnek Kayıt Stratejisi (ilk taslaktaki "ÖRNEK kayıt" banner'ı)

Ana entity tablolarına `is_sample BOOLEAN DEFAULT FALSE` eklenir. Yeni tenant açılınca
seed ile birkaç `is_sample=true` kayıt basılır; kullanıcı ilk gerçek kaydını ekleyince
o entity'nin örnekleri otomatik silinir. Listelerde örnek satırlar mavi "ÖRNEK" rozetiyle gösterilir.

### 26.7 KVKK Uyumu (Türkiye'de satış için ZORUNLU — eksikti)

- **Aydınlatma & açık rıza:** Müşteri/personel kişisel verisi (TC, telefon) işlenirken rıza kaydı:
```sql
CREATE TABLE consents (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    subject_type VARCHAR(50),                 -- customer|user|portal
    subject_id BIGINT,
    consent_type VARCHAR(50),                 -- kvkk_aydinlatma|sms_ticari|...
    granted BOOLEAN,
    ip VARCHAR(64),
    granted_at TIMESTAMPTZ DEFAULT NOW()
);
```
- **VERBİS / veri envanteri**, **veri saklama süresi** ve **silme/anonimleştirme** (`right to be forgotten`) akışı: hesap kapanınca X gün sonra anonimleştir.
- **Ticari SMS izni:** İYS (İleti Yönetim Sistemi) kontrolü — izinsiz numaraya pazarlama SMS'i gönderilmez (işlem/bilgilendirme SMS'leri muaf).
- **Veri maskeleme:** TC/telefon log'larda maskeli (zaten Bölüm 9'da var).

### 26.8 e-Fatura / e-Arşiv Entegrasyonu (eksikti)

Türkiye'de doğrudan GİB'e bağlanılmaz; **özel entegratör** üzerinden gidilir
(seçenekler: Foriba, Uyumsoft, Mliva, Paraşüt API). Faturalar entegratöre iletilir, ETTN alınır.
```sql
CREATE TABLE e_invoice_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    invoice_id BIGINT REFERENCES invoices(id),
    provider VARCHAR(50),                     -- foriba|uyumsoft|mliva
    document_type VARCHAR(20),                -- e_fatura|e_arsiv
    ettn VARCHAR(100),
    status VARCHAR(30),                       -- queued|sent|accepted|rejected
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
`.env`: `EINVOICE_PROVIDER=`, `EINVOICE_USER=`, `EINVOICE_PASSWORD=`, `EINVOICE_BASE_URL=`.
**MVP notu:** İlk sürümde sadece PDF fatura yeterli; e-Fatura Faz 7'de açılabilir (feature flag).

### 26.9 QR Genel (Public) Arıza Akışı — eksik sayfa

`elevators.qr_token` zaten var. Müşteri kabindeki QR'ı okutunca **giriş yapmadan** açılan
genel sayfa tanımlanmalı:
- **Web:** `/qr/{qr_token}` (auth YOK, tenant qr_token'dan çözülür)
- **API:** `POST /fault-reports/public/{qr_token}` (zaten 5.6'da var) → ad/telefon + açıklama + foto
- **Rate limit + reCAPTCHA** (spam koruması). `fault_reports.reported_by_type='qr'`.
- Açılışta asansör/bina bilgisi gösterilir, başarıdan sonra "Talebiniz alındı" + SMS onayı.

### 26.10 Güncellenen Kapsam (v1.1)

- **+15 yeni tablo** (work_orders, elevator_orders, suppliers, staff_schedules, attendance, payroll, documents, region_user, user_devices, sms_preferences, plans, subscriptions, subscription_payments, sms_purchases, platform_admins, consents, e_invoice_logs)
- **+3 yeni bölüm** (KVKK, e-Fatura, QR public akış)
- **Toplam:** ~42 tablo · tutarsızlıklar çözüldü · SaaS faturalandırma tamamlandı

---

```
╔══════════════════════════════════════════════════════════════════╗
║              LİFTONOM — SİSTEM DOKÜMANTASYONU                 ║
║                      DÖKÜMAN SONU                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Hazırlama Tarihi  : Haziran 2026                               ║
║  Kaynak            : asansorex.com (reverse-engineer)           ║
║  Proje Adı         : Liftonom                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  TOPLAM KAPSAM:                                                 ║
║  • 52 sayfa / route belgelenmiştir                              ║
║  • 15 ana modül tanımlanmıştır                                  ║
║  • 80+ API endpoint şeması yazılmıştır                          ║
║  • ~42 veritabanı tablosu tasarlanmıştır (v1.1)                 ║
║  • 13 geliştirme fazı planlanmıştır (~33 iş günü)               ║
║  • Web (Next.js) + Flutter (iOS/Android) arayüz eşleşmesi       ║
║  • Multi-tenant row-level security mimarisi                     ║
║  • Rol bazlı yetki matrisi (5 rol)                              ║
╚══════════════════════════════════════════════════════════════════╝
```
