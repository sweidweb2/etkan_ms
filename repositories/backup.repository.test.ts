import { describe, expect, it, vi } from "vitest";
import { BACKUP_EXPORT_PAGE_SIZE, exportTableRows } from "@/repositories/backup.repository";

function createPagedClient(pages: unknown[][]) {
  let pageIndex = 0;
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(async () => {
      const page = pages[pageIndex] ?? [];
      pageIndex += 1;
      return { data: page, error: null };
    }),
  };

  return {
    client: {
      from: vi.fn(() => chain),
    },
    chain,
  };
}

describe("exportTableRows", () => {
  it("reads every page until a short page", async () => {
    const fullPage = Array.from({ length: BACKUP_EXPORT_PAGE_SIZE }, (_, index) => ({
      id: `row-${index}`,
    }));
    const lastPage = [{ id: "last" }];
    const { client, chain } = createPagedClient([fullPage, lastPage]);

    const result = await exportTableRows(
      client as never,
      "profiles"
    );

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(BACKUP_EXPORT_PAGE_SIZE + 1);
    expect(result.data?.[BACKUP_EXPORT_PAGE_SIZE]).toEqual({ id: "last" });
    expect(chain.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(chain.range).toHaveBeenNthCalledWith(1, 0, BACKUP_EXPORT_PAGE_SIZE - 1);
    expect(chain.range).toHaveBeenNthCalledWith(
      2,
      BACKUP_EXPORT_PAGE_SIZE,
      BACKUP_EXPORT_PAGE_SIZE * 2 - 1
    );
  });

  it("orders composite keys before paging", async () => {
    const { client, chain } = createPagedClient([[{ category_id: "c", exercise_id: "e" }]]);

    const result = await exportTableRows(client as never, "category_exercises");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ category_id: "c", exercise_id: "e" }]);
    expect(chain.order).toHaveBeenNthCalledWith(1, "category_id", { ascending: true });
    expect(chain.order).toHaveBeenNthCalledWith(2, "exercise_id", { ascending: true });
  });

  it("stops when a page repeats instead of looping", async () => {
    const page = Array.from({ length: BACKUP_EXPORT_PAGE_SIZE }, (_, index) => ({
      id: `same-${index}`,
    }));
    const { client } = createPagedClient([page, page]);

    const result = await exportTableRows(client as never, "audit_logs");

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Unable to page audit_logs.");
  });
});
