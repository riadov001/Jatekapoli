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

## Project: Jatek Food Delivery Platform

**Jatek** is a full-stack food delivery app for Oujda, Morocco. Multi-role platform.

### Architecture
- `artifacts/api-server` — Express 5 REST API on port 8080, JWT auth (jsonwebtoken/bcryptjs)
- `artifacts/food-delivery` — React + Vite frontend (Tailwind, shadcn/ui, wouter, react-query)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-spec/openapi.json` — generated Swagger/OpenAPI JSON export kept in sync with the YAML spec
- `lib/api-client-react` — Orval-generated hooks + custom-fetch with setAuthTokenGetter
- `lib/api-zod` — Orval-generated Zod schemas
- `lib/db` — Drizzle ORM schema + client

### DB Models
users, restaurants, menuItems, orders, orderItems, drivers, reviews

### Development demo data
- Development DB is populated with realistic Jatek test data: 14 restaurants/shops/pharmacies/courier services, 55 menu/product items, demo orders, order items, favorites, addresses, payment methods, support tickets, quotes, consents, notification preferences, dashboard todos, and staff accounts.
- New mobile Home filters have data coverage for `businessType`: `restaurant`, `shop`, `pharmacy`, and `courier`.

### Test Accounts (all password: `password123`)
- customer@jatek.ma (customer)
- driver@jatek.ma (driver)
- driver2@jatek.ma (driver)
- admin@jatek.ma (admin)
- owner@jatek.ma (restaurant_owner, owns restaurants 1-6)
- demo.client@jatek.ma (customer with demo orders, addresses, payments, favorites)
- amina.vip@jatek.ma (VIP customer with preferences/consents)
- samir.driver@jatek.ma (driver with completed profile and live location)
- super@jatek.ma (super_admin)
- manager@jatek.ma (manager)
- employee@jatek.ma (employee assigned to Jatek Market Al Qods)

### Frontend Routes
- `/` — Home (hero, category filter, Support Local, all restaurants)
- `/restaurants/:id` — Restaurant detail + menu
- `/cart` — Cart checkout
- `/orders` — My orders list
- `/orders/:id` — Order detail with progress tracker
- `/rewards` — Loyalty points & tier (Bronze/Silver/Gold)
- `/profile` — User profile
- `/login`, `/register` — Auth
- `/admin` — Redirects to `/admin/dashboard`
- `/admin/dashboard` — Admin stats (all `/admin/*` routes are gated by `AdminRoute` which requires `role === "admin"`)
- `/admin/users`, `/admin/restaurants`, `/admin/drivers`, `/admin/orders`
- `/admin/restaurants/:id/menu` — Admin menu CRUD for any restaurant
- `/restaurant/dashboard` — Restaurant owner order management
- `/restaurant/menu` — Menu CRUD
- `/driver/dashboard` — Driver availability + earnings

### Internationalisation (i18n)
- Stack: `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- Languages: English (`en`), French (`fr`), Arabic (`ar` — RTL)
- Translation files: `artifacts/food-delivery/src/locales/{en,fr,ar}.json`
- Config: `artifacts/food-delivery/src/i18n.ts` (imported in `main.tsx`)
- Language stored in `localStorage` key `jatek_lang`
- RTL: `document.documentElement.dir` toggled in `Layout.tsx` via `useEffect`
- Switcher: Globe icon in header dropdown (🇬🇧 English / 🇫🇷 Français / 🇲🇦 العربية)
- All pages/components use `useTranslation()` hook

### Auth Flow
JWT stored in localStorage (`jatek_token`). `setAuthTokenGetter` registered in `main.tsx` to inject `Authorization: Bearer` header on all API calls.

### Mobile App (Expo)
- `artifacts/jatek-mobile` — Expo (React Native) app at preview path `/mobile/`
- Phone OTP auth (Twilio), shares same backend API
- Screens: Login, OTP verify, Home (restaurants), Restaurant detail + menu, Cart, Orders list, Order tracking, Profile
- State: AuthContext (expo-secure-store token persistence), CartContext (AsyncStorage)
- Workflow: `artifacts/jatek-mobile: expo`

### Brand palette (Talabat-inspired)
- Primary **Hot pink** `#E2006A` — main CTAs, brand mark, delivery-time pills
- Accent **Sunny yellow** `#FFD400` — promo banners, ratings (★), discount pills
- Accent **Turquoise** `#00C2C7` — info / status (preparing, ready), free-delivery tag, location pill
- Neutrals: white background `#FFFFFF`, ink `#0A1B3D`, muted `#F5F5F5`, border `#EBEBEB`
- Tokens:
  - Web: `artifacts/food-delivery/src/index.css` (`--primary`, `--brand-yellow*`, `--brand-turquoise*`); use Tailwind `bg-brand-yellow`, `text-brand-turquoise`, etc.
  - Mobile: `artifacts/jatek-mobile/constants/colors.ts` (`primary`, `yellow`, `yellowSoft`, `turquoise`, `turquoiseSoft`); read via `useColors()`

## Backend Dashboard (artifact `backend-dashboard`, path `/admin/`)
Staff/admin dashboard for Jatek with full RBAC (super_admin, admin, manager, restaurant_owner, employee).

- Routes prefix `/api/backend/*` in `artifacts/api-server/src/routes/backend.ts` — every route checks role + scopes data per role.
- DB additions: `users.assignedShopId` (employee), `dashboard_todos` table.
- Demo accounts (password `password123`): super@jatek.ma, admin@jatek.ma, manager@jatek.ma, owner@jatek.ma, employee@jatek.ma.
- Auth: JWT in `localStorage["jatek_backend_token"]`, attached via `setAuthTokenGetter` from `@workspace/api-client-react`.
- Frontend: react-vite + tanstack-query + wouter + shadcn, Jatek magenta palette.
