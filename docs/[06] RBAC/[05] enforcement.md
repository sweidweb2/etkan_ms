# RBAC — Enforcement story (Phase 8)

How Etkan MS enforces permissions after app RBAC is live. **No permission-mirrored RLS** for manager features.

## Effective permissions (role-only)

Checks use the user’s **role grants**:

```text
effective = role_permissions[profiles.role]
```

- **Role grants** come from `role_permissions` (Manager RBAC UI / `npm run seed:rbac`).
- Session shell / `getUserPermissionsCached` / `requireManagerRoutePermission` / nav filter / `PermissionsProvider` + `Can` / `assertPermission` all use the **same** set from `getSessionPack().permissions`.
- `getPermissionsForRoleCached(role)` is **role-matrix only** (Manager RBAC UI / seed comparisons) — never use it to authorize a user unless that user holds that role.

### Panel routing stays role-only (by design)

| Gate | Source |
|------|--------|
| Middleware `canAccessPath(pathname, role)` | `profiles.role` / JWT role only |
| Panel layout `requireRole(role)` | Role match for `/manager`, `/teacher`, … |
| Nav items, route `*.view`, `Can`, services | Role permission keys |

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
3. Service: `assertPermission` / `getUnauthorizedError` (against role keys)
4. UI: route `*.view` / `rbac.manage` map + `Can` for writes
5. Never authorize in repositories

## Permission cache

- `getUserPermissionsCached` is **request-scoped** React `cache` — the next HTTP request reloads grants from the DB (role keys).
- After RBAC Manager saves, clear role-permission cache + session shells as today, then `revalidatePath(MANAGER_ROOT, "layout")`.
- No Redis/tag permission cache.

## Performance

- Manager layout loads the permission set **once** per request (`getSessionPack` → role keys).
- `PermissionsProvider` / `Can` use in-memory `Set` lookups.
- Route gate (`requireManagerRoutePermission`) uses the same pack permissions.

## Hardening checklist (manual)

Wrong role / missing permission should fail on both UI and server. Prefer the full list in [`[06] regression-checklist.md`](./[06]%20regression-checklist.md) (sections C–D).

Smoke engine: `npm run smoke:authz` (manager sample grants; unknown key denied).
