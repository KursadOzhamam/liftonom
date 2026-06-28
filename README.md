# LiftOtonom — Asansör Servis Yönetimi SaaS

Multi-tenant asansör bakım/servis yönetim platformu. Web + Mobil + QR.

## Mimari

| Katman | Teknoloji | Klasör |
|--------|-----------|--------|
| Backend API | Laravel 11 (PHP) + PostgreSQL | `api/` |
| Web Panel | Next.js 14 + TypeScript + Tailwind | `web/` |
| Mobil | Flutter (iOS & Android) | `mobile/` |
| Dokümantasyon | Sistem spec (v1.1) | `docs/` |

Tam sistem dokümanı: [docs/liftotonom-sistem-dokumantasyonu.md](docs/liftotonom-sistem-dokumantasyonu.md)

## Geliştirme Durumu

- [x] PHASE 0 — Setup & Altyapı *(devam ediyor)*
- [ ] PHASE 1 — Auth & Multi-tenant
- [ ] PHASE 2 — Dashboard & KPI
- [ ] PHASE 3 — Müşteri & Bina & Asansör
- [ ] ... (bkz. dokümandaki 13 fazlık yol haritası)

## Yerel Kurulum

### Gereksinimler
- PHP 8.3+, Composer
- PostgreSQL 16
- Redis
- Node.js 20+ (web için)
- Flutter SDK (mobil için)

### Backend (api/)
```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```
