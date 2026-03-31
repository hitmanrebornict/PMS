# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npx esbuild server/index.ts --bundle --platform=node --format=esm --outdir=dist/server --packages=external
RUN npx esbuild prisma/seed.ts --bundle --platform=node --format=esm --outfile=prisma/seed.mjs --packages=external

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma/seed.mjs ./prisma/seed.mjs
RUN mkdir -p uploads
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/server/index.js"]
