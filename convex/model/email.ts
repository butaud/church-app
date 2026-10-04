const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Gmail ignores dots in the local part, so people often type their address
// with more or fewer dots than their account has. Other providers (including
// Google Workspace custom domains) treat dots as significant, and "+" aliases
// are left alone everywhere since people use those deliberately.
export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at === -1) return lower;
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return lower;
  // googlemail.com is the same mailbox as gmail.com.
  return `${local.replaceAll(".", "")}@gmail.com`;
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}
