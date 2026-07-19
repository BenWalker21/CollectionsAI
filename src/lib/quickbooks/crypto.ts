import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Integration.accessToken/refreshToken are encrypted before every write and
// decrypted after every read — see prisma/schema.prisma's comment on those
// columns and the scaffold README's note that plaintext tokens aren't
// acceptable once real customer data sits behind them.

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return buf;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptToken(ciphertext: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
