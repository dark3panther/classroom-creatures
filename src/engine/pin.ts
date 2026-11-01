/** Local-only PIN protection. The PIN is never stored, only a salted hash. */
const SALT = 'classroom-creatures:v1:';

export async function hashPin(pin: string): Promise<string> {
  const text = SALT + pin;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 'sha256:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // insecure-context fallback (e.g. opened over plain http on a LAN)
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return 'fnv:' + (h >>> 0).toString(16);
}

export async function checkPin(pin: string, hash: string | null): Promise<boolean> {
  if (!hash) return true;
  return (await hashPin(pin)) === hash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
