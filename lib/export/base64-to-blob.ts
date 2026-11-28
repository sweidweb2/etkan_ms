/**
 * Decode a base64 payload to a Blob without a long sync charCodeAt loop.
 * Uses the browser's data-URL fetch path (async).
 */
export async function base64ToBlob(
  base64: string,
  mimeType: string
): Promise<Blob> {
  const response = await fetch(
    `data:${mimeType};base64,${base64}`
  );
  if (!response.ok) {
    throw new Error("Unable to decode download payload.");
  }
  return response.blob();
}
