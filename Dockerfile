# ============================================================
# RAME — Dockerfile (deploy VPS sendiri)
# Prisma di-switch ke PostgreSQL, build Next.js standalone.
# Entry: docker-entrypoint.sh (db push + seed opsional + start)
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

# dependency (npm ci butuh package-lock; jika belum ada, pakai install)
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# VPS: ganti provider Prisma dari sqlite ke postgresql
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# generate client + build
RUN npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl curl && addgroup -S rame && adduser -S rame -G rame

COPY --from=builder --chown=rame:rame /app ./

RUN chmod +x /app/docker-entrypoint.sh
USER rame

EXPOSE 3000
CMD ["/app/docker-entrypoint.sh"]
