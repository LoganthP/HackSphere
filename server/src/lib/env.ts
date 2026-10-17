import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  isProd: process.env.NODE_ENV === "production",
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none",
};
