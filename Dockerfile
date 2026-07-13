FROM node:25.2.0-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run db:generate \
  && npm run build -w apps/api

FROM node:25.2.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
RUN npm ci --omit=dev

# Generated Prisma client + schema needed at runtime
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/packages/database ./packages/database

COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
