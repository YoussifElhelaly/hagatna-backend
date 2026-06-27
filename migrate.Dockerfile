FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma

RUN npx prisma generate

CMD ["npx", "prisma", "migrate", "deploy"]
