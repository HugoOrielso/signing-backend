# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable

# Para algunas dependencias nativas y compatibilidad general en Alpine
RUN apk add --no-cache libc6-compat openssl

# Dummy DATABASE_URL para que Prisma no falle durante build si intenta resolver env
ARG DATABASE_URL="postgresql://postgres:postgres@dummy-db:5432/app?schema=public"
ENV DATABASE_URL=$DATABASE_URL

# Copiamos archivos de dependencias primero para aprovechar cache
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Instala dependencias
RUN pnpm install --frozen-lockfile

# Copiamos el resto del proyecto
COPY tsconfig.json ./
COPY src ./src

# Genera Prisma Client y build
RUN pnpm prisma generate
RUN pnpm build


FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable
RUN apk add --no-cache libc6-compat openssl

# Crear usuario/grupo no root con los nombres que quieres usar
RUN addgroup -S nodejs && adduser -S expressjs -G nodejs

# Importante:
# como tu CMD usa prisma migrate deploy, el binario de prisma debe existir en runtime.
# Por eso copiamos node_modules completo desde builder.
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/prisma.config.ts ./

RUN mkdir -p /data/uploads/products \
 && chown -R expressjs:nodejs /data/uploads

USER expressjs

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.mjs"]