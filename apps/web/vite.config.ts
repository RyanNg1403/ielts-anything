import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const server = process.env.SERVER_URL ?? "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": server,
      "/ws": { target: server.replace("http", "ws"), ws: true },
    },
  },
});
