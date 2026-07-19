# CLAUDE.md — Liftonom Proje Günlüğü & Doğruluk Rehberi

> Bu dosya projenin **tek doğruluk kaynağıdır** ve AI oturumlarının (Claude Code)
> **halüsinasyon görmesini önlemek** için tutulur. Kod tabanında anlamlı bir değişiklik
> yaptığında **bu dosyayı da aynı commit içinde güncelle**. Buradaki bir bilgi kodla
> çelişiyorsa **kod esastır** — çelişkiyi düzelt, uydurma.
>
> Son güncelleme: 2026-07-19 · Branch: `feature/web-admin-mobile-push`
> **Güncel durum özeti en altta** → [Son Büyük Değişiklikler](#son-büyük-değişiklikler-2026-07).
> Canlı demo (Coolify): API `liftonom-api.rslabsdev.site`, Web (landing `/` + panel) `liftonom.rslabsdev.site`,
> VPS `76.13.53.93`. **Production repo: `RasulSonmez/liftonom` (`main`)** — Coolify buradan otomatik deploy
> eder (push → webhook). Kurulum detayı: [`DEPLOY.md`](DEPLOY.md).

---

## 🚀 ÇALIŞMA AKIŞI — EN ÖNCE BUNU OKU (yerelde DB kurma!)

**Bu proje CANLIDA yaşıyor (Coolify + VPS).** Değişiklikler push ile otomatik yayına girer.
Yerelde PostgreSQL/veritabanı **KURMA**, `dotnet run` ile localde ayağa kaldırmaya **ÇALIŞMA** —
gerek yok, `appsettings.json`'daki connection string orijinal geliştiriciye ait (sende yok).

**Standart değişiklik döngüsü (her seferinde bu):**
1. **Kodu düzenle** (api-net / web).
2. **Derle/doğrula (yerelde, DB'siz):**
   - Backend: `cd api-net && dotnet build` → `Build succeeded`.
   - Web: `cd web && npx tsc --noEmit` ve `npm run build` → `Compiled successfully`.
     (Sayfa sildiysen `rm -rf .next` ile eski tip önbelleğini temizle.)
3. **Yayına al:** `git push liftonom HEAD:main` — `liftonom` remote'u (`RasulSonmez/liftonom`) **repoda
   kayıtlı**; Coolify bu push'u webhook ile yakalar ve **otomatik deploy eder** (~2-3 dk). Ayrıca komut
   çalıştırmana gerek yok, bir daha "deploy nasıl?" diye sorma.
4. **CANLIDA doğrula (yerelde değil):** ~2-3 dk sonra canlı API'ye curl at:
   - API: `https://liftonom-api.rslabsdev.site/api/v1` · Web: `https://liftonom.rslabsdev.site`
   - Login (canlı demo tenant): `POST /auth/login {email:"demo@liftonom.com", password:"demo1234"}` → `token`
   - `Authorization: Bearer <token>` ile ilgili endpoint'i çağır, alan/veri geldi mi bak.
5. **Şema değişikliği (yeni tablo/kolon):** EF model + `Program.cs` idempotent `ALTER … ADD COLUMN
   IF NOT EXISTS` → push → deploy → açılışta çalışır → canlıda hazır. (bkz. aşağıdaki madde 2.)

**Yeni oturumda Coolify deploy durumunu API'den izlemek istersen** (şart değil, push sonrası curl
yeterli): Coolify `https://coolify.rslabsdev.site` + **deploy yetkili Bearer token'ı kullanıcıdan iste**
(güvenlik gereği repoda tutulmaz), `GET /api/v1/deployments/applications/{app_uuid}`. Önceki oturumun
`scratchpad/` scriptleri **o oturuma özeldir, yeni oturumda yoktur.**

**ÖZET — YAPMA:** ❌ yerelde postgres kurmak ❌ connection string aramak ❌ localde `dotnet run`
❌ deploy için ek adım sormak. **YAP:** ✅ derle ✅ `git push liftonom HEAD:main` ✅ canlıda curl ile doğrula.

---

## ⛔ ÖNCE OKU — Sık Yapılan Hatalar (halüsinasyon önleyici)

1. **Backend TEK: .NET 10** (`api-net/`). **Laravel YOK.** Eski `api/` (PHP) klasörü **silindi**;
   "Laravel", "artisan", "composer", "PHP controller" arama/önerme. Referanslar da temizlendi.
2. **Şema RAW SQL ile yönetilir** — `api-net/Migrations/*.sql`. **EF Core migration YOKTUR**
   (`Migrations/` içinde `.cs` dosyası yok). `dotnet ef migrations add` **KULLANMA**; yeni tablo
   için elle `.sql` yaz + EF model + `DbSet` + query filter ekle. (`dotnet ef` kullanman gerekirse
   `Microsoft.EntityFrameworkCore.Design` paketi projede YOK.)
   **Taze/boş DB istisnası (dağıtım):** `Program.cs` açılışta `EnsureCreatedAsync()` çağırır → EF
   modelinden **tüm şemayı** kurar (tablolar zaten varsa hiçbir şey yapmaz). `Migrations/*.sql`
   yalnız **mevcut/eski** DB'yi evriltmek için; taze DB'de gerekmez.
   **⭐ MEVCUT DB'ye kolon ekleme deseni (bu proje bunu kullanıyor):** Yeni alan eklerken (a) EF modeline
   property ekle, (b) `Program.cs` içindeki `ExecuteSqlRawAsync("""…""")` bloğuna
   `ALTER TABLE <tablo> ADD COLUMN IF NOT EXISTS <kolon> <tip>;` ekle (idempotent). Ayrı `.sql`
   dosyası açmaya gerek yok. Coolify canlıda push → deploy → açılışta ALTER çalışır → alan yayında.
3. **JSON ve DB kolonları `snake_case`** (`JsonNamingPolicy.SnakeCaseLower` + EF
   `UseSnakeCaseNamingConvention`). API'ye `snake_case` gönder/bekle.
4. **Multi-tenant**: tenant izolasyonu EF **global query filter** ile otomatik
   (`e.TenantId == CurrentTenantId`). Filtreyi aşmak için `IgnoreQueryFilters()` (sadece Süper Admin
   veya token/cihaz gibi tenant-ötesi işlemlerde).
5. **`git` / deploy remote'u**: İki remote var — `origin` = `KursadOzhamam/liftonom` (dev, buraya
   otomatik push etme), **`liftonom` = `RasulSonmez/liftonom` (CANLI/production, Coolify buradan deploy eder).**
   **Yayına almak için: `git push liftonom HEAD:main`** (yukarıdaki Çalışma Akışı). Bu, "default branch'e
   push etme" istisnasıdır — production akışı kasıtlı olarak `liftonom main`'dir. Aktif yerel branch
   `feature/web-admin-mobile-push`; commit'i oradan `liftonom main`'e push ediyoruz.
