# Ashlilie

Personal portfolio site with an admin panel for content management. Public pages are open to everyone; only **admin** users sign in to manage the site.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (Auth + Postgres)
- **Zod**, **React Hook Form**, **TanStack Query / Table**, **shadcn-style UI**

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

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
npx supabase gen types typescript --project-id zqxpfdcgnotprzyojamu > types/supabase.ts
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
| `components/` | UI (no business logic or Supabase calls) |
| `services/` | Business logic and authorization |
| `repositories/` | Supabase data access |
| `lib/` | Config, validators, auth helpers, constants |
| `supabase/migrations/` | Database schema |
| `docs/` | Project documentation |

Architecture rules for contributors and agents live in [.cursor/rules/ashlilie.mdc](.cursor/rules/ashlilie.mdc).

## Documentation

| Doc | Description |
| --- | --- |
| [docs/database/database_explanation_v1.md](docs/database/database_explanation_v1.md) | Current database schema |
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
