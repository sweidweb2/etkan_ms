const DEFAULT_PAGE_SIZE = 1000;

type PageResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

/**
 * Walks PostgREST `.range` pages until a short page, concatenating rows.
 * Use for date-range / unbounded list reads that must not silently truncate
 * at `max_rows` (~1000).
 */
export async function collectAllPages<Row>(
  fetchPage: (offset: number, limit: number) => PromiseLike<PageResult<Row>>,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PageResult<Row>> {
  const rows: Row[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(offset, pageSize);
    if (error) {
      return { data: null, error };
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return { data: rows, error: null };
}
