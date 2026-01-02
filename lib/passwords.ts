import crypto from "crypto";

const SCRYPT_PREFIX = "scrypt";
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEY_BYTES = 32;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
    const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_BYTES, SCRYPT_OPTIONS);
    return `${SCRYPT_PREFIX}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash) return false;

    if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
        const parts = storedHash.split("$");
        if (parts.length !== 3) return false;
        const salt = Buffer.from(parts[1], "base64");
        const expected = Buffer.from(parts[2], "base64");
        const actual = crypto.scryptSync(password, salt, expected.length, SCRYPT_OPTIONS);
        return timingSafeEqual(actual, expected);
    }

    // Legacy SHA-256 hex hashes
    const legacy = crypto.createHash("sha256").update(password).digest("hex");
    return timingSafeEqual(Buffer.from(legacy, "utf8"), Buffer.from(storedHash, "utf8"));
}
