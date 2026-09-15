# HarborLane Freight Forwarder

Sample Next.js freight-forwarder workspace with:

- Sidebar: **Dashboard**, **Book order**, **Customs**
- Book order form (air / ocean) with embedded AgentBlit chat
- Dangerous-goods heuristics that update required upload documents
- Postgres persistence via Drizzle ORM

## Setup

```bash
pnpm install
# .env already points at staging DATABASE_URL
pnpm db:migrate
pnpm dev
```

App runs at [http://localhost:3083](http://localhost:3083).

## Pages

| Route | Description |
| --- | --- |
| `/dashboard` | Orders summary counts + recent bookings table |
| `/book-order` | Full booking form (left) + agent iframe (right) |
| `/customs` | Clearance queue of submitted shipments |

## Database

Set `DATABASE_URL` in `.env`:

- **Staging:** host `db-91onphe542.agentblit.com:31437`
- **Prod:** host `db-gnyvw8c5ui:5432`

On submit, bookings are stored in the `orders` table with confirmation numbers (tracking, pickup, AWB/SWB) and full form payload JSON.
