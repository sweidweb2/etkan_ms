Exactly. Now we can move from **“what is slow?”** to **“what should the architecture normally look like, and what should we change?”**

## 1. How a normal production app should behave

For a manager/admin route like:

```text
/manager/guests/:id
```

the request should roughly be:

```text
Browser
   ↓
Next.js middleware
   ↓
Read session/token
   ↓
Verify token locally
   ↓
Check basic authorization
   ↓
Render RSC
   ↓
Application queries
```

The important principle is:

> **Authentication should be cheap and local on every request whenever possible.**

You don't want:

```text
every request
   ↓
Supabase Auth server
   ↓
wait 300ms
   ↓
continue
```

You want:

```text
every request
   ↓
cookie/token
   ↓
local verification
   ↓
~few ms
```

An occasional network call for **refresh/JWKS acquisition** is normal.

---

# 2. Your current architecture

Your current flow appears closer to:

```text
Request
   ↓
middleware
   ↓
supabase.auth.getClaims()
   ↓
getSession()
   ↓
possibly refresh
   ↓
JWKS lookup
   ↓
possibly fetch JWKS
   ↓
verify
   ↓
RSC
   ↓
getSessionPack()
   ↓
claims
   ↓
profile
   ↓
permissions
   ↓
layouts
```

And then multiple RSC trees can do the same thing concurrently.

That's where your spikes come from.

---

# 3. The biggest architectural problem

It's **not** that JWKS exists.

JWKS fetching is normal.

It's **not** that token refresh exists.

Token refresh is normal.

It's the combination of:

```text
cold process / HMR
       +
multiple simultaneous requests
       +
multiple getClaims()
       +
multiple session_pack MISS
```

So you can get:

```text
Request A → getClaims() → JWKS fetch ────────┐
Request B → getClaims() → waiting ──────────┤
Request C → getClaims() → waiting ──────────┤
Request D → getClaims() → waiting ──────────┘

                         ↓

                 400–650ms
```

And independently:

```text
RSC A → session_pack MISS
RSC B → session_pack MISS
RSC C → session_pack MISS
```

instead of:

```text
RSC A ─┐
RSC B ─┼──→ ONE session-pack computation
RSC C ─┘
```

That's the part I'd fix.

---

# 4. What should happen instead

You want **request-level deduplication / singleflight**.

Conceptually:

```text
                    ┌── Request A
                    │
                    ├── Request B
getSessionPack() ───┼── Request C
                    │
                    └── Request D
                         ↓
                  ONE computation
                         ↓
                   cached result
                         ↓
              A ← B ← C ← D
```

Instead of four simultaneous expensive operations.

Same idea for the auth/JWKS-dependent operation if your environment allows you to control that layer.

---

# 5. Session pack should be designed like this

You already have:

```text
session_pack HIT
```

which is good.

The ideal flow is:

```text
Request
   ↓
session pack cache
   ↓
HIT ───────────────→ return immediately
   │
 MISS
   ↓
Is another request already building it?
   │
   ├── YES → await existing promise
   │
   └── NO
        ↓
   build session pack
        ↓
   cache it
        ↓
   return
```

So instead of:

```text
MISS
MISS
MISS
MISS
```

causing four independent DB/auth operations, you get:

```text
MISS
WAIT
WAIT
WAIT
   ↓
ONE BUILD
```

This is commonly called **singleflight**, **request coalescing**, or **in-flight deduplication**.

---

# 6. Your profile + permissions are already doing one good thing

You discovered:

```text
profile=932ms
permissions=932ms
```

doesn't mean:

```text
932 + 932 = 1864ms
```

because you're doing:

```js
await Promise.all([
    getProfile(),
    getPermissions()
])
```

That's correct.

Normally:

```text
profile ──────── 10ms
permissions ──── 10ms
                 ↓
Promise.all ───── 10ms
```

rather than:

```text
profile ──────── 10ms
permissions ───────────── 10ms
                       ↓
                     20ms
```

So **don't “fix” that part unnecessarily**.

The problem is when the underlying operation becomes ~932ms.

---

# 7. Production vs development is important here

This part matters a lot.

You are running:

```text
npm run dev
```

So:

```text
✓ Compiled
```

and HMR are constantly changing the environment.

Development can therefore produce:

```text
compile
 ↓
module/isolate state reset
 ↓
JWKS cache gone
 ↓
first auth operation
 ↓
network fetch
 ↓
slow
```

That doesn't necessarily mean production will behave the same way.

In a production build:

```text
npm run build
npm start
```

you don't have the same constant HMR cycle.

So **before making major architectural changes**, you should benchmark the production build.

---

# 8. What I would expect in a healthy production deployment

Something like:

```text
First request after process starts:
    auth/JWKS/network → maybe tens/hundreds ms

Subsequent requests:
    local verification → few ms

Session pack:
    HIT → very cheap

Database/application:
    depends on actual query → ideally tens of ms
```

You might still occasionally see:

```text
refresh token → network
JWKS fetch → network
cold DB connection → network
```

That's normal.

The goal isn't:

> **Never have a 300ms request.**

The goal is:

> **Don't make every request pay that cost, and don't let 10 simultaneous requests independently pay it.**

---

# 9. So what should we actually fix?

I'd divide it into **three fixes**.

### Fix #1 — Don't optimize what isn't broken

Keep:

```text
role resolution → 0ms
local JWT verification → cheap
Promise.all(profile, permissions)
session_pack HIT
```

These aren't your main problems.

### Fix #2 — Add singleflight to session pack

This is probably your biggest application-level improvement.

```text
                 session_pack
                     │
            ┌────────┴────────┐
            │                 │
        existing?          no existing
            │                 │
          await             create
            │                 │
            └────────┬────────┘
                     ↓
                   cache
```

### Fix #3 — Instrument `getClaims()`

Before changing Supabase auth behavior, measure:

```text
getSession
   ├── storage read
   ├── refresh?
   └── refresh duration

JWKS
   ├── cache hit/miss
   └── fetch duration

verification
   └── verify duration

getUser fallback
   └── HTTP duration
```

Then you'll have an actual answer instead of guessing.

---

# 10. And one more thing I'd clean up

Your guest row currently appears to have:

```text
<Link>
    ...
</Link>
```

plus:

```text
router.push(...)
```

for the same navigation.

You should generally choose **one navigation mechanism**.

If the row is already a `<Link>`, let the Link handle navigation.

And if you don't want it prefetched, use:

```tsx
<Link prefetch={false}>
```

That reduces unnecessary flights.

But this is **secondary**.

---

## The target architecture

Ultimately you want:

```text
                    REQUEST
                       │
                       ▼
                Next middleware
                       │
                       ▼
              getClaims / verify
                       │
                ┌──────┴──────┐
                │             │
             warm          cold
                │             │
              ~ms       refresh/JWKS
                              │
                              ▼
                         cache/fill
                              │
                ┌─────────────┘
                ▼
             RSC tree
                │
                ▼
        getSessionPack()
                │
          ┌─────┴─────┐
          │           │
         HIT          MISS
          │           │
        fast      singleflight
                      │
                 profile +
                 permissions
                      │
                      ▼
                   cache
                      │
                      ▼
                  page data
```

That's a **normal, solid production architecture**.

And importantly: **you don't need to redesign your authentication system because you saw 1.8s during HMR.** First prove the production behavior, then fix the genuine cold/concurrency issues that remain.
