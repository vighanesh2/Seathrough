/** Username helpers — Supabase Auth still needs an email under the hood. */

const EMAIL_DOMAIN = "users.seathrough.local";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${EMAIL_DOMAIN}`;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (password.length > 72) {
    return "Password is too long";
  }
  return null;
}
