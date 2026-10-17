import crypto from "node:crypto";
import argon2 from "argon2";

export const hashPassword = (pw: string) =>
  argon2.hash(pw, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hash: string, pw: string) => argon2.verify(hash, pw).catch(() => false);

export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
