# RBAC — Enforcement story (Phase 8 + UBAC)

How Etkan MS enforces permissions after app RBAC is live. **No permission-mirrored RLS** for manager features.

## Effective permissions (RBAC + UBAC)

Checks use the user’s **effective** set, not role grants alone:

```text
effective = (role_permissions ∪ user_allows) − user_denies
```

- **Role grants** come from `role_permissions` (Manager RBAC UI).
- **User overlay** (`user_permissions`, Manage users → private permissions): optional per-user allow and deny rows. Plan: [`[10] Plans/[02] rbac-plus-ubac.md`](../[10]%20Plans/[02]%20rbac-plus-ubac.md).
- Session shell / `getUserPermissionsCached` / `requireManagerRoutePermission` / nav filter / `PermissionsProvider` + `Can` / `assertPermission` all use the **same** effective set from `getSessionPack().permissions`.
- `getPermissionsForRoleCached(role)` is **role-matrix only** (Manager RBAC UI / seed comparisons) — never use it to authorize a user.

### Panel routing stays role-only (by design)

| Gate | Source |
|------|--------|
| Middleware `canAccessPath(pathname, role)` | `profiles.role` / JWT role only |
| Panel layout `requireRole(role)` | Role match for `/manager`, `/teacher`, … |
| Nav items, route `*.view`, `Can`, services | **Effective** permission keys |

A private **allow** does **not** open another panel by itself (e.g. teacher + `users.view` still cannot enter `/manager/users` unless their **role** may access that path). Fine-grained UBAC applies **inside** a panel the role can already open.

UBAC does **not** change the “no permission-mirrored RLS” rule below.

## Session client vs admin client

| Client | Use for | Do not use for |
|--------|---------|----------------|
| **Session** (`createSupabaseServerComponentClient` / action client) | Auth, “who am I”, own credentials update | Manager domain table reads/writes |
| **Admin** (`createSupabaseAdminClient`) | Manager services + repositories after a permission check | Skipping `assertPermission` / `getUnauthorizedError` |

Identity always comes from the session user id. Data access for manager features uses the admin client **only after** the service has authorized that user id.

## Why not dynamic RLS for RBAC

Role permissions are edited in RBAC Manager (`rbac.manage`); user overlays are edited in Manager Users (manager role only). Policies that hard-code “students can never X” would fight later grants **or** per-user allows. Manager domain therefore stays **admin-client + mandatory service checks**. Coarse identity RLS elsewhere (if present) is unchanged and is not the manager permission engine.

## Mandatory check path (new manager feature)

1. Catalog: `[02]` + `lib/constants/permissions.ts`
2. Grant: `npm run seed:rbac` and/or RBAC Manager UI (role) and/or user overlay (UBAC)
3. Service: `assertPermission` / `getUnauthorizedError` (against **effective** keys)
4. UI: route `*.view` / `rbac.manage` map + `Can` for writes
5. Never authorize in repositories

## Permission cache

- `getUserPermissionsCached` is **request-scoped** React `cache` — the next HTTP request reloads grants from the DB (role + overlay → effective).
- After RBAC Manager saves, clear role-permission cache + session shells as today, then `revalidatePath(MANAGER_ROOT, "layout")`.
- After a **user overlay** save, clear **that user’s** session shell (targeted bust).
- No Redis/tag permission cache.

## Performance

- Manager layout loads the permission set **once** per request (`getSessionPack` → effective keys).
- `PermissionsProvider` / `Can` use in-memory `Set` lookups.
- Route gate (`requireManagerRoutePermission`) uses the same pack permissions.

## Hardening checklist (manual)

Wrong role / missing permission should fail on both UI and server. Prefer the full list in [`[06] regression-checklist.md`](./[06]%20regression-checklist.md) (sections C–D, **F** for UBAC).

Smoke engine: `npm run smoke:authz` (manager sample grants; unknown key denied).
