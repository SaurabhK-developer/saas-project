# Tablefolk — Restaurant Menu Demo

A responsive QR-menu and restaurant-dashboard MVP prototype built with Next.js.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard starts with sample restaurant data. Use **Preview menu** or open the customer menu URL below, add items to the bag, and place a demo order. The order appears in the dashboard's live-orders view. Menu changes, orders, and table changes are saved in this browser's local storage.

## Pages

- `/admin` — dashboard overview
- `/admin/orders` — live orders
- `/admin/menu` — menu editor
- `/admin/tables` — tables and downloadable QR codes
- `/admin/reports` — sales and order history
- `/r/the-garden-cafe?table=04` — customer menu for a table (QR destination)

## Included in this prototype

- Customer menu with category filters, item availability, cart, and order placement
- Restaurant dashboard with overview, order status workflow, menu editing, tables, and reports
- Per-table QR generation with PNG download
- Prisma PostgreSQL schema in `prisma/schema.prisma`

Table QR links open the customer menu directly. When running locally, a QR code made at `localhost` only works on that same computer; to scan it with a phone, access the app using the computer's LAN IP on the same Wi-Fi, or deploy the app and generate the QR from its public URL.

## Database and production setup

The current interface is a **browser-local demo**, not a multi-user production service. It does not yet connect to PostgreSQL/Supabase, and it has no real authentication, API persistence, cross-device live updates, or payment/subscription processing. The included Prisma schema is a design artifact; no database migration has been applied.

To make the demo persistent across users and devices, configure a PostgreSQL/Supabase project and `DATABASE_URL`, install/configure Prisma in the app, apply migrations, and replace local-storage reads/writes with authenticated server-side APIs. Add Supabase Auth (or another auth provider) and realtime subscriptions before using it with a real restaurant. Never put database credentials in client-side code.

## Validate

```bash
npm run lint
npx tsc --noEmit
npm run build
```
