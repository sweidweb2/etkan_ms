# Service-layer authorization

RBAC allow/deny for manager features happens in **services**, not repositories or (usually) actions.

See also: [enforcement story](./[05]%20enforcement.md) (session vs admin, no dynamic RLS, cache).

## Rules

1. **Services** call `assertPermission` (throw) or `getUnauthorizedError` (result path) from [`services/authorization.service.ts`](../../services/authorization.service.ts).
2. **Repositories** never authorize — only data access.
3. **Actions / pages** pass the session **user id** (`getSessionAuditActor().userId` or `getSessionUser()?.id`), not a role string.
4. Permission keys live in [`lib/constants/permissions.ts`](../../lib/constants/permissions.ts). Catalog + grants are seeded with `npm run seed:rbac`.

## Patterns

```ts
// List / get (throws)
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

1. Add keys to `docs/[11] RBAC/[02] permission-definitions.md` and `lib/constants/permissions.ts`.
2. Re-run `npm run seed:rbac` (or grant via RBAC Manager later).
3. Gate the service with the matching permission.
4. Gate UI with `Can` / route map when the user should see the control or page.