6. **Gizli anahtarlar ASLA commit edilmez** — bkz. [Sırlar](#sırlar--güvenlik).
7. **Mobil uygulama YALNIZCA teknisyenler içindir** (rol kontrolü login'de).
8. Konum/port sabitleri: **API `5080`**, **Web `3000`**. Mobil API adresi build-time `--dart-define`.
9. **⛔ SMS YOK.** Üründe hiçbir SMS özelliği/alanı/bakiyesi olmayacak. Yeni ekran/form/banner'a SMS
   ekleme; var olan kalıntıyı kaldır. Eski SMS işleri (TSE/bakım uyarısı) **uygulama içi bildirime**
   (`Notification`, sağ üstteki zil) çevrildi. Müşteri bilgilendirme = **WhatsApp** (`wa.me` şablonları).
10. **Auth artık E-POSTA + şifre** (OTP/SMS **YOK**). `/login` = birleşik giriş/kayıt (split-card tasarım).
    Kayıt: `company_name,name,email,password` → tenant+manager+token. Giriş: `email,password`. (Mobil
    teknisyen girişi telefon+şifre olabilir; panel/web e-posta.)

---

## Mimari

| Katman | Teknoloji | Klasör | Port |
|--------|-----------|--------|------|
| Backend API | **.NET 10** (ASP.NET Core + EF Core) + **PostgreSQL** + JWT | `api-net/` | 5080 |
| Web Panel | **Next.js 16 + React 19 + TypeScript + Tailwind v4** | `web/` | 3000 |
| Mobil (saha teknisyeni) | **Flutter 3.44** (Dart SDK `^3.12.2`), iOS & Android | `mobile/` | — |
| Dokümantasyon | Sistem spec v1.1 | `docs/` | — |

- **42 controller** (`api-net/Controllers/`), web panelde **40+ modül sayfası** (`web/src/app/(panel)/`).
- **Auth**: **e-posta + şifre → JWT** (OTP/SMS YOK). Claim'ler: `tid` (tenant), `uid` (user), `scope`
  (`admin` = süper admin), `aid` (platform admin id). `MapInboundClaims=false`.
- **Middleware sırası** (Program.cs): `UseAuthentication` → `TenantMiddleware` → `UseAuthorization`.
- **Entegrasyon driver'ları config'e göre seçilir** (Program.cs): anahtar yoksa log/mock, varsa gerçek
  (SMS `NETGSM_USER`, WhatsApp `WhatsApp:Token` → Meta, ödeme `Iyzico:ApiKey`, push `Fcm:*`).

## Repo yapısı

```
api-net/       .NET 10 backend (AKTİF, TEK backend)
  Controllers/  42 controller
  Services/     Tenant, Otp, Token, Ledger, Pdf, Sms, WhatsApp, PushService (FCM) ...
  Models/       EF entity'leri (Extras.cs = Check, MaintenanceFee, Vehicle, Notification,
                StockLocation, DocumentForm, DeviceToken)
  Data/         AppDbContext (DbSet'ler + OnModelCreating query filter'ları)
  Migrations/   *.sql (RAW SQL — EF migration DEĞİL)
  secrets/      FCM service account (GITIGNORE — commit edilmez)
web/           Next.js paneli
  src/app/(panel)/   müşteri (tenant) modül sayfaları
  src/app/admin/     Süper Admin (route group (dash) + AdminShell)
  src/components/     AppShell, AdminShell, nav.ts, Badge, Modal, ThemeToggle ...
  src/lib/            api.ts, format.ts, hooks.ts
mobile/        Flutter saha uygulaması (yalnızca teknisyen)
  lib/          api, login, home, maintenance_tab, fault_detail, qr_scan,
                location_service, notification_service, fcm_service, main_scaffold
docs/          liftonom-sistem-dokumantasyonu.md
```

## Kodlama konvansiyonları

- **Backend**: controller'lar `record DTO` + `ToPagedAsync(page, perPage)` (yanıt `{data, meta}`),
  soft-delete (`DeletedAt`), `throw new ApiException(status, msg)`. jsonb alanlar string olarak tutulur
  + `.HasColumnType("jsonb")`. Yeni tenant-izole tablo → `OnModelCreating`'e query filter EKLE.
- **Web**: sayfalar `"use client"`, `api()` (`src/lib/api.ts`, Bearer token, sayfalama normalizasyonu),
  liste+`Modal`/`Field` deseni, semantik renk token'ları (`bg-card`, `text-ink`, `border-line` …).
  **Açık/Koyu mod**: `globals.css` token'ları + `.dark` override; tema `localStorage.theme`.
  Yeni kart yüzeyi için `bg-card` kullan (`bg-white` DEĞİL — koyu modda dönmez).
- **Nav**: `web/src/components/nav.ts` (tenant), `AdminShell.tsx` içi `NAV` (admin).

## Çalıştırma

```bash
# Backend (.NET) — appsettings.json'daki connection string orijinal geliştiriciye göre;
# kendi makinende env override ile:
cd api-net
ConnectionStrings__Default="Host=127.0.0.1;Port=5432;Database=liftonom;Username=<kullanıcı>;Password=" \
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5080

# Web
cd web && npm install && npm run dev        # http://localhost:3000

# Mobil (production'da HTTPS zorunlu)
cd mobile && flutter pub get && flutter run
#   flutter build ipa/appbundle --dart-define=API_BASE_URL=https://api.liftonom.com/api/v1
```

**Demo giriş**: Süper Admin `admin@liftonom.com` / `admin123` · Panel yöneticisi `0543 123 45 67` / `123456`
· Test teknisyeni (DB'de) `0555 123 45 67` / `teknik123`.

## Veritabanı & migration

- Şema **RAW SQL** ile. Uygulama sırası (idempotent, `IF NOT EXISTS`):
  ```
  psql -d liftonom -f api-net/Migrations/2026_06_28_fault_lifecycle.sql
  psql -d liftonom -f api-net/Migrations/2026_06_30_extra_modules.sql
  psql -d liftonom -f api-net/Migrations/2026_06_30_device_tokens.sql
  ```
- Program.cs başlangıçta varsayılan Süper Admin'i idempotent seed eder.

## Modüller

- **Tenant paneli**: Müşteri/Bina/Asansör, TSE, Bakım (+Takvim, Toplu, Ücretler), Arıza (6 aşamalı
  yaşam döngüsü), İş Emri, Asansör Siparişleri, Sözleşme/Teklif/Revizyon Teklifi/ATF/DTR/
  Kurtarma/Eğitim formları, Tahsilat/Cari/Kasa/Çek-Senet/Finansal Özet, Stok/Düşük Stok/Kategori/
  Lokasyon/Tedarikçi, Personel/Hakediş/Devamsızlık/Araç Takip/Personel Konum, Bildirimler, Hızlı
  Kurulum, Hesabım, WhatsApp, Abonelik, Ayarlar. (**Projeler/İşler modülü kaldırıldı** — sayfa+nav yok.)
- **Süper Admin** (`/admin`): Genel Bakış, Firmalar (oluştur/sil/plan/impersonate + detay:
  kullanıcılar+ödemeler), Gelir & Abonelik (MRR), Planlar, Platform Yöneticileri. Ayrı JWT `scope=admin`
  + ayrı token (`lo_admin_token`).
- **Mobil (teknisyen)**: Görevler (kendine atanan arızalar, `?mine=true`), Bakım (kendine atanan),
  QR tara. Arka planda **canlı konum** (yalnızca aktif görev varken — pil dostu) → `/auth/location`.
  **Yeni atama push** (FCM).

## Firebase / FCM / Push

- **Firebase projesi**: `liftonom-saha` · Android+iOS app: paket/bundle `com.liftonom.liftonom`.
- **Config dosyaları** (repoda İZLENMEZ, gitignore'lu — gerekince yeniden indir):
  `firebase apps:sdkconfig ANDROID/IOS <appId> --out=<yol>`.
- **Mobil**: `firebase_core` + `firebase_messaging`; login sonrası token `POST /auth/device-token`,
  çıkışta `DELETE`. Ön planda local notification (`flutter_local_notifications` + Android desugaring).
- **Backend**: `PushService` (FCM HTTP v1, service account OAuth). Arıza/bakım atamasında ilgili
  teknisyene push. Config: `appsettings.json → Fcm:{ProjectId, ServiceAccountPath}`. Anahtar yoksa
  push sessizce devre dışı (bildirim + mobil yoklama yedeği çalışır).
- **APNs (iOS)**: Firebase → Cloud Messaging'e yüklü (auth key). Key ID `A3F5M8AQ57`, Team ID
  `VACK9584U9`. (Sadece dev satırı yüklüyse production satırına da aynı .p8 yüklenmeli.)
- **Durum**: Android push uçtan uca doğrulandı; iOS APNs yapılandırıldı. Gerçek cihaz + token gerekir.

## Sırlar & güvenlik

- **ASLA commit edilmez** (gitignore'lu):
  `api-net/secrets/fcm-service-account.json` (FCM özel anahtarı — gerçek sır),
  `mobile/android/app/google-services.json`, `mobile/ios/Runner/GoogleService-Info.plist`.
- **Not**: `google-services.json`/`plist` içindeki "Google API Key" Firebase **istemci** anahtarıdır;
  gizli değildir (her uygulamada gömülü), Google'a göre güvenli. GitHub secret-scan yine de flag'ler →
  bu yüzden izlemeden çıkarıldılar. Tehlikeli olan **service account** anahtarı hiç commit edilmedi.
- iOS: `PrivacyInfo.xcprivacy` (Apple gizlilik manifesti) Runner target'ında; konum izin metinleri +
  `UIBackgroundModes: location` + `ITSAppUsesNonExemptEncryption=false` Info.plist'te.

## Sık karşılaşılan tuzaklar

- **Ürün ucu `/inventory`** (`/products` DEĞİL). Kategoriler `/inventory/categories`, düşük stok
  `/inventory/low-stock`.
- Query'den gelen `DateTime` **Kind=Unspecified** olur; `timestamptz` karşılaştırmasında
  `DateTime.SpecifyKind(x, DateTimeKind.Utc)` ile UTC'ye çevir (yoksa 500).
- `MaintenanceRecord.AssignedUsers` jsonb dizi; teknisyen filtresi
  `EF.Functions.JsonContains(m.AssignedUsers!, $"[{uid}]")`.
- Web'de yeni kart yüzeyi `bg-card`; `text-white` yalnızca renkli zeminlerde (koyu modda dönmesin).
- Mobil: kurulu Flutter sürümü projeninkiyle (`^3.12.2` / Flutter 3.44) uyuşmuyorsa `flutter pub get`
  başarısız olur; analiz için pubspec SDK'sını geçici gevşetip **sonra geri yükle**, otomatik üretilen
  dosyaları (xcconfig/Podfile/GeneratedPluginRegistrant) HEAD'e al.

---

## Son Büyük Değişiklikler (2026-07)

> Rakip ekran görselleri referans alınıp **bizim modern sürümümüz** yapıldı. Çoğu form geniş, bölümlü,
> gölgeli modal (`bg-slate-950/50` blur backdrop + `pop-in surface-pop` + bordürlü başlık/gövde/footer).

### Tasarım sistemi (web)
- **Primary = canlı indigo `#4F63F5`** (koyu `#7E8CFF`), font **Plus Jakarta Sans**, slate nötr palet.
- **`.accent-card`** yardımcı sınıfı (globals.css): kartın üstüne `--accent` renginde şerit — dashboard
  KPI/hızlı işlem kartlarında, arıza sayaç kartlarında kullanılır.
- **Onay modalı:** native `confirm()` **kullanma**. `useConfirm()` + `<ConfirmProvider>` (AppShell'de
  sarılı). Kullanım: `if (!(await confirm("mesaj", { danger:true }))) return;`. `.btn-danger` sınıfı var.
- **Sidebar accordion** (AppShell): bölümler açılır/kapanır, aktif grup açık, durum `localStorage`.
- **Bildirimler** sidebar'dan kaldırıldı → header'da sağ üstte **zil ikonu** (`/notifications`).
- **AppShell** tenant panelini sarar + `ConfirmProvider`; `AdminShell` süper admini sarar.

### Backend — zamanlanmış işler & tahsilat
- `ScheduledJobs`: TSE (30/7/3/1/0 gün kala) + bakım (3 gün kala) uyarıları artık **`Notification`**
  üretir (SMS DEĞİL), `UserId=null` → tenant geneli, aynı gün tekrarsız. `ISmsSender` bağımlılığı yok.
- **Tahsilat** = `POST /collections` (LedgerService.CollectAsync → kasa + cari ledger). **İptal/İade** =
  `POST /collections/{accountTxId}/reverse` (ters kayıt, çift-iade engeli). Cari sayfasında müşteriye
  tıkla → hareketler + "İade" butonu.

### Yeni EF alanları (hepsi `Program.cs`'de idempotent ALTER ile canlıya iner)
- **Customer**: `authorized_person` (yetkili kişi). Form: create+edit geniş modal (tip/ad/yetkili/
  cep+90/e-posta/vergi no/vergi dairesi/bölge/şehir/ilçe/adres/notlar/aktif).
- **Building**: `type, unit_count, postal_code, phone, email, built_year, manager_email,
  default_technician_user_id, is_active, door_code, access_note` (+ mevcut city/district/floor_count/
  manager_name/manager_phone/lat/lng). "Yeni Bina" modalı bunların hepsini içerir. `Show` → `Building.Customer`.
- **Elevator**: `capacity_persons, served_floors, speed_ms, door_type, stop_count, registration_no,
  manufacture_year, installation_date, tse_label_color, tse_label_note, has_emergency_phone/ups/
  fire_system/earthquake_sensor`. Index'te **TSE etiketi** (kırmızı/mavi/yeşil/sarı) inline atanır:
  `POST /elevators/{id}/tse-label {color}`. `Show` → `Building.Customer`. Detay sayfası bina+müşteri+tüm alanlar.
- **MaintenanceFee**: `valid_to` (bitiş). **MaintenanceRecord**: `is_critical, description, notes`.
- **FaultReport**: `title, type, code, contact_name, contact_phone, symptoms, work_done,
  under_warranty, billable, notes` (teşhis=`fault_diagnosis`, çözüm=`resolution_note`).
- **Region**: `responsible_user_id` (sorumlu personel). **ElevatorOrder**: `building_id, project_name,
  capacity_kg/persons, floor_count, stop_count, speed_ms, door_type, order_date, estimated_end,
  downpayment, technical_details`; sipariş no boşsa `SIP-YYYYMMDD-XXXX` otomatik; status default `draft`.

### Zenginleştirilen index/akışlar
- **Bakım** (`/maintenance`): arama + filtreler (kapsam/durum/tip/tarih/bölge/teknisyen/sırala),
  Excel'e Aktar (client CSV), çoklu seçim (toplu teknisyen ata + sil), Görüntüle/Düzenle/Termal Fiş
  (`/maintenance/{id}/pdf`)/Sil/Tamamla. **Bakım oluşturma = 3 modlu** (Planla / Hemen / Geçmiş) mod
  seçici → banner'lı form. Index projeksiyonu: `elevator_name/building_name/customer_name/assigned_users/is_critical`.
  `UpdateDto` genişletildi (assigned_users/description/is_critical/notes).
- **Arıza** (`/faults`): sayaç başlığı + Bugün Yeni/Çözülen kartları + sekmeler (Açık/Bana Atanan/
  Sahipsiz/Çözülenler/Tümü) + Liste/Kanban + arama/öncelik. Index'e `open`/`unassigned` filtreleri,
  `summary` → `today_resolved/unowned/mine`, genel `PUT /fault-reports/{id}` (düzenleme).
- **Aylık Toplu Bakım** (`/bulk-maintenance`): dönem/dağılım(tek gün|hafta içine yay)/strateji(aynı|bina
  varsayılanı)/hedef filtreleri; `POST /maintenance/bulk` `preview:true` → **dry-run plan** (yazmaz),
  `preview:false` → oluşturur. Bina varsayılan teknisyeni + bakım ücreti filtresi + "bu ay zaten planlı" atlama.
- **Asansör Siparişleri** (`/elevator-orders`): geniş form + satır içi "+ Yeni Müşteri"; düzenleme
  ekranında **"Yeni Tahsilat"** bölümü (`/collections` → kasa+cari).
- **Hızlı Kurulum** (`/quick-setup`): tek ekran müşteri+bina+**çoklu asansör**+bakım ücreti.
- **TSE** (`/tse`): "TSE Muayene Takibi" — arama + Liste(Yaklaşan/Süresi Dolmuş/Belge Yok/Tümü sayaçlı)/
  Sırala + tablo. Endpoint `GET /elevators/tse-report?list=&search=&sort=`.
- **Dashboard**: `GET /dashboard/overview` (banner: paket/deneme/… — **SMS bakiyesi kaldırıldı**;
  sayaçlar/hasılat bugün-hafta-ay/kasa/çek-senet) — hepsi gerçek veri.

### Sözleşme belge sistemi (`/contracts`) — Belgeler + Şablonlar
- **İki sekme:** *Belgeler* (sözleşme listesi: arama + Durum/Belge/Sırala filtreleri, Excel CSV, satır işlemleri
  Önizle/Gönder/PDF/Düzenle/Sil) ve *Şablonlar* (madde tabanlı bakım sözleşmesi şablonları; Varsayılan/Aktif,
  madde sayısı). Sekme sayacı şablon sayısını gösterir.
- **Yeni model `ContractTemplate`** (`contract_templates`, jsonb `clauses`=[{title,body,active}] + `variables`=[{key,label}]);
  DbSet + query filter + `Program.cs` CREATE TABLE. Her tenant ilk erişimde **"Standart Bakım Sözleşmesi"** (13 madde,
  varsayılan) otomatik seed edilir (`EnsureDefaultTemplate`).
- **`Contract` genişletildi** (hepsi idempotent ALTER): `building_id, template_id, currency, period, annual_visits,
  renewal_notice_days, document_status(draft|sent|approved), customer_name, rep_name, phone, email, terms, clauses,
  public_token, company_signature, customer_signature, sent_at, approved_at`. Sözleşme no boşsa `SOZ-YYYYMMDD-XXXX`.
- **Tam sayfa form** (`/contracts/new`, `/contracts/[id]/edit` — ortak `ContractForm.tsx`): şablon seçimi (varsayılan
  ön-seçili), müşteri/bina, serbest müşteri adı/temsilci/iletişim, tarih/tutar/para birimi/periyot/ziyaret, yaşam
  döngüsü, yenileme gün, otomatik yenile, serbest şartlar. Kaydet → önizlemeye yönlendirir.
- **Önizleme** (`/contracts/[id]/preview`): şablon maddeleri `{{yer_tutucu}}`larla firma/müşteri/bina verisiyle
  **doldurulmuş** (backend `Render`) render edilir; firma imza **canvas** (data URL), *Gönder* (`POST /contracts/{id}/send`
  → `document_status=sent`, public token), *PDF* (window.print), *Şablon Olarak Kaydet*, kopyalanabilir müşteri linki.
- **Müşteri public sayfası** (`/contract/[token]`, panel dışı): `GET /public/contracts/{token}` (AllowAnonymous +
  IgnoreQueryFilters) belgeyi gösterir; müşteri imza çizip `POST .../approve` → `document_status=approved`.
- **Gerçek PDF** (`GET /contracts/{id}/pdf`, QuestPDF `PdfService.GenerateContract`): A4 çok sayfalı, başlık
  her sayfada, doldurulmuş maddeler + firma/müşteri imza görselleri (`FitArea` — sabit yükseklikle çakışmaz)
  + sayfa no. Web'de PDF butonları `downloadFile` ile indirir (window.print DEĞİL).
- **Gönder + e-posta:** önizlemede *Gönder* → müşteri e-postası varsa "e-postasına gönderilsin mi?" diye
  sorar (`useConfirm`); onaylanırsa `POST /contracts/{id}/send {send_email:true}` → müşteriye **şablonlu +
  PDF ekli** mail. E-posta yoksa 422 uyarı. Yanıt `{email_sent, email_error, recipient}`.
- **E-posta gönderici:** `IEmailSender`/`SmtpEmailSender` — config `Smtp:Host/Port/User/Password/From/FromName/Ssl`.
  **Anahtar yoksa gönderMEZ**, log + `email_sent=false` döner (canlıda henüz Smtp:* set edilmedi → Coolify env'e eklenmeli).
  Public link tabanı `Web:PublicUrl` (varsayılan `https://liftonom.rslabsdev.site`).
- **E-posta şablonu Ayarlar'da:** `Tenant.ContractEmailSubject/Body` (Settings GET/PUT + Ayarlar sayfası bölümü).
  Yer tutucular: `{{firma_adi}} {{musteri_adi}} {{sozlesme_no}} {{tutar}} {{baslangic}} {{bitis}} {{periyot}} {{link}}`.
  Boşsa varsayılan profesyonel metin (`DefaultEmailBody`).
- Uçlar `ContractController` (contracts + `templates` CRUD + `send`/`signature`/`pdf`) ve `PublicContractController`.

### Canlı deploy doğrulama (bu oturumda kullanılan akış)
- Değişiklik → `git push liftonom HEAD:main` → Coolify webhook otomatik deploy. Durum:
  `GET /api/v1/deployments/applications/{app_uuid}` (Coolify API + Bearer token). Scriptler & app_uuid:
  `scratchpad/` (deploy_state.json, cool_token, monitor.py). Deploy ~2-3 dk; sonra canlı API'ye curl ile doğrula.
- **Web build:** `web`'de `npm run build` (Next 16 Turbopack). Silinen sayfa sonrası `.next/types`
  eski referans hatası verebilir → `rm -rf .next` ile temizle. tsc: `npx tsc --noEmit`.
```
