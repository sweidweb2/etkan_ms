# RBAC — Enforcement story (Phase 8)

How Etkan MS enforces permissions after app RBAC is live. **No permission-mirrored RLS** for manager features.

## Session client vs admin client

| Client | Use for | Do not use for |
|--------|---------|----------------|
| **Session** (`createSupabaseServerComponentClient` / action client) | Auth, “who am I”, own credentials update | Manager domain table reads/writes |
| **Admin** (`createSupabaseAdminClient`) | Manager services + repositories after a permission check | Skipping `assertPermission` / `getUnauthorizedError` |

Identity always comes from the session user id. Data access for manager features uses the admin client **only after** the service has authorized that user id.

## Why not dynamic RLS for RBAC

Role permissions are edited in RBAC Manager (`rbac.manage`). Policies that hard-code “students can never X” would fight later grants. Manager domain therefore stays **admin-client + mandatory service checks**. Coarse identity RLS elsewhere (if present) is unchanged and is not the manager permission engine.

## Mandatory check path (new manager feature)

1. Catalog: `[02]` + `lib/constants/permissions.ts`
2. Grant: `npm run seed:rbac` and/or RBAC Manager UI
3. Service: `assertPermission` / `getUnauthorizedError`
4. UI: route `*.view` / `rbac.manage` map + `Can` for writes
5. Never authorize in repositories

## Permission cache

- `getUserPermissionsCached` is **request-scoped** React `cache` — the next HTTP request reloads grants from the DB.
- After RBAC Manager saves, `revalidatePath(MANAGER_ROOT, "layout")` refreshes manager nav + `PermissionsProvider` for the saving user.
- No Redis/tag permission cache.

## Performance

- Manager layout loads the permission set **once** per request.
- `PermissionsProvider` / `Can` use in-memory `Set` lookups.
- Route gate (`requireManagerRoutePermission`) uses the same cached load.

## Hardening checklist (manual)

Wrong role / missing permission should fail on both UI and server. Prefer the full list in [`[06] regression-checklist.md`](./[06]%20regression-checklist.md) (sections C–D).

Smoke engine: `npm run smoke:authz` (manager sample grants; unknown key denied).
