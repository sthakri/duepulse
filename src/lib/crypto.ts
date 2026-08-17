import { env } from "@/lib/env";

const ALGO = "AES-GCM";
const IV_LENGTH = 12;

async function getKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(env.ENCRYPTION_KEY.slice(0, 32));
  return crypto.subtle.importKey("raw", raw, { name: ALGO }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoded,
  );
  const buf = new Uint8Array(iv.length + cipher.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(cipher), iv.length);
  return Buffer.from(buf).toString("base64");
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const data = buf.subarray(IV_LENGTH);
  const plain = await crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    data,
  );
  return new TextDecoder().decode(plain);
}

export function isLikelyEncrypted(token: string): boolean {
  if (/^\d+~/.test(token)) return false;
  if (token.length < 36) return false;
  try {
    const decoded = Buffer.from(token, "base64");
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}

export async function decryptOrRaw(token: string): Promise<string> {
  if (!isLikelyEncrypted(token)) return token;
  try {
    return await decrypt(token);
  } catch {
    return token;
  }
}
