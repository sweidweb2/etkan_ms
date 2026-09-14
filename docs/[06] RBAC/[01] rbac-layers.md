# RBAC — Six Layers

Simple business view of how access control works in Etkan MS.  
Each layer has one job. Together they decide **who can do what**.

---

## 1. Data Layer Storage

**Job:** Keep the rules and assignments in the database.

What we store:

- **Users** — people in the system  
- **Roles** — named job types (e.g. Admin, Manager, Teacher)  
- **Permissions** — named actions (e.g. view grades, edit students)  
- **Role ↔ Permission** — which actions each role may perform  
- **User ↔ Role** — which role each person has (one role per user today)  

This is the source of truth. Everything else reads from here.

---

## 2. Authorization Engine

**Job:** Answer one question: *Can this person do this action?*

Flow:

1. Who is the current user?  
2. What **role** do they have?  
3. What permissions does that role include?  
4. Allow or deny from that set  

```text
effective = role_permissions[profiles.role]
```

One clear answer. No guessing in other parts of the app.

**Note:** Panel URL access (`/manager`, `/teacher`, …) still follows **role**. Fine-grained permissions apply inside a panel the role can already open.

---

## 3. Backend Protection

**Job:** Block forbidden actions even if someone tries to bypass the UI.

Every sensitive operation (create, update, delete, view restricted data) must check permission before it runs.

If the engine says no → the action stops.  
The UI is not enough by itself.

---

## 4. Frontend Authorization

**Job:** Show only what the user is allowed to use.

Nav, buttons, and pages hide or disable controls the user cannot use.  
This improves UX; the backend still enforces the real rules.

---

## 5. Administration Interface (RBAC Manager)

**Job:** Let authorized admins manage access without code changes.

Admins can:

- Assign permissions to roles (Manager RBAC UI)  
- Assign roles to users  
- Review who has access to what via role grants  

Changes take effect through the engine and storage layers above.

---

## 6. Permission Definitions

**Job:** Define the official list of actions the system understands.

Each permission is a clear, named capability, such as:

- View students  
- Edit class grades  
- Manage careers  
- Access admin panel  

Permissions are defined once, reused by roles, and never invented ad hoc in screens or services.

---

## How the layers work together

```text
Permission Definitions  →  what actions exist
         ↓
Data Layer Storage      →  role grants
         ↓
Authorization Engine    →  role keys → allow or deny
         ↓
Backend Protection      →  enforce on every real action
Frontend Authorization  →  show / hide the right UI
RBAC Manager            →  admins maintain role permissions
```

---

## Related

- `[02] permission-definitions.md` — catalog of keys  
- `[05] enforcement.md` — how checks run at runtime  
- `[08] role-seeded-permissions.md` — default role matrix  
