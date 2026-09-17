/** Public demo origins are explicit; never evaluate stored HTML or URLs. */
export function validDemoUrl(url: string | null, origins: string[]) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && origins.includes(parsed.origin);
  } catch {
    return false;
  }
}
