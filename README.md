# Connect-Ed

A comprehensive school management system with multi-tenant support, role-based access control, and integrated payment processing.

## Features

- **Multi-tenant Architecture**: Each school is isolated with its own data
- **Role-based Access**: Admin, Receptionist, Teacher, Student, Parent roles
- **Three Pricing Tiers**: Lite, Growth, Enterprise with different features
- **Student Management**: Enrollment, tracking, and reporting
- **Fee Management**: Create fees, record payments, send reminders
- **Expense Tracking**: Record and categorize school expenses
- **Financial Reports**: Collection rates, expense breakdown, net income
- **Messaging Integration**: Email, WhatsApp, SMS with quota management
- **Payment Processing**: Dodo Payments integration + manual cash verification

## Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom JWT with refresh tokens
- **Styling**: Custom CSS (no Tailwind dependency)
- **Monorepo**: Turborepo with Bun

## Project Structure

```
connect-ed/
├── apps/
│   ├── web/                 # Main Next.js application
│   └── docs/                # Documentation site
├── packages/
│   ├── db/                  # Prisma schema & database utilities
│   ├── ui/                  # Shared UI components
│   ├── eslint-config/       # Shared ESLint configuration
│   └── typescript-config/   # Shared TypeScript configuration
└── docs/                    # System documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (package manager)
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd connect-ed
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database URL and secrets:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/connected"
JWT_ACCESS_SECRET="your-32-char-secret-here"
JWT_REFRESH_SECRET="your-32-char-secret-here"
```

4. Set up the database:
```bash
cd packages/db
bunx prisma generate
bunx prisma db push
```

5. (Optional) Seed the database with demo data:
```bash
bun run db:seed
```

6. Start the development server:
```bash
cd ../..
bun run dev
```

The app will be available at http://localhost:3000

### Demo Credentials (after seeding)

- **Admin**: admin@demo-school.com / Admin123!
- **Receptionist**: reception@demo-school.com / Reception123!
- **Teacher**: teacher@demo-school.com / Teacher123!
- **Parent**: parent@demo-school.com / Parent123!

## Pricing Tiers

| Feature | Lite | Growth | Enterprise |
|---------|------|--------|------------|
| Students | <500 | 500-1200 | 2000-3000 |
| Signup Fee | $400 | $750 | $1,200 |
| Per-Term | $50 | $90 | $150 |
| Admin & Receptionist | ✓ | ✓ | ✓ |
| Teacher Portal | ✗ | ✓ | ✓ |
| Student Portal | ✗ | ✗ | ✓ |
| Parent Portal | ✗ | ✗ | ✓ |
| Emails/month | 200 | 500 | 1500 |
| WhatsApp/month | 200 | 500 | 1500 |
| SMS/month | 100 | 300 | 750 |

## Documentation

See the `docs/` folder for detailed documentation:

- [System Overview](docs/SYSTEM_OVERVIEW.md)
- [Entities](docs/ENTITIES.md)
- [Plans](docs/PLANS.md)
- [Auth Flow](docs/AUTH_FLOW.md)
- [Payment Flow](docs/PAYMENT_FLOW.md)
- [API Routes](docs/API_ROUTES.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)

## Development

### Commands

```bash
# Start development server
bun run dev

# Build all packages
bun run build

# Lint all packages
bun run lint

# Type check
bun run check-types

# Format code
bun run format
```

### Database Commands

```bash
cd packages/db

# Generate Prisma client
bunx prisma generate

# Push schema changes (dev)
bunx prisma db push

# Create migration
bunx prisma migrate dev --name <name>

# Deploy migrations (prod)
bunx prisma migrate deploy

# Open Prisma Studio
bunx prisma studio

# Seed database
bun run db:seed
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `DODO_API_KEY` | Dodo Payments API key |
| `DODO_WEBHOOK_SECRET` | Dodo Payments webhook secret |

## License

Private - All rights reserved
