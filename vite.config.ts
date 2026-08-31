import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  preview: {
    port: 3000,
  },
  test: {
    exclude: ["node_modules/**", "dist/**", "server-dist/**"],
  },
});
