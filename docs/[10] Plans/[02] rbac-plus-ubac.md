# [02] RBAC + UBAC — status

**Status: superseded / removed (2026-09)**

## Runtime truth

Effective access is **role grants only**:

```text
permissions(user) = role_permissions[profiles.role]
```

There is **no** per-user allow/deny overlay at runtime.

| Layer | Behavior |
|-------|----------|
| DB | `role_permissions` is the source of truth. `user_permissions` was dropped in `supabase/migrations/20260921120000_drop_user_permissions.sql`. |
| Service | `getUserPermissions` / `getEffectivePermissionsForUserCached` / `getPermissionsForRoleCached` all resolve **role keys only** (`services/auth/authorization.service.ts`). |
| UI | Manager RBAC page edits role grants. |
| Naming | `getEffectivePermissionsForUserCached` keeps its historical name; “effective” here means “what the session may use,” not “role ∪ UBAC.” |

## Why UBAC was removed

Earlier migrations introduced `user_permissions` (allow/deny, then allow-only). That path was abandoned to keep authorization predictable: one matrix per role, no per-user merge or cache-bust edge cases.

## Do not

- Reintroduce `user_permissions` without a new approved plan.
- Treat older “role ∪ allow” drafts as current design.
- Skip service-layer `assertPermission` because RLS or middleware exists.

## Related

- Permission keys: `docs/[06] RBAC/[02] permission-definitions.md` (and `lib/constants/permissions.ts`)
- Enforcement: service asserts + manager route permissions + panel gates
