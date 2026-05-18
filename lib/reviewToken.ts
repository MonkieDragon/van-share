import { createHmac, timingSafeEqual } from "crypto";

const ALG = "sha256";

export type ReviewTokenPayload = {
  participantId: string;
  journeyId: string;
  operatorId: string;
  exp: number;
};

function requireSecret(): string {
  const s = process.env.REVIEW_TOKEN_SECRET?.trim();
  if (!s) throw new Error("REVIEW_TOKEN_SECRET is required for review links");
  return s;
}

export function signReviewToken(payload: ReviewTokenPayload): string {
  const secret = requireSecret();
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac(ALG, secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyReviewToken(token: string): ReviewTokenPayload | null {
  const secret = process.env.REVIEW_TOKEN_SECRET?.trim();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = createHmac(ALG, secret).update(body).digest("base64url");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as ReviewTokenPayload;
    if (
      typeof parsed.participantId !== "string" ||
      typeof parsed.journeyId !== "string" ||
      typeof parsed.operatorId !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
