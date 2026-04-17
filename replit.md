# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Tawsila Food Delivery Platform

**Tawsila** is a full-stack food delivery app for Oujda, Morocco. Multi-role platform.

### Architecture
- `artifacts/api-server` — Express 5 REST API on port 8080, JWT auth (jsonwebtoken/bcryptjs)
- `artifacts/food-delivery` — React + Vite frontend (Tailwind, shadcn/ui, wouter, react-query)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react` — Orval-generated hooks + custom-fetch with setAuthTokenGetter
- `lib/api-zod` — Orval-generated Zod schemas
- `lib/db` — Drizzle ORM schema + client

### DB Models
users, restaurants, menuItems, orders, orderItems, drivers, reviews

### Test Accounts (all password: `password123`)
- customer@tawsila.ma (customer)
- driver@tawsila.ma (driver)
- admin@tawsila.ma (admin)
- owner@tawsila.ma (restaurant_owner, owns restaurants 1-6)

### Frontend Routes
- `/` — Home (hero, category filter, Support Local, all restaurants)
- `/restaurants/:id` — Restaurant detail + menu
- `/cart` — Cart checkout
- `/orders` — My orders list
- `/orders/:id` — Order detail with progress tracker
- `/rewards` — Loyalty points & tier (Bronze/Silver/Gold)
- `/profile` — User profile
- `/login`, `/register` — Auth
- `/admin/dashboard` — Admin stats
- `/admin/users`, `/admin/restaurants`, `/admin/drivers`, `/admin/orders`
- `/restaurant/dashboard` — Restaurant owner order management
- `/restaurant/menu` — Menu CRUD
- `/driver/dashboard` — Driver availability + earnings

### Auth Flow
JWT stored in localStorage (`tawsila_token`). `setAuthTokenGetter` registered in `main.tsx` to inject `Authorization: Bearer` header on all API calls.
