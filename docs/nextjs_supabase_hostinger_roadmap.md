# Roadmap: Self-Hosting Next.js + Supabase on a Hostinger VPS

## Overview

The proposed architecture is technically possible and can be healthy for production. However, moving everything to one VPS does not automatically solve performance problems. You gain infrastructure control, but you also become responsible for database operations, backups, security, updates, monitoring, and reliability.

The target architecture is:

- Users: web browsers and React Native mobile app
- Cloudflare: DNS, proxy/CDN, HTTPS, and Cloudflare R2 for object storage
- Hostinger VPS:
  - Reverse proxy such as Caddy or Nginx
  - Next.js application
  - Self-hosted Supabase
  - Persistent volumes for database and service data
- Separate backup destination for disaster recovery

## 1. What needs to be migrated?

There are three separate migrations.

### 1.1 Next.js application

✅ Move the Next.js application to a Dockerized production build **in this repo** and onto the Hostinger VPS (staging + prod containers behind Caddy). As-built notes: [`[14] Deploy/README.md`](./[14]%20Deploy/README.md).

### 1.2 Supabase backend

Move the required Supabase services, including:

- PostgreSQL
- Auth
- PostgREST/API
- Realtime, if required
- Storage gateway
- Other required Supabase services

### 1.3 File storage

Move existing files from Supabase Storage to Cloudflare R2 if R2 satisfies the application's requirements. Configure the self-hosted Supabase Storage layer to use an S3-compatible backend where supported.

Do not delete the existing managed Supabase project until the new system has been tested and verified.

## 2. Roadmap in the correct order

### Step 1 — Prepare the VPS

- Choose an Ubuntu VPS with sufficient RAM, CPU, and SSD.
- Configure SSH keys.
- Create a non-root deployment user.
- Configure the firewall.
- Install Docker and Docker Compose.
- Set up the required domain or subdomains.
- Configure monitoring and basic server alerts.

A practical starting point for a full Supabase stack may be around 8 GB RAM, 4 CPU cores, and 80 GB SSD, depending on workload. Treat this as a starting estimate, not a universal requirement.

### Step 2 — Deploy self-hosted Supabase

- Use the official Supabase Docker deployment.
- Pin tested versions instead of blindly using latest images.
- Configure database credentials and secrets.
- Configure JWT-related keys and public URLs.
- Start the required services.
- Verify service health.
- Keep the database and administrative interfaces private or tightly restricted.

The self-hosted stack can include PostgreSQL, Auth, PostgREST, Realtime, Storage, and other services depending on the configuration.

### Step 3 — Migrate the database

- Back up the current managed Supabase database.
- Export the schema.
- Export tables and data.
- Include extensions.
- Include functions and RPCs.
- Include triggers.
- Include indexes.
- Include RLS policies.
- Restore the data into the self-hosted PostgreSQL instance.
- Verify all tables, indexes, functions, permissions, and policies.
- Test authentication-related behavior and dependencies.

Do not assume that copying only the application tables is sufficient.

### Step 4 — Configure Cloudflare R2

- Create an R2 bucket.
- Create restricted S3-compatible credentials.
- Configure the supported Supabase Storage S3 backend.
- Migrate existing files while preserving paths and metadata.
- Verify public and private bucket behavior.
- Test signed URLs.
- Test CORS.
- Verify RLS and access control.
- Decide which objects can be cached publicly.

R2 is useful for separating object storage from the VPS. However, it is not automatically a CDN for every request. Public assets, private files, and dynamic downloads require different access and caching strategies.

### Step 5 — Move Next.js to Docker

- ✅ Add a production Dockerfile.
- ✅ Use `output: "standalone"` where appropriate.
- ✅ Build the production image (verified locally with `npm run build` / `npm start`).
- Run the application on the VPS.
- ✅ Configure production environment **templates** (`.env.staging.example`, `.env.production.example`; shared Mailtrap / Turnstile / Cloudflare AI).
- Connect the application to the new Supabase API URL (templates use `https://api.etkan.org`; stack not running).
- Test on the VPS:
  - Server Components
  - Server Actions
  - API routes
  - Authentication
  - File uploads
  - Background jobs
  - Scheduled tasks
  - Any application-specific integrations

### Step 6 — Configure networking and domains

