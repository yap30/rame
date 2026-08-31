#!/bin/sh
# ============================================================
# RAME — entrypoint produksi (VPS)
# 1. Sinkronkan schema ke PostgreSQL (idempoten)
# 2. Seed data demo bila SEED_ON_START=true
# 3. Jalankan Next.js
# ============================================================
set -e

echo "▶ Sinkronisasi database…"
npx prisma db push --skip-generate --accept-data-loss || echo "⚠ db push gagal — lanjut (periksa DATABASE_URL)"

if [ "$SEED_ON_START" = "true" ]; then
  echo "▶ Menjalankan seed…"
  npx tsx prisma/seed.ts || echo "⚠ seed gagal — lanjut"
fi

echo "▶ Memulai RAME di :3000"
exec npm run start
