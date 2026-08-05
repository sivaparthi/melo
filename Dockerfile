FROM node:20.19-bookworm-slim AS base

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm ci --include=dev

COPY . .

RUN npm run prisma:generate --workspace api && npm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/prisma ./apps/api/prisma

RUN npm ci --omit=dev \
    && npm run prisma:generate --workspace api \
    && npm cache clean --force

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["sh", "-c", "npm run db:deploy --workspace api && npm run start:prod --workspace api"]