- ✅ Caddyfile + `compose.proxy.yaml` in the repo (`staging.etkan.org` → 3001, `etkan.org` → 3000, `www` redirect).
- Enable HTTPS (Let's Encrypt on the VPS when Caddy is up).
- ✅ Route Next.js hosts in Caddy (not live until VPS + DNS).
- Route `api.etkan.org` to Kong (block is in Caddyfile, **commented** until self-hosted API exists).
- Keep PostgreSQL private.
- Restrict Supabase Studio.
- Configure Cloudflare DNS.
- Decide whether Cloudflare proxying should be enabled for each hostname.
- Confirm that WebSockets and Realtime work correctly if used.

### Step 7 — Test before switching traffic

- Run the new system in staging.
- Test all important user workflows.
- Compare performance with the Vercel version.
- Run load tests.
- Inspect database query performance.
- Test authentication and authorization.
- Test file uploads and downloads.
- Test failure scenarios.
- Perform a backup and restore test.
- Confirm monitoring and alerting.
- Switch production traffic only after validation.

## 3. Side effects and consequences

| Area | Benefit | Risk or consequence |
|---|---|---|
| Performance | The app and database can communicate within the same VPS or private network. | A weak VPS, overloaded CPU, or slow disk can make the whole system slower. |
| Cost | Potentially lower recurring infrastructure cost. | You must pay for backups, monitoring, storage, and maintenance. |
| Database | Full control over PostgreSQL and configuration. | You lose many managed-service conveniences and must handle operations yourself. |
| Availability | Full control over the entire stack. | One VPS becomes a single point of failure. |
| Scaling | You can tune and upgrade the server. | Vertical scaling has limits; future horizontal scaling requires planning. |
| Storage | R2 separates file storage from the VPS and can support CDN delivery. | R2 does not automatically accelerate every request or every private file. |
| Security | You control the infrastructure. | You are responsible for firewall rules, secrets, TLS, updates, database security, and incident response. |
| Maintenance | You control release timing and configuration. | Supabase, Docker images, operating-system packages, and security patches need ongoing maintenance. |
| Recovery | You can design your own backup strategy. | Backups are only useful if they are tested and stored separately from the VPS. |

## 4. Recommended migration strategy

Because the original problem is Next.js plus Supabase performance, do not migrate everything at once.

### Recommended sequence

1. Deploy Next.js on the VPS while keeping the managed Supabase database.
2. Measure whether application-to-database latency improves.
3. Move file storage to Cloudflare R2 independently if it meets the requirements.
4. Self-host Supabase only after confirming that the operational burden and performance benefits justify it.
5. Keep the managed Supabase project available until the new system has passed functional, performance, security, and recovery tests.

This approach helps identify whether the actual bottleneck is:

- Vercel-to-Supabase latency
- Database queries
- Missing indexes
- Server-side rendering
- Excessive round trips
- Storage operations
- Network configuration
- Background jobs
- Cold starts
- Application-level logic

## 5. Important warning

Self-hosting Supabase does not guarantee better performance.

If the VPS is far from users, has poor network connectivity, lacks CPU or RAM, or uses slow storage, the application may become slower. Cloudflare R2 is useful for object storage, but it does not replace database optimization and does not automatically accelerate every application request.

## 6. Practical production checklist

### Infrastructure

- [ ] Ubuntu VPS configured
- [ ] SSH keys enabled
- [ ] Non-root deployment user created
- [ ] Firewall configured
- [ ] Docker and Docker Compose installed
- [ ] Domain and DNS configured
- [ ] HTTPS enabled
- [ ] Monitoring enabled
- [ ] Alerts configured

### Supabase

- [ ] Official self-hosted stack deployed
- [ ] Secrets configured securely
- [ ] Database restored
- [ ] Extensions restored
- [ ] Functions and RPCs verified
- [ ] Triggers verified
- [ ] Indexes verified
- [ ] RLS policies verified
- [ ] Auth tested
- [ ] Realtime tested if needed
- [ ] Studio restricted

### Storage

- [ ] R2 bucket created
- [ ] Restricted credentials created
- [ ] Storage backend configured
- [ ] Files migrated
- [ ] File paths preserved
- [ ] Public/private access tested
- [ ] Signed URLs tested
- [ ] CORS configured
- [ ] Caching strategy verified

### Next.js

- [x] Production Dockerfile created
- [x] Production image built (local)
- [x] Environment variable templates configured (staging/prod + `.env.supabase.vps.example`)
- [ ] Next.js connected to new API
- [ ] Authentication tested
- [ ] Server Actions tested
- [ ] API routes tested
- [ ] Uploads tested
- [ ] Background jobs tested
- [ ] Logs collected

### Reliability

- [ ] Automated backups configured
- [ ] Backups stored outside the VPS
- [ ] Restore test completed
- [ ] Load test completed
- [ ] Failure scenarios tested
- [ ] Rollback plan prepared
- [ ] Managed Supabase kept until migration is proven

## 7. Official documentation

- Supabase self-hosting with Docker: https://github.com/supabase/supabase/blob/master/docker/README.md
- Supabase self-hosted S3 storage: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/self-hosting/self-hosted-s3.mdx
- Cloudflare R2 API: https://developers.cloudflare.com/r2/api/
- Cloudflare R2 S3 compatibility: https://developers.cloudflare.com/r2/api/s3/
- Cloudflare R2 architecture: https://developers.cloudflare.com/r2/how-r2-works/

## Bottom line

The architecture is viable, but the safest approach is incremental:

1. Move Next.js to the VPS.
2. Measure performance.
3. Move storage to R2 if appropriate.
4. Self-host Supabase only when the benefits clearly outweigh the maintenance and reliability costs.
