# Local Compose image (Q-006 production hardening is deferred).
FROM node:22-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
