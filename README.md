# Liftonom — Asansör Servis Yönetimi SaaS

Multi-tenant asansör bakım/servis yönetim platformu. Web + Mobil + QR + otonom WhatsApp.

## Mimari

| Katman | Teknoloji | Klasör | Port |
|--------|-----------|--------|------|
| **Backend API** | **.NET 10** (ASP.NET Core + EF Core) + PostgreSQL + JWT | `api-net/` | 5080 |
| **Web Panel** | Next.js 16 + TypeScript + Tailwind v4 | `web/` | 3000 |
| **Mobil** | Flutter 3.44 (saha teknisyeni) | `mobile/` | — |
| Dokümantasyon | Sistem spec (v1.1) | `docs/` | — |
| ~~Laravel~~ | ~~PHP referans (emekli)~~ | `api/` | — |

> Aktif backend **.NET** (`api-net/`). Laravel `api/` ilk sürümden kalma referanstır.

Tam sistem dokümanı: [docs/liftonom-sistem-dokumantasyonu.md](docs/liftonom-sistem-dokumantasyonu.md)

## Öne çıkan özellikler

- **Multi-tenant** (firma izolasyonu, EF global query filter)
- **Auth**: telefon + şifre → SMS OTP → JWT
- **Modüller**: Müşteri/Bina/Asansör, TSE takibi, Bakım, Arıza, İş Emri, Cari/Kasa/Finans (atomik ledger), Teklif/Sözleşme/Fatura, Stok, Personel/Bordro, Raporlar, SMS
- **Otonom WhatsApp**: arıza yaşam döngüsünde (oluştu → yola çıktı → tespit + tahmini süre → giderildi) müşteriye otomatik bildirim
- **QR** ile girişsiz arıza bildirimi
- **PDF** fatura/teklif (QuestPDF)
- **Abonelik & ödeme** (iyzico-hazır, mock gateway)
- **Süper Admin** paneli (tüm firmalar, plan/askıya alma, firma adına giriş)

## Yerel Kurulum

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
```

## Demo Giriş

- **Panel:** `0543 123 45 67` / `123456`
- **Süper Admin:** `admin@liftonom.com` / `admin123`

## Gerçek entegrasyon (config ile aktifleşir)

| Servis | Config anahtarı | Şu anki sürücü |
|--------|-----------------|----------------|
| SMS | `NETGSM_USER` | log (yerel) |
| WhatsApp | `WhatsApp:Token` (Meta Cloud API) | log (yerel) |
| Ödeme | `Iyzico:ApiKey` | mock |

Anahtarlar eklenince tek satır kod değişmeden canlıya geçer.
