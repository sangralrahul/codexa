import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, { ...opts, maxmem: 128 * opts.N * opts.r * 2 }, (err, key) => (err ? reject(err) : resolve(key))),
  );

function keyFromEnv(name: string): Buffer {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is not set`);
  // Accept base64 or arbitrary strings; derive a stable 32-byte key.
  return createHash("sha256").update(raw).digest();
}

/** Random URL-safe token. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** One-way hash used for storing session/auth tokens. */
export function hashToken(token: string): string {
  return createHmac("sha256", keyFromEnv("SESSION_SECRET")).update(token).digest("hex");
}

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Password hashing with scrypt (N=2^15, r=8, p=1), format: scrypt$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, 64, { N: 1 << 15, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, { N: 1 << 15, r: 8, p: 1 });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** AES-256-GCM encryption for secrets at rest. Output: v1.iv.tag.ciphertext (base64url). */
export function encryptSecret(plaintext: string): string {
  const key = keyFromEnv("ENCRYPTION_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const [v, ivB64, tagB64, dataB64] = payload.split(".");
  if (v !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const key = keyFromEnv("ENCRYPTION_KEY");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]);
  return dec.toString("utf8");
}

/** HMAC signature for signed URLs / preview tokens. */
export function sign(value: string, secretName = "SESSION_SECRET"): string {
  return createHmac("sha256", keyFromEnv(secretName)).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string, secretName = "SESSION_SECRET"): boolean {
  const expected = sign(value, secretName);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
