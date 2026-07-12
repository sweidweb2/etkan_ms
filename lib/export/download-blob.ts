type DownloadBlobOptions = {
  blob: Blob;
  filename: string;
};

export function downloadBlob({ blob, filename }: DownloadBlobOptions): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
