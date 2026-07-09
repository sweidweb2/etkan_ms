# Etkan MS

School management system scaffold built on a reusable Next.js + Supabase bedrock.

**Current scope:** auth (login / signup / logout) and an admin panel shell. Domain features (students, classes, grades, etc.) will be added on top of this foundation.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (Auth + Postgres)
- **Zod**, **React Hook Form**, **shadcn-style UI**

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Then set your values:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

See [docs/config/supabase-auth.md](docs/config/supabase-auth.md) for Supabase redirect URL setup.

### 3. Database

Apply migrations and generate types:

```bash
npx supabase db push
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

See [docs/cmds/migrations.md](docs/cmds/migrations.md) for the full migration workflow.

### 4. Seed the first admin

```bash
npm run seed:admin
```

Optional overrides: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_USERNAME`.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin panel: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard).

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Routes, layouts, server actions |
| `components/` | Reusable UI (auth forms, panel shell, loaders, shadcn primitives) |
| `services/` | Business logic and authorization |
| `repositories/` | Supabase data access |
| `lib/` | Config, validators, auth helpers, constants |
| `supabase/migrations/` | Database schema |
| `docs/` | Project documentation |

Architecture rules for contributors and agents live in [.cursor/rules/etkan_ms.mdc](.cursor/rules/etkan_ms.mdc).

## Documentation

| Doc | Description |
| --- | --- |
| [docs/database/database_explanation_v1.md](docs/database/database_explanation_v1.md) | Database schema overview |
| [docs/config/supabase-auth.md](docs/config/supabase-auth.md) | Auth URL configuration |
| [docs/cmds/migrations.md](docs/cmds/migrations.md) | Migration commands |
| [docs/cmds/packages.md](docs/cmds/packages.md) | Dependency install reference |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run seed:admin` | Create the first admin user |
