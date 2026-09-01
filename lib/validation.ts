export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}