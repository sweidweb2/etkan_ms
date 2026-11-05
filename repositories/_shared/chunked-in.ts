const DEFAULT_CHUNK_SIZE = 150;

type ChunkResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

/**
 * Runs an `.in()` query per id chunk in parallel and concatenates rows.
 * PostgREST sends filters in the URL, so unbounded id lists can exceed
 * request-line limits.
 */
export async function chunkedIn<Row>(
  ids: readonly string[],
  runChunk: (chunk: string[]) => PromiseLike<ChunkResult<Row>>,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<ChunkResult<Row>> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length <= chunkSize) {
    const result = await runChunk(uniqueIds);
    return { data: result.data ?? [], error: result.error };
  }

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    chunks.push(uniqueIds.slice(index, index + chunkSize));
  }

  const results = await Promise.all(chunks.map((chunk) => runChunk(chunk)));
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: failed.error };
  }

  return {
    data: results.flatMap((result) => result.data ?? []),
    error: null,
  };
}
