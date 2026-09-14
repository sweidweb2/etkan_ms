# Service-layer authorization

RBAC / UBAC allow/deny for manager features happens in **services**, not repositories or (usually) actions.

See also: [enforcement story](./[05]%20enforcement.md) (effective set, session vs admin, no dynamic RLS, cache).

## Rules

1. **Services** call `assertPermission` (throw) or `getUnauthorizedError` (result path) from [`services/auth/authorization.service.ts`](../../services/auth/authorization.service.ts).
2. Those helpers resolve the user’s **effective** permissions: `(role ∪ user_allows) − user_denies`. Call sites do **not** load role grants or overlays themselves.
3. **Repositories** never authorize — only data access.
4. **Actions / pages** pass the session **user id** (`getSessionAuditActor().userId` or `getSessionUser()?.id`), not a role string.
5. Permission keys live in [`lib/constants/permissions.ts`](../../lib/constants/permissions.ts). Catalog + role grants are seeded with `npm run seed:rbac`; private overlays are managed in Manager Users (plan: [`[10] Plans/[02]`](../[10]%20Plans/[02]%20rbac-plus-ubac.md)).

## Patterns

```ts
// List / get (throws) — checks effective set
await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);

// Mutation result
const unauthorized = await getUnauthorizedError(
  adminClient,
  actorUserId,
  PERMISSIONS.SUBJECTS_CREATE
);
if (unauthorized) {
  return { success: false, error: unauthorized };
}
```

Unauthorized message is always `"Unauthorized."` so existing toasts keep working.

## New feature

1. Add keys to [`[02] permission-definitions.md`](./[02]%20permission-definitions.md) and `lib/constants/permissions.ts`.
2. Re-run `npm run seed:rbac` (or grant via RBAC Manager / user overlay later).
3. Gate the service with the matching permission (same helpers; no new assert API).
4. Gate UI with `Can` / route map when the user should see the control or page.
