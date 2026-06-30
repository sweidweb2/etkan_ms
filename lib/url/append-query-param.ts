export function appendQueryParam(
  url: string,
  key: string,
  value: string
): string {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const [pathname, search = ""] = withoutHash.split("?");
  const params = new URLSearchParams(search);
  params.set(key, value);
  const queryString = params.toString();

  return `${pathname}${queryString ? `?${queryString}` : ""}${hash}`;
}
