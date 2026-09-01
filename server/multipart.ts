export function restoreMultipartFilename(name: string): string {
  const bytes = Buffer.from(name, "latin1");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return name;
  }
}
