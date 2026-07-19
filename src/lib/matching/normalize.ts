const COMMON_SUFFIXES = /\b(inc|llc|ltd|co|corp|company|incorporated|limited)\b\.?/gi;

export function normalizeCustomerName(name: string): string {
  return name
    .toLowerCase()
    .replace(COMMON_SUFFIXES, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
