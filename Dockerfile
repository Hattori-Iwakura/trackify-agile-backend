# ---- Stage 1: Install all dependencies ----
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# ---- Stage 2: Build ----
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate && npx nest build \
    && sed -i "s|globalThis\['__dirname'\] = path.dirname((0, node_url_1.fileURLToPath)(import.meta.url));|globalThis['__dirname'] = __dirname;|g" dist/generated/prisma/client.js

# ---- Stage 3: Production dependencies only ----
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# ---- Stage 4: Production ----
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy prisma CLI from deps stage for running migrations on startup
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/typescript ./node_modules/typescript

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p uploads/avatars uploads/attachments \
    && chown -R appuser:appgroup uploads
USER appuser

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
