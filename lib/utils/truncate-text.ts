export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return { display: text, isTruncated: false };
  }

  return {
    display: `${text.slice(0, maxLength)}…`,
    isTruncated: true,
  };
}
