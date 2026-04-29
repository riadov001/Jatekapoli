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
users, restaurants, menuItems, orders, orderItems, drivers, reviews, categories, ads, shorts, addresses, favorites, otpCodes, userConsents, paymentMethods, supportTickets, quotes, notificationPrefs, dashboardTodos

### Content Management (new)
- `categories` — shop/restaurant categories with icon, accentColor, parentId (sub-categories), businessType, sortOrder
- `ads` — promotions: types = `jatek_offer`, `vip_banner`, `promo_banner`; fields: badge, bgColor, accentColor, icon, imageUrl
- `shorts` — short-form video/image content with restaurantId, restaurantName
- Public API: `GET /api/categories`, `GET /api/ads?type=X`, `GET /api/shorts`
- Admin API: `GET|POST /api/backend/categories`, `PATCH|DELETE /api/backend/categories/:id`, same for `/backend/ads` and `/backend/shorts`

### Test Data (seeded)
- 18 restaurants (Dar Zitoun, Burger Station, Pizza Palace, Sushi Oujda, Tacos Nation, Green Bowl, Rôtisserie, KFC, McDonald's, etc.)
- 72 menu items spread across all restaurants
- 6 parent categories (Restauration, Épicerie, Santé, Supermarché, Boutiques, Coursier) with 14 sub-categories
- 9 ads (4 jatek_offer, 3 vip_banner, 2 promo_banner)
- 8 shorts with Unsplash food thumbnails

### Production hardening (API server)
- Security: `helmet` (HSTS, X-Frame, nosniff, no x-powered-by), CORS allowlist with credentials, body size limit 1mb.
- Rate limiting: 300 req/min global on `/api/*`, 30 req/15min on `/api/auth/*`. SSE `/api/events` and `/healthz` skip the limiter.
- Performance: `compression` (gzip) on all responses.
- Stability: 30s request/response timeout, keepAlive 65s, graceful SIGTERM/SIGINT shutdown, `unhandledRejection`/`uncaughtException` loggers, global error middleware returning `{error}` JSON.
- Listening on `0.0.0.0:$PORT`, `trust proxy = 1` (Replit deploy proxy).
- Health check: `GET /health` → `{ status: "ok" }` (also `GET /api/healthz`).
- SSE `/api/events` now requires auth (`requireAuth`, accepts `?token=` for EventSource).

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

### Frontend Routes (food-delivery)
- `/` — Home (hero, category filter, Support Local, all restaurants)
- `/restaurants/:id` — Restaurant detail + menu
- `/cart` — Cart checkout
- `/orders` — My orders list
- `/orders/:id` — Order detail with progress tracker
- `/rewards` — Loyalty points & tier (Bronze/Silver/Gold)
- `/profile` — User profile
- `/login`, `/register` — Auth
- `/forgot-password` — Password reset
- `/legal` — Legal / CGU page
- `/welcome` — Onboarding address picker (fullscreen, no Layout wrapper)
- `/admin` — Redirects to `/admin/dashboard`
- `/admin/dashboard` — Admin stats (all `/admin/*` routes are gated by `AdminRoute` which requires `role === "admin"`)
- `/admin/users`, `/admin/restaurants`, `/admin/drivers`, `/admin/orders`
- `/admin/restaurants/:id/menu` — Admin menu CRUD for any restaurant
- `/admin/reviews` — Admin review moderation
- `/admin/support` — Admin support tickets management
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
- State: AuthContext (expo-secure-store token persistence), CartContext (AsyncStorage, fully memoized via useMemo + useCallback)
- Maps: Google Maps JS API (key `EXPO_PUBLIC_GOOGLE_MAPS_KEY` / `EXPO_PUBLIC_GOOGLE_PLACES_KEY` ⇐ `GOOGLE_API_KEY_2`), Leaflet+OSM fallback when key missing. Components: `GoogleMapPicker` (centered fixed pin with zone circle), `DriverMap` (live driver tracking with brand-coloured SVG markers + dashed route polyline)
- Live order tracking: SSE channel `order:<id>` + `driver:<id>` for status & GPS updates; map appears as soon as a driver is assigned (any in-flight status), polling fallback at 60s
- Performance hardening: `babel-plugin-transform-remove-console` strips `console.log/info` from production bundles (keeps `error`/`warn`); `expo-image` with `memory-disk` cachePolicy + blurhash placeholder for restaurant cards; `RestaurantCard` wrapped in `React.memo` with shallow prop check
- Reliability: SSE hook does exponential-backoff reconnection (1s → 30s) + 60s read-timeout watchdog; all REST calls go through `jsonFetch` with a 15s AbortController timeout and friendly French error messages
- Workflow: `artifacts/jatek-mobile: expo`

#### Mobile Screens (Expo Router file-based)
- `(auth)/login` — Phone number input
- `(auth)/otp` — OTP code verification
- `(auth)/welcome` — Address picker onboarding (Google Maps / Leaflet)
- `(tabs)/index` — Home feed (restaurants, categories, ads)
- `(tabs)/restaurants` — Browse all restaurants
- `(tabs)/favoris` — Saved favourites
- `(tabs)/orders` — Orders history
- `(tabs)/profile` — Profile hub (tab)
- `(tabs)/deliver` — Driver tab: available deliveries & earnings (role-conditional)
- `(tabs)/manage` — Restaurant owner tab: order management (role-conditional)
- `restaurant/[id]` — Restaurant detail + menu
- `category/[slug]` — Category filtered listings
- `order/[id]` — Live order tracking with SSE map
- `cart` — Cart review & checkout
- `quote/new` — Courier quote / price estimate
- `driver-onboarding` — Mandatory driver profile setup (vehicle, zone)
- `restaurant-onboarding` — Mandatory restaurant profile setup
- `profile/info` — Edit personal info
- `profile/addresses` — Saved delivery addresses
- `profile/payments` — Payment methods
- `profile/favorites` — Favourites management
- `profile/notifications` — Notification preferences
- `profile/reorder` — Reorder from past orders
- `profile/reviews` — My reviews
- `profile/coupons` — Promo codes / coupons
- `profile/support` — Contact support
- `profile/feedback` — Leave feedback
- `profile/help` — Help & FAQ
- `profile/language` — Language selector
- `profile/privacy` — Privacy settings
- `profile/legal` — Legal / CGU
- `profile/report` — Report an issue

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

### Backend Dashboard Routes
- `/` — Dashboard (KPI stats, orders chart, todos)
- `/orders` — Orders management (all roles, scoped by role)
- `/products` — Menu items / products management
- `/categories` — Categories & sub-categories management
- `/shops` — Restaurants & shops management
- `/reviews` — Customer reviews moderation
- `/customers` — Customer accounts list & detail
- `/staff` — Staff accounts management (admin/super_admin only)
- `/deliverymen` — Driver accounts management
- `/roles` — Role & permissions management (super_admin only)
- `/settings` — Platform settings (placeholder)
- `/promotions` — Promotions & ads management (placeholder)
- `/wallets` — Wallets & payouts (placeholder)
- `/notifications` — Push notifications (placeholder)
- `/reports` — Analytics & reports (placeholder)
- `/login` — Staff login (email + password, no OTP)
