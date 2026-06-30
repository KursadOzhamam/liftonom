# Liftonom — Asansör Servis Yönetimi SaaS

> Multi-tenant asansör bakım/servis yönetim platformu. **Web panel + Mobil (saha) + QR + otonom WhatsApp/SMS bildirim.**

---

> [!IMPORTANT]
> **AI / Geliştirici notu:** Bu README projenin tek kapsamlı giriş noktasıdır. Kod tabanında
> anlamlı bir değişiklik yaptığında (yeni modül/controller, port değişimi, yeni servis veya
> entegrasyon, kurulum adımı, env anahtarı, mimari karar vb.) **bu README'yi de aynı commit
> içinde güncelle.** Mimari tablosu, modül listesi, port/komut ve entegrasyon tablosu gerçeği
> yansıtmalı. Detaylı sistem dokümanı için her zaman
> [docs/liftonom-sistem-dokumantasyonu.md](docs/liftonom-sistem-dokumantasyonu.md) ile senkron tut.

---

## İçindekiler

- [Mimari](#mimari)
- [Öne çıkan özellikler](#öne-çıkan-özellikler)
- [Modüller](#modüller)
- [Proje yapısı](#proje-yapısı)
- [Yerel kurulum](#yerel-kurulum)
- [Demo giriş](#demo-giriş)
- [Gerçek entegrasyonlar](#gerçek-entegrasyonlar-config-ile-aktifleşir)
- [Mimari notlar](#mimari-notlar)

---

## Mimari

| Katman | Teknoloji | Klasör | Port |
|--------|-----------|--------|------|
| **Backend API** | **.NET 10** (ASP.NET Core + EF Core) + PostgreSQL + JWT | `api-net/` | 5080 |
| **Web Panel** | Next.js 16 + React 19 + TypeScript + Tailwind v4 | `web/` | 3000 |
| **Mobil** | Flutter 3.44 (saha teknisyeni — iOS & Android tek codebase) | `mobile/` | — |
| Dokümantasyon | Sistem spec (v1.1) | `docs/` | — |

> Tek backend **.NET** (`api-net/`). JSON ve veritabanı kolonları **snake_case** (frontend uyumu için).

Tam sistem dokümanı: [docs/liftonom-sistem-dokumantasyonu.md](docs/liftonom-sistem-dokumantasyonu.md)

---

## Öne çıkan özellikler

- **Multi-tenant** — firma (tenant) izolasyonu, EF Core global query filter + `TenantMiddleware`
- **Auth** — telefon + şifre → SMS OTP → JWT (claim'ler: `tid`, `uid`, `scope`)
- **Otonom WhatsApp/SMS** — arıza yaşam döngüsünde (oluştu → yola çıktı → tespit + tahmini süre → giderildi) müşteriye otomatik bildirim
- **QR ile girişsiz arıza bildirimi** — asansör QR'ı → public arıza formu
- **Canlı konum takibi** — teknisyen konumu, bina hedefi, mesafe & tahmini varış süresi
- **PDF** — fatura/teklif üretimi (QuestPDF, Community lisans)
- **Atomik finans** — cari/kasa/ledger (çift taraflı kayıt)
- **Abonelik & ödeme** — iyzico-hazır, anahtar yoksa mock gateway
- **Süper Admin paneli** — ayrı kenar menülü tam yönetim paneli (`/admin`, ayrı JWT scope `scope=admin` + ayrı token):
  - **Genel Bakış** — KPI + plan dağılımı + süresi yaklaşanlar + son eklenenler
  - **Firmalar** — arama/sayfalama, satır içi plan/durum, **yeni firma oluşturma** (firma + ilk yönetici, OTP'siz), **firma silme** (soft-delete), firma adına giriş (impersonate)
  - **Firma detayı** — abonelik (plan/bitiş/durum) düzenleme + firma bilgileri + kullanıcı listesi + abonelik ödeme geçmişi
  - **Gelir & Abonelik** — toplam gelir, bu ay, **MRR** (aktif firmaların plan ücretleri), 12 ay tahsilat grafiği, ödeme durumları & son ödemeler
  - **Planlar** — abonelik planları yönetimi (ücret, kullanıcı/asansör limitleri, aktif/pasif)
  - **Platform Yöneticileri** (`/admin/admins`) — CRUD + aktif/pasif (kendini/son yöneticiyi koruma)
- **Zamanlanmış görevler** — `DailyJobsHostedService` ile günlük otomatik işler
- **Açık / Koyu mod** — web panelde tema anahtarı (slate koyu palet), tercih `localStorage` (`theme`) + FOUC önleyici; tema [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill rehberiyle uygulandı

---

## Modüller

Müşteri / Bina / Asansör · TSE takibi · Bakım · Arıza (6 aşamalı yaşam döngüsü) · İş Emri ·
Cari / Kasa / Finans (atomik ledger) · Teklif / Sözleşme / Fatura · Stok · Tedarikçi ·
Personel / Bordro / Puantaj · Bölge · Raporlar · SMS / WhatsApp · Abonelik · Süper Admin.

> Backend'de **36 controller** bulunur (`api-net/Controllers/`); web panelde her modül için
> bir sayfa vardır (`web/src/app/(panel)/`).
>
> **Web panele eklenen modül sayfaları:** Sözleşmeler (`/contracts`), Asansör Talep Formu
> (`/atf`), Durum Tespit Raporu (`/dtr`), Asansör Siparişleri (`/elevator-orders`), Projeler
> (`/projects`), Tedarikçiler (`/suppliers`), Finansal Özet (`/finance`), Hakedişler
> (`/payroll`), Devamsızlık (`/attendance`), Bakım Takvimi (`/maintenance/calendar`),
> Tahsilat Al (`/collections`), Düşük Stok (`/low-stock`).
>
> **Referansla tam paritesi için eklenen son modüller** (yeni tablolar — bkz. migration aşağıda):
> Çek & Senet (`/checks`), Bakım Ücretleri (`/maintenance-fees`), Aylık Toplu Bakım
> (`/bulk-maintenance`), Revizyon Teklifleri (`/revision-quotes`), Kurtarma Formu
> (`/rescue-forms`), Eğitim Tutanağı (`/training-records`), Kategoriler (`/categories`),
> Lokasyonlar (`/locations`), Araç Takip (`/vehicles`), Personel Konum (`/staff-locations`),
> Bildirimler (`/notifications`), Hızlı Kurulum (`/quick-setup`), Hesabım (`/account`).
>
> **Yeni tablolar** `Migrations/2026_06_30_extra_modules.sql` ile gelir (checks, maintenance_fees,
> vehicles, notifications, stock_locations, document_forms + quotes.type & users konum alanları).
> Uygula: `psql -d liftonom -f api-net/Migrations/2026_06_30_extra_modules.sql`

---

## Proje yapısı

```
AsansorTakip/
├── api-net/                # .NET 10 backend (aktif)
│   ├── Controllers/        # 36 REST controller (Auth, FaultReport, Invoice, Admin, ...)
│   ├── Services/           # Tenant, Otp, Token, Ledger, Pdf, Sms, WhatsApp, ScheduledJobs ...
│   ├── Models/             # EF entity'leri (Tenant, User, Building, Elevator, FaultReport ...)
│   ├── Middleware/         # ExceptionMiddleware, TenantMiddleware
│   ├── Data/               # AppDbContext
│   ├── Migrations/         # EF Core migration'ları
│   └── Program.cs          # DI, JWT, CORS, seed (varsayılan süper admin)
├── web/                    # Next.js 16 panel
│   └── src/
│       ├── app/(panel)/    # Modül sayfaları (dashboard, faults, invoices, ...)
│       ├── app/admin/      # Süper Admin paneli
│       ├── components/     # AppShell, LiveMap, LocationPicker, RevenueChart ...
│       └── lib/            # api.ts, nav.ts, format.ts, hooks.ts
├── mobile/                 # Flutter saha uygulaması — YALNIZCA teknisyenler için
│   └── lib/                # main, login, home, fault_detail, qr_scan, location_service ...
│                           #   · Giriş rol kontrolü: yalnızca role=technician kabul edilir
│                           #   · Teknisyen yalnızca KENDİNE atanmış arıza/bakımı görür (?mine=true)
│                           #   · Arka plan konum takibi: yalnızca AKTİF GÖREV varken çalışır (pil dostu),
│                           #     /auth/location'a gönderilir → ofiste "Personel Konum Takibi" haritası
│                           #   · Yeni atama bildirimi: GERÇEK PUSH (Firebase FCM) — uygulama
│                           #     kapalıyken de; ön planda local notification. Yoklama (polling) yedek.
└── docs/                   # liftonom-sistem-dokumantasyonu.md (v1.1)
```

### Mobil — App Store / Play Store hazırlığı

Kod/konfig tarafı hazır:
- **iOS:** `PrivacyInfo.xcprivacy` (gizlilik manifesti — konum toplama beyanı + required-reason API'ler) Runner target'ına eklendi; `Info.plist`'e konum (WhenInUse + Always), `UIBackgroundModes: location`, `ITSAppUsesNonExemptEncryption=false`, kamera (QR) izin metinleri.
- **Android:** `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` izinleri; geolocator ön plan servisi + bildirim ile arka plan takibi.
- **API adresi** build-time yapılandırılır: `flutter build ipa/appbundle --dart-define=API_BASE_URL=https://api.liftonom.com/api/v1` (production'da **HTTPS zorunlu**).

> ⚠️ Mağaza konsolu tarafında yapılması gerekenler (kod değil): **Gizlilik Politikası URL'si**,
> iOS App Privacy / Android Data Safety formunda **konum toplama** beyanı, ve **arka plan konum**
> gerekçesi (Apple review notu + Google Play "background location" prominensi/video). Bunlar
> olmadan onay reddedilebilir.

### Push bildirim — Firebase Cloud Messaging (FCM)

- **Firebase projesi:** `liftonom-saha` (Android + iOS app'leri kayıtlı). Config dosyaları repoda:
  `mobile/android/app/google-services.json`, `mobile/ios/Runner/GoogleService-Info.plist`.
- **Mobil:** `firebase_core` + `firebase_messaging`; giriş sonrası FCM token `POST /auth/device-token`
  ile backend'e kaydedilir, çıkışta `DELETE` ile silinir.
- **Backend:** `PushService` (FCM HTTP v1) — arıza/bakım atamasında ilgili teknisyene push gönderir.
  Service account anahtarı **`api-net/secrets/fcm-service-account.json`** (gitignore'lu, **commit edilmez**),
  `appsettings.json` → `Fcm:ServiceAccountPath` + `Fcm:ProjectId`. Anahtar yoksa push sessizce devre
  dışı kalır (bildirim yine oluşur, mobil yoklama yedeği çalışır).
- **Android push: çalışır durumda** (service account auth + FCM v1 uçtan uca doğrulandı).
- ⚠️ **iOS push için kalan tek adım:** Apple Developer hesabından **APNs Authentication Key (.p8)**
  oluşturup Firebase → Project Settings → Cloud Messaging → *Apple app configuration*'a yükle
  (Key ID + Team ID ile). Bu adım Apple Developer üyeliği + gizli .p8 gerektirir; onsuz iOS'ta push teslim edilmez.

> Yeni tablo: `device_tokens` — `psql -d liftonom -f api-net/Migrations/2026_06_30_device_tokens.sql`

---

## Yerel kurulum

### Gereksinimler
- .NET 10 SDK
- PostgreSQL 16 (veritabanı: `liftonom`)
- Node.js 20+ (web)
- Flutter 3.44+ (mobil)

### Backend (.NET)
```bash
cd api-net
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5080
```
Bağlantı dizesi `appsettings.json` → `ConnectionStrings:Default` içinde. İlk çalıştırmada
varsayılan süper admin idempotent şekilde oluşturulur.

### Web
```bash
cd web
npm install
npm run dev   # → http://localhost:3000
```

### Mobil
```bash
cd mobile
flutter pub get
flutter run   # Android emülatör için api.dart'ta kBaseUrl = 10.0.2.2
              # Gerçek cihazda makinenin LAN IP'sini kullan
```

---

## Demo giriş

- **Panel:** `0543 123 45 67` / `123456`
- **Süper Admin:** `admin@liftonom.com` / `admin123`

---

## Gerçek entegrasyonlar (config ile aktifleşir)

| Servis | Config anahtarı | Anahtar yoksa (varsayılan) | Anahtar varsa |
|--------|-----------------|-----------------------------|---------------|
| SMS | `NETGSM_USER` | `LogSmsSender` (yerel log) | NetGSM |
| WhatsApp | `WhatsApp:Token` (+ `WhatsApp:PhoneNumberId`) | `LogWhatsAppSender` | Meta Cloud API |
| Ödeme | `Iyzico:ApiKey` | `MockPaymentGateway` | iyzico |

> Driver seçimi `Program.cs` içinde config'e göre yapılır — anahtar eklenince **tek satır kod
> değişmeden** canlıya geçer.

---

## Mimari notlar

- **JSON & DB:** Tüm anahtarlar `snake_case` (`JsonNamingPolicy.SnakeCaseLower` + EF `UseSnakeCaseNamingConvention`).
- **Auth sırası:** `UseAuthentication` → `TenantMiddleware` → `UseAuthorization`. Tenant context, JWT claim'leri hazır olduktan sonra kurulur.
- **JWT:** `MapInboundClaims = false` — `tid`/`uid` claim adları URI'ye eşlenmeden korunur. Issuer/Audience = `Liftonom`.
- **Yetki:** `Admin` policy `scope=admin` claim'i ister (Süper Admin uçları).
- **CORS:** Geliştirmede tüm origin'lere açık (Next.js farklı portta). Production'da kısıtlanmalı.
- **PDF:** QuestPDF Community lisansı `Program.cs` başında set edilir.
