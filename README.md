# RAME — White-label Event Platform

Prototype lengkap berdasarkan **RAME Technical Specification & Prototype Blueprint v1.0**:
platform white-label untuk event komunitas — perjalanan aktivitas (journey), gamification
(stempel/XP/pencapaian), verifikasi QR (online + offline), kredensial digital via **e.id**,
analitik & event replay. Next.js + TypeScript + Tailwind + Prisma. Bilingual ID/EN.

Demo event bawaan: **"Jelajah Kota Tua"** — festival malam di kota fiktif Semilir.

---

## 🚀 Menjalankan Lokal (Windows/macOS/Linux)

```bash
npm install          # + prisma generate (postinstall)
cp .env.example .env # lalu sesuaikan bila perlu
npx prisma db push   # buat database SQLite (dev)
npm run db:seed      # isi data demo
npm run dev          # http://localhost:3000
```

### Akun demo (mode mock — EID_MODE=mock)

| Peran | Cara login |
|---|---|
| **Peserta** (Putri Anggraini) | Klik **"Masuk dengan e.id"** (mock langsung login) atau tombol demo participant di `/join` |
| **Organizer** (Rara Semilir) | `/join` → tombol demo organizer, lalu buka `/organizer` |

Alur peserta untuk dicoba:
`/events/jelajah-kota-tua` → Gabung → **Experience Map** (`/events/jelajah-kota-tua/map`)
→ aktivitas 3 **"Sandi Pusaka"** (kuis, selesai otomatis) → stempel 🧠 → coba aktivitas QR
(1, 2, 4) → buka scanner organizer → pindai QR dari HP/dua tab → stempel + XP → umpan balik
→ kredensial (klaim).

## 🔌 Integrasi e.id (prioritas)

Mode diatur `EID_MODE` di `.env`:

| Mode | Login | Keterangan |
|---|---|---|
| `mock` (default) | simulasi (login Putri/Rara) | tanpa credentials |
| `sandbox` | gateway-sandbox.e.id | isi credentials |
| `production` | gateway.e.id (Login VC) + api-wallet.e.id (OAuth) | sudah terverifikasi live |

### Dua jalur autentikasi

1. **Login with VC (utama)** — Verifier API: `/join` menampilkan QR → holder scan
   dengan aplikasi e.id → gateway kirim **presentation webhook** ke
   `/api/eid/verifier/webhook` → status APPROVED → session RAME dibuat dari
   `holder_account.did`. Fallback polling `GET /api/v1/verifier/presentation/session/:id`
   bila webhook belum sampai (dev lokal). Template verifikasi auto-create
   (`rame-login-vc`, event_type LOGIN_VC) bila `EID_VERIFIER_VERIFICATION_ID` kosong.
2. **OAuth SSO (alternatif)** — redirect ke e.id, one-time code, token server-side.

### Aktifkan produksi (terverifikasi 2026-08-31)

```env
EID_MODE=production
EID_OAUTH_BASE_URL=https://api-wallet.e.id
EID_OAUTH_CLIENT_ID=xxx
EID_OAUTH_CLIENT_SECRET=xxx
EID_OAUTH_CALLBACK_URL=https://domain-anda/api/auth/eid/callback
EID_VERIFIER_BASE_URL=https://gateway.e.id
EID_VERIFIER_CLIENT_ID=xxx   # bisa sama dengan OAuth
EID_VERIFIER_CLIENT_SECRET=xxx
EID_VERIFIER_VERIFICATION_ID=   # auto-create
EID_VERIFIER_WEBHOOK_URL=https://domain-anda/api/eid/verifier/webhook
```

Catatan implementasi: endpoint & payload mengikuti **Postman Collection resmi e.id**
(bukan ringkasan docs!) — OAuth `/api/v1.1/oauth/*`, Verifier `/api/v1/auth/*`,
token di `data.token`, profil di `data.profile`. Semua panggilan diisolasi di
[`lib/eid/`](lib/eid): `oauth.ts`, `verifier.ts`, `issuer.ts`, `mock.ts`, `index.ts`.
Payload eksak webhook adalah boundary provider — parsing defensif (blueprint §18).

