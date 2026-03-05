export async function captureCard(
  element: HTMLElement,
): Promise<Blob | null> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#faf9f6",
    width: 1080 / 2,
    height: 1080 / 2,
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function downloadCard(
  element: HTMLElement,
  filename: string = "manifest-insight.png",
) {
  const blob = await captureCard(element);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyCardToClipboard(
  element: HTMLElement,
): Promise<boolean> {
  const blob = await captureCard(element);
  if (!blob) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
