import { createLogger, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const API = process.env.VITE_API_PROXY ?? "http://localhost:4000";

const customLogger = createLogger();
const origError = customLogger.error;
customLogger.error = (msg, options) => {
  if (
    typeof msg === "string" &&
    msg.includes("ws proxy") &&
    (msg.includes("ECONNABORTED") || msg.includes("ECONNRESET") || msg.includes("EPIPE"))
  ) {
    return;
  }
  origError(msg, options);
};

export default defineConfig({
  customLogger,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom", "three"],
  },
  // Pre-bundle the 3D stack together with React so the dev server never loads two copies.
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "three", "@react-three/fiber", "@react-three/drei", "motion/react"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API, changeOrigin: true },
      "/socket.io": {
        target: API,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("three") || id.includes("@react-three")) return "three";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
        },
      },
    },
  },
});
