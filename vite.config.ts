import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:29980",
      "/mcp": "http://127.0.0.1:29980",
      "/assets": "http://127.0.0.1:29980",
    },
  },
});
