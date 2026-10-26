# Local Compose image (Q-006 production hardening is deferred).
FROM node:22-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

# Prisma Client generate and migrate deploy stay in the backend service.
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run dev"]
