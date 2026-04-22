export function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length === 0) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let i = 0;

  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    let slice = clean.slice(i, end);

    if (end < clean.length) {
      const candidates = [
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf("\n"),
        slice.lastIndexOf(". "),
      ];
      const boundary = Math.max(...candidates);
      if (boundary > size * 0.5) {
        slice = slice.slice(0, boundary);
      }
    }

    const trimmed = slice.trim();
    if (trimmed.length > 0) chunks.push(trimmed);

    const advance = Math.max(slice.length - overlap, 1);
    i += advance;
  }

  return chunks;
}
