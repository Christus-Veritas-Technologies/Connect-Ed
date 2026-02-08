# Connect-Ed WhatsApp Agent

AI-powered WhatsApp assistant for the Connect-Ed school management platform.

## Architecture

```
src/
├── index.ts            # Entry point — Hono HTTP server + WhatsApp init
├── sessions.ts         # In-memory auth session manager
├── ai/
│   ├── agent.ts        # Mastra AI Agent (OpenAI GPT-4.1-nano)
│   └── tools.ts        # Read-only tools (verify creds, fetch data)
└── whatsapp/
    ├── client.ts       # wwebjs client init + QR auth
    ├── queue.ts        # Rate-limited message queue (3s/60s delays)
    ├── handler.ts      # Incoming message router (auth flow → AI)
    └── templates.ts    # Pre-built WhatsApp message templates
```

## Features

- **WhatsApp Integration** — wwebjs with QR authentication and session persistence
- **Rate-Limited Queue** — 3s between normal messages, 60s between bulk sends
- **AI Agent** — Mastra + OpenAI with tools, memory, and guardrails
- **Auth Flow** — Email/password verification before data access
- **Templates** — Pre-built messages for reports, fee reminders, welcome (saves OpenAI costs)
- **Quota Tracking** — Increments school's whatsappUsed on each outbound message

## Environment Variables

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
AGENT_PORT=3002
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service status |
| GET | `/health` | Health check |
| GET | `/status` | WhatsApp + queue status |
| POST | `/send` | Send a plain message |
| POST | `/send/report` | Send academic report (template) |
| POST | `/send/fee-reminder` | Send fee reminder (template) |
| POST | `/send/welcome` | Send welcome message (template) |
| POST | `/send/bulk` | Send bulk messages (rate-limited) |
| POST | `/process-pending` | Process PENDING MessageLog entries |

## Running

```bash
cd apps/agent
bun run dev
```

Scan the QR code printed in the terminal with your WhatsApp mobile app.

open http://localhost:3000