## 🐳 Deploy VPS (Docker + PostgreSQL)

```bash
# di VPS
git clone <repo> && cd rame
cp .env.example .env   # isi SESSION_SECRET, POSTGRES_PASSWORD, dan opsi e.id
docker compose up -d --build
# aplikasi: http://VPS_IP:3000
```

- Dockerfile otomatis mengganti provider Prisma `sqlite → postgresql` saat build.
- `docker-entrypoint.sh`: `prisma db push` (sinkron schema) + seed bila `SEED_ON_START=true`.
- Set `SEED_ON_START=false` setelah seed pertama bila tidak mau data ter-reset tiap start
  (seed bersifat reset-total untuk data demo).
- Kalau ada reverse-proxy (Caddy/Nginx): arahkan ke `127.0.0.1:3000` dan perbarui
  `EID_OAUTH_CALLBACK_URL` ke domain publik.

## 📁 Struktur

```
app/                    # App Router: halaman peserta, organizer, API routes
  api/                  #   semua endpoint (events, activities, verification,
                        #   scanner/sync, feedback, organizer/*, auth/eid, eid/issuer)
  events/[slug]/...     #   story, map, stamps, achievements, feedback, credential
  activities/[id]/      #   detail aktivitas (kuis, QR, upload, auto)
  organizer/            #   dashboard, setup, journey builder, scanner, analytics…
components/             # nav, footer, ui primitives, accessibility toolbar, ga4
lib/
  eid/                  # adapter e.id: oauth, issuer, mock, types, errors, index
  analytics.ts          # event log, metrik, insight berbasis aturan, replay
  gamification.ts       # XP, stempel, achievement, idempotensi
  credential.ts         # ELIGIBLE → PENDING → ISSUED/FAILED → REVOKED
  qr.ts                 # QR dinamis (TTL, nonce, device-auth) + verifikasi
  recommendations.ts    # skor deterministik (tanpa AI)
  offline/              # antrean IndexedDB + rekonsiliasi sync
prisma/schema.prisma    # domain model lengkap (blueprint §4)
Dockerfile · docker-compose.yml
```

## 🧪 Testing

```bash
npx prisma db push && npm run db:seed   # reset data demo
node scripts/e2e-test.mjs               # smoke test end-to-end (30 cek)
```

Mencakup: login mock e.id, join, kuis (salah/benar), idempotensi reward, QR + penolakan
payload palsu, feedback, kelayakan → klaim kredensial → ISSUED, analytics, insights,
replay, rekomendasi, dan RBAC (participant ditolak akses organizer).

## ✅ Status vs MVP Definition of Done

- **Peserta**: discover ✓, event story ✓, connect e.id ✓ (mock/sandbox), join ✓,
  Experience Map ✓, aktivitas ✓, verifikasi organizer/QR ✓, reward & stempel ✓,
  achievement ✓, umpan balik ✓, kredensial ✓, rekomendasi ✓
- **EO**: buat event + venue ✓, media partner & komunitas ✓, story & journey ✓,
  aktivitas (template/from zero) ✓, stempel & reward ✓, feedback question ✓,
  kredensial ✓, publish ✓, scanner (online + offline + sync) ✓, analytics ✓,
  insight berbasis aturan ✓, event replay ✓
- **Sistem**: mock e.id adapter ✓, sandbox e.id siap diisi ✓, RBAC & audit log ✓,
  consent/ToS/privacy (halaman profil + mock note) ✓, GA4 tanpa PII ✓, idempotensi ✓

## ⚠️ Catatan implementasi

- Dev lokal memakai SQLite agar tanpa server; produksi VPS = PostgreSQL
  (skema 100% kompatibel — tanpa enum, string constant di `lib/const.ts`).
- QR dinamis: TTL 120 detik, sekali pakai, terikat event/aktivitas/partisipan,
  perangkat scanner harus terotorisasi.
- Scanner offline: transaksi masuk antrean IndexedDB → `POST /api/scanner/sync`
  → status SYNCED / DUPLICATE / CONFLICT / REJECTED.
- GA4 diaktifkan bila `NEXT_PUBLIC_GA_ID` diisi; tanpa PII peserta (anonymize_ip).
