# Jatek Food Delivery Platform

## Overview

Jatek is a full-stack food delivery platform for Oujda, Morocco, designed as a multi-role application. It aims to provide a comprehensive food delivery experience with advanced features, robust architecture, and a strong focus on user experience across web and mobile platforms. The project utilizes a pnpm workspace monorepo with TypeScript, ensuring a modular and scalable development environment.

## User Preferences

I prefer clear, concise explanations and detailed documentation for complex features. I expect iterative development with regular updates on progress and any significant architectural decisions. Before making major changes, please ask for confirmation. Do not make changes to the `lib/api-spec/openapi.yaml` file directly; it should only be updated via codegen.

## System Architecture

The project is structured as a pnpm monorepo using Node.js 24 and TypeScript 5.9.

**Core Technologies:**
- **API Framework**: Express 5 for the REST API.
- **Database**: PostgreSQL with Drizzle ORM.
- **Validation**: Zod.
- **API Codegen**: Orval, based on an OpenAPI specification (`openapi.yaml`).
- **Build Tool**: esbuild (CJS bundle).

**Project Structure:**
- `artifacts/api-server`: Express 5 REST API handling JWT authentication.
- `artifacts/food-delivery`: React + Vite frontend using Tailwind, shadcn/ui, wouter, and react-query.
- `artifacts/jatek-mobile`: Expo (React Native) mobile application.
- `artifacts/backend-dashboard`: Staff/admin dashboard with RBAC.
- `lib/api-spec`: Contains the OpenAPI spec (YAML and generated JSON).
- `lib/api-client-react`: Orval-generated API hooks and a custom fetch client.
- `lib/api-zod`: Orval-generated Zod schemas for API validation.
- `lib/db`: Drizzle ORM schema and client.

**Key Features:**
- **User Management**: Comprehensive user roles (customer, driver, admin, owner, employee, super_admin, manager).
- **Order Management**: Scheduled orders, contactless delivery, one-tap reorder.
- **Promotion Engine**: Flexible promo code system with various discount types.
- **Ratings**: Two-way rating system for drivers and customers.
- **Communication**: In-app chat with SSE for real-time updates, in-app notification center.
- **Referral System**: Referral and wallet system to incentivize new users.
- **Content Management**: Dedicated modules for categories, ads, and short-form content.
- **Internationalization**: `i18next` support for English, French, and Arabic (RTL).
- **Mobile-Specific Features**: Phone OTP authentication, Google Maps integration with live order tracking (SSE), performance optimizations for mobile.

**UI/UX and Design:**
- **Web Frontend**: React with Tailwind CSS and shadcn/ui for a modern, responsive design.
- **Mobile App**: React Native with Expo, providing a native-like experience.
- **Brand Palette**: Talabat-inspired hot pink (`#E2006A`), sunny yellow (`#FFD400`), and turquoise (`#00C2C7`) for a vibrant and consistent brand identity across platforms.
- **RTL Support**: Dynamic adjustment of `document.documentElement.dir` for Arabic language.

**Production Hardening (API Server):**
- **Security**: `helmet` for HTTP headers, CORS allowlist, body size limits.
- **Performance**: `compression` (gzip) for all responses.
- **Stability**: Request/response timeouts, graceful shutdown, error logging, global error middleware.
- **Scalability**: Designed for autoscale deployment, with specific build and start scripts for production.

**Backend Dashboard:**
- Dedicated staff/admin dashboard with role-based access control (RBAC).
- Manages orders, products, categories, shops, reviews, customer accounts, staff, drivers, roles, and promotions.

## External Dependencies

- **Database**: PostgreSQL
- **ORMs**: Drizzle ORM
- **Authentication**: `jsonwebtoken`, `bcryptjs`
- **Frontend Frameworks**: React, Vite
- **UI Libraries**: Tailwind CSS, shadcn/ui
- **Routing**: `wouter`, Expo Router (for mobile)
- **State Management/Data Fetching**: `react-query` (TanStack Query)
- **API Codegen**: Orval
- **Validation**: Zod, `drizzle-zod`
- **Internationalization**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- **Mobile (Expo)**: `expo-secure-store`, `AsyncStorage`, Google Maps JS API (via `EXPO_PUBLIC_GOOGLE_MAPS_KEY`), Leaflet+OSM (fallback).
- **SMS Gateway**: Twilio (for phone OTP).
- **Performance**: `babel-plugin-transform-remove-console`, `expo-image`.
- **Server Security**: `helmet`
- **Compression**: `compression`
- **Cloud Platform**: Replit (as deployment target)