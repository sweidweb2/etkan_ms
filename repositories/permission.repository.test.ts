import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import {
  listPermissionKeysByRole,
  listPermissions,
  replaceRolePermissions,
  upsertPermissions,
} from "@/repositories/permission.repository";

type QueryResult = {
  data: unknown;
  error: null | { message: string };
};

function createChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.select = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.upsert = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.in = vi.fn(self);
  chain.order = vi.fn(self);
  chain.then = (resolve: (value: QueryResult) => unknown) =>
    Promise.resolve(result).then(resolve);

  return chain;
}

describe("permission.repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists permissions ordered by feature and key", async () => {
    const rows = [
      {
        key: PERMISSIONS.SUBJECTS_VIEW,
        label: "View subjects",
        feature_group: "subjects",
        access: "read",
        created_at: "2026-07-29T00:00:00.000Z",
      },
    ];
    const chain = createChain({ data: rows, error: null });
    const from = vi.fn().mockReturnValue(chain);
    const client = { from } as never;

    const result = await listPermissions(client);

    expect(from).toHaveBeenCalledWith("permissions");
    expect(chain.select).toHaveBeenCalledWith(
      "key, label, feature_group, access, created_at"
    );
    expect(chain.order).toHaveBeenCalledWith("feature_group", {
      ascending: true,
    });
    expect(chain.order).toHaveBeenCalledWith("key", { ascending: true });
    expect(result.data).toEqual(rows);
  });

  it("lists permission keys by role", async () => {
    const rows = [{ permission_key: PERMISSIONS.SUBJECTS_VIEW }];
    const chain = createChain({ data: rows, error: null });
    const from = vi.fn().mockReturnValue(chain);
    const client = { from } as never;

    const result = await listPermissionKeysByRole(client, ROLES.MANAGER);

    expect(from).toHaveBeenCalledWith("role_permissions");
    expect(chain.eq).toHaveBeenCalledWith("role", ROLES.MANAGER);
    expect(result.data).toEqual(rows);
  });

  it("upserts permission catalog rows", async () => {
    const chain = createChain({ data: null, error: null });
    const from = vi.fn().mockReturnValue(chain);
    const client = { from } as never;

    await upsertPermissions(client, [
      {
        key: PERMISSIONS.SUBJECTS_VIEW,
        label: "View subjects",
        feature_group: "subjects",
        access: "read",
      },
    ]);

    expect(from).toHaveBeenCalledWith("permissions");
    expect(chain.upsert).toHaveBeenCalledWith(
      [
        {
          key: PERMISSIONS.SUBJECTS_VIEW,
          label: "View subjects",
          feature_group: "subjects",
          access: "read",
        },
      ],
      { onConflict: "key" }
    );
  });

  it("replaces role permissions after validating catalog keys", async () => {
    const permissionsChain = createChain({
      data: [{ key: PERMISSIONS.SUBJECTS_VIEW }],
      error: null,
    });
    const deleteChain = createChain({ data: null, error: null });
    const insertChain = createChain({
      data: [
        {
          role: ROLES.MANAGER,
          permission_key: PERMISSIONS.SUBJECTS_VIEW,
        },
      ],
      error: null,
    });

    const from = vi
      .fn()
      .mockReturnValueOnce(permissionsChain)
      .mockReturnValueOnce(deleteChain)
      .mockReturnValueOnce(insertChain);
    const client = { from } as never;

    const result = await replaceRolePermissions(client, ROLES.MANAGER, [
      PERMISSIONS.SUBJECTS_VIEW,
    ]);

    expect(permissionsChain.in).toHaveBeenCalledWith("key", [
      PERMISSIONS.SUBJECTS_VIEW,
    ]);
    expect(deleteChain.eq).toHaveBeenCalledWith("role", ROLES.MANAGER);
    expect(insertChain.insert).toHaveBeenCalledWith([
      {
        role: ROLES.MANAGER,
        permission_key: PERMISSIONS.SUBJECTS_VIEW,
      },
    ]);
    expect(result.data).toEqual([
      {
        role: ROLES.MANAGER,
        permission_key: PERMISSIONS.SUBJECTS_VIEW,
      },
    ]);
  });

  it("throws when replaceRolePermissions gets unknown keys", async () => {
    const permissionsChain = createChain({
      data: [],
      error: null,
    });
    const from = vi.fn().mockReturnValue(permissionsChain);
    const client = { from } as never;

    await expect(
      replaceRolePermissions(client, ROLES.MANAGER, [
        PERMISSIONS.SUBJECTS_VIEW,
      ])
    ).rejects.toThrow("Unknown permission keys: subjects.view");
  });

  it("clears role permissions when given an empty key list", async () => {
    const deleteChain = createChain({ data: null, error: null });
    const from = vi.fn().mockReturnValue(deleteChain);
    const client = { from } as never;

    const result = await replaceRolePermissions(client, ROLES.TEACHER, []);

    expect(from).toHaveBeenCalledWith("role_permissions");
    expect(deleteChain.eq).toHaveBeenCalledWith("role", ROLES.TEACHER);
    expect(result).toEqual({ data: [], error: null });
  });
});
