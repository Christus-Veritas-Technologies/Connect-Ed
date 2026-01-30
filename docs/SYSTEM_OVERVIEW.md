# Connect-Ed System Overview

## Introduction

Connect-Ed is a multi-tenant school management system designed to help schools manage students, fees, expenses, and communications. The system supports three pricing tiers (Lite, Growth, Enterprise) with role-based access control.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    (Next.js 15 App Router)                   │
│                       apps/web/                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│                  (Next.js API Routes)                        │
│                    apps/web/app/api/                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│                  (Prisma ORM + PostgreSQL)                   │
│                      packages/db/                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│     Dodo Payments │ Email Provider │ WhatsApp │ SMS          │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Custom JWT with refresh tokens |
| Payments | Dodo Payments + Manual verification |
| Messaging | Email, WhatsApp, SMS (providers TBD) |
| Package Manager | Bun |
| Monorepo | Turborepo |

## Project Structure

```
connect-ed/
├── apps/
│   ├── web/                 # Main application
│   │   ├── app/
│   │   │   ├── (auth)/      # Login, signup, forgot-password
│   │   │   ├── (gated)/     # Payment, onboarding (pre-activation)
│   │   │   ├── (dashboard)/ # Main app (post-activation)
│   │   │   └── api/         # API routes
│   │   ├── lib/             # Utilities (auth, etc.)
│   │   └── middleware.ts    # Auth & plan-tier gating
│   └── docs/                # Documentation site
├── packages/
│   ├── db/                  # Prisma schema & database utilities
│   ├── ui/                  # Shared UI components
│   ├── eslint-config/       # Shared ESLint configuration
│   └── typescript-config/   # Shared TypeScript configuration
└── docs/                    # System documentation (this folder)
```

## Multi-Tenancy Model

Each school is a separate tenant with complete data isolation:

- All entities (users, students, classes, etc.) belong to a specific `schoolId`
- Database queries are always scoped to the current user's school
- Middleware enforces tenant isolation at the API level

## Security Considerations

1. **Authentication**: JWT tokens with short expiry + refresh tokens
2. **Authorization**: Role-based access control (RBAC) per plan tier
3. **Data Isolation**: All queries scoped by schoolId
4. **Password Storage**: Bcrypt hashing with salt
5. **API Protection**: Rate limiting on sensitive endpoints
