FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src

RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/delivery_agent_management npx prisma generate \
    && npm run build

EXPOSE 5000

CMD ["npm", "start"]
