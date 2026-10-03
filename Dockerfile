FROM node:20-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run db:generate \
  && npm run build -w apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app
USER app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
RUN npm ci --omit=dev

# Generated Prisma client + schema needed at runtime
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/packages/database ./packages/database

COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "apps/api/dist/main"]
