# Bemi Alert (Web MVP Skeleton)

Crypto pump/dump detection web service.

## Stack
- Next.js
- Prisma + Postgres
- Binance API
- Worker scanner
- Telegram alerts (optional)

## Run

npm install
cp .env.example .env
npm run prisma:gen
npm run db:push
npm run dev

In another terminal:
npm run worker