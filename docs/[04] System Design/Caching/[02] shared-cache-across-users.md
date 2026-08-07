# Caching FAQ — shared cache across users and roles

Related overview: `[01] caching.md`.

## Does the cache break for another user (same or different role)?

The users, students, and relationships lists use a **shared server cache** (one entry for all managers), not a per-user cache.

### Same role (another manager)

Yes. When Manager A creates/edits a student, user, or relationship through the app's server actions, `revalidateTag` marks the shared cache stale, so Manager B gets fresh (or stale-while-revalidate) data on their next load.

- Caveat: if Manager B already has the page open, their browser `useState` list does not auto-update until they navigate away/back or refresh. The server cache is shared; an open tab's client state is not.

### Different role (teacher / student / CEO / admin panel)

Not applicable. Those panels do not call `listUsersForManager` / `listStudentsForManager` / `listRelationshipsForManager`, and auth blocks non-managers from those list functions. There is nothing for them to break because they are not reading this cache.

## What does NOT break the cache

- Edits made directly in Supabase SQL / Dashboard.
- Mutations that do not call the `revalidateManager*` helpers.
- Other features that change related data without going through the users/students/relationships actions.

When invalidation is missed:

- **Users / students:** self-heal within the 1-hour TTL safety net.
- **Relationships:** stay stale until a create/update (or future delete) runs through the app (no TTL).
