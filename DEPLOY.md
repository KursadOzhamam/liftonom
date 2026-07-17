# Liftonom — Canlı/Demo Dağıtım (Coolify)

Bu repo Coolify ile üretim benzeri bir demoya alınacak şekilde hazırlandı.

| Servis | Alan adı | Konteyner portu |
|--------|----------|-----------------|
| API (.NET 10) | `https://liftonom-api.rslabsdev.site` | `8080` |
| Web (Next.js — landing `/` + panel) | `https://liftonom.rslabsdev.site` | `3000` |
| PostgreSQL | (yalnız iç ağ) | `5432` |

- **VPS / Coolify sunucusu:** `76.13.53.93`
- **DNS:** `rslabsdev.site` Hostinger'da. `liftonom-api` ve `liftonom` A kayıtları `76.13.53.93`'e eklendi
  (zaten `*` joker kaydı da aynı IP'ye işaret ediyor). SSL Coolify/Traefik ile otomatik (Let's Encrypt).
- **Dağıtım dalı:** `feature/web-admin-mobile-push`

## Şema & tohum (önemli)

- Taze/boş bir Postgres'te API ilk açılışta **EF modelinden tüm tabloları kurar**
  (`Program.cs` → `EnsureCreatedAsync`, tablolar zaten varsa hiçbir şey yapmaz).
  `Migrations/*.sql` dosyaları yalnız **mevcut/eski** bir DB'yi evriltmek içindir; taze DB'de gerekmez.
- Süper Admin idempotent tohumlanır: `admin@liftonom.com` / `admin123`.

## Yol A — Docker Compose (tek kaynak, önerilen)

1. Coolify → **+ New → Docker Compose**, kaynak: GitHub `KursadOzhamam/liftonom`, dal
   `feature/web-admin-mobile-push`, compose yolu `docker-compose.yml`.
2. Ortam değişkenleri (Coolify → Environment Variables):
   ```
   POSTGRES_PASSWORD=<güçlü-parola>
   JWT_KEY=<en az 32 karakter rastgele gizli>
   NEXT_PUBLIC_API_URL=https://liftonom-api.rslabsdev.site/api/v1
   ```
3. Alan adları: `api` servisine `liftonom-api.rslabsdev.site` (port 8080),
   `web` servisine `liftonom.rslabsdev.site` (port 3000).
4. **Deploy**. Coolify imajları Dockerfile'lardan derler, Postgres'i kalıcı volume ile ayağa kaldırır.

## Yol B — 3 ayrı kaynak

1. **PostgreSQL** (Coolify managed DB) oluştur → bağlantı bilgilerini not al.
2. **API — Application** (Dockerfile), Base Directory `api-net/`, port `8080`. Env:
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ConnectionStrings__Default=Host=<db-host>;Port=5432;Database=<db>;Username=<user>;Password=<pass>
   Jwt__Key=<gizli>
   ```
   Alan adı: `liftonom-api.rslabsdev.site`.
3. **Web — Application** (Dockerfile), Base Directory `web/`, port `3000`. Build arg:
   ```
   NEXT_PUBLIC_API_URL=https://liftonom-api.rslabsdev.site/api/v1
   ```
   Alan adı: `liftonom.rslabsdev.site`.

## Dağıtım sonrası kontrol

- `https://liftonom-api.rslabsdev.site/api/v1/...` → API yanıtı (JSON, snake_case).
- `https://liftonom.rslabsdev.site/` → landing; `/login` → panel girişi.
- Panel yöneticisi demo: `0543 123 45 67` / `123456` (DB'de kayıtlıysa). Süper admin ayrı akış.

## Notlar

- `NEXT_PUBLIC_API_URL` **build anında** gömülür; API adresi değişirse web yeniden derlenmeli.
- FCM push, `api-net/secrets/fcm-service-account.json` yoksa sessizce devre dışıdır (demoyu etkilemez).
- CORS API'de `AllowAnyOrigin` (demo için uygun; canlıda origin kısıtla).
