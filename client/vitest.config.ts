import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import zlib from "node:zlib";

if (!("createZstdDecompress" in zlib)) {
  (zlib as unknown as { createZstdDecompress: () => void }).createZstdDecompress = () => {};
}

const pre = path.resolve(import.meta.dirname, "vitest-pre.cjs").replace(/\\/g, "/");
if (!process.env.NODE_OPTIONS?.includes("vitest-pre.cjs")) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --require "${pre}"`.trim();
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
