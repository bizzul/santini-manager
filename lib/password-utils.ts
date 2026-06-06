const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*";

/**
 * Generate a secure random password suitable for manual delivery.
 */
export function generateSecurePassword(length = 12): string {
    const all = UPPER + LOWER + DIGITS + SYMBOLS;
    const pick = (chars: string) =>
        chars[Math.floor(Math.random() * chars.length)];

    const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
    const rest = Array.from(
        { length: Math.max(length - required.length, 0) },
        () => pick(all),
    );

    const combined = [...required, ...rest];
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join("");
}